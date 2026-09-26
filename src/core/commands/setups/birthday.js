const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS birthdays (
        user_id TEXT,
        guild_id TEXT,
        bday TEXT,
        message TEXT,
        PRIMARY KEY (user_id, guild_id)
    );
    CREATE TABLE IF NOT EXISTS birthday_settings (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        custom_message TEXT DEFAULT 'Happy Birthday!',
        channel_id TEXT
    );
`);

try { db.exec(`ALTER TABLE birthday_settings ADD COLUMN channel_id TEXT;`); } catch {}

module.exports = {
    name: 'birthday',
    description: 'Manage birthdays',
    async execute(msg, args) {
        const isAdmin = msg.member.permissions.has(PermissionFlagsBits.Administrator) || msg.member.permissions.has(PermissionFlagsBits.ManageGuild);

        if (!isAdmin) {
            const conf = db.prepare(`SELECT enabled FROM birthday_settings WHERE guild_id = ?`).get(msg.guild.id);
            if (conf && !conf.enabled) return msg.reply('Birthday system is disabled.');

            const existing = db.prepare(`SELECT bday FROM birthdays WHERE user_id = ? AND guild_id = ?`).get(msg.author.id, msg.guild.id);
            if (existing) return msg.reply('Birthday already registered. Contact staff to change.');

            const rowUI = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bday_reg').setLabel('Set Birthdate').setStyle(ButtonStyle.Primary)
            );

            const sent = await msg.reply({ content: 'Click to set your birthdate (MM/DD).', components: [rowUI] });
            const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === msg.author.id, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId !== 'bday_reg') return;
                const modal = new ModalBuilder().setCustomId('bday_m').setTitle('Set Birthdate');
                const input = new TextInputBuilder().setCustomId('bday_in').setLabel('Date (MM/DD)').setStyle(TextInputStyle.Short).setPlaceholder('12/31').setMinLength(5).setMaxLength(5).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await i.showModal(modal);

                try {
                    const mRes = await i.awaitModalSubmit({ filter: mi => mi.user.id === msg.author.id, time: 30000 });
                    const dateStr = mRes.fields.getTextInputValue('bday_in');
                    if (!/^\d{2}\/\d{2}$/.test(dateStr)) return mRes.reply({ content: 'Invalid format. Use MM/DD.', flags: MessageFlags.Ephemeral });

                    const sRow = db.prepare(`SELECT custom_message FROM birthday_settings WHERE guild_id = ?`).get(msg.guild.id);
                    const cMsg = sRow?.custom_message || 'Happy Birthday!';

                    db.prepare(`INSERT INTO birthdays (user_id, guild_id, bday, message) VALUES (?, ?, ?, ?)`).run(msg.author.id, msg.guild.id, dateStr, cMsg);
                    mRes.reply({ content: `Birthday registered as ${dateStr}.`, flags: MessageFlags.Ephemeral });
                } catch (err) {}
            });
            return;
        }

        const targetUser = msg.mentions.users.first();
        if (targetUser && args[1] && /^\d{2}\/\d{2}$/.test(args[1])) {
            const sRow = db.prepare(`SELECT custom_message FROM birthday_settings WHERE guild_id = ?`).get(msg.guild.id);
            const cMsg = sRow?.custom_message || 'Happy Birthday!';
            db.prepare(`INSERT INTO birthdays (user_id, guild_id, bday, message) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, guild_id) DO UPDATE SET bday = excluded.bday`).run(targetUser.id, msg.guild.id, args[1], cMsg);
            return msg.reply(`Updated birthday for <@${targetUser.id}> to${args[1]}.`);
        }

        const row = db.prepare(`SELECT enabled FROM birthday_settings WHERE guild_id = ?`).get(msg.guild.id);
        const isEnabled = row ? row.enabled : 1;

        const rowUI = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bday_toggle').setLabel(isEnabled ? 'Disable & Erase Data' : 'Enable').setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder().setCustomId('bday_msg').setLabel('Set Message').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bday_ch').setLabel('Set Channel').setStyle(ButtonStyle.Secondary)
        );

        const sent = await msg.reply({ content: `Status: ${isEnabled ? 'Enabled' : 'Disabled'}\nOverride syntax: \`!birthday @user MM/DD\``, components: [rowUI] });
        const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === msg.author.id, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'bday_toggle') {
                const r = db.prepare(`SELECT enabled FROM birthday_settings WHERE guild_id = ?`).get(msg.guild.id);
                const nextState = (r ? r.enabled : 1) ? 0 : 1;
                db.prepare(`INSERT INTO birthday_settings (guild_id, enabled) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET enabled = ?`).run(msg.guild.id, nextState, nextState);
                if (!nextState) db.prepare(`DELETE FROM birthdays WHERE guild_id = ?`).run(msg.guild.id);
                i.update({ content: `Status: ${nextState ? 'Enabled' : 'Disabled and data erased.'}`, components: [] });
            } else if (i.customId === 'bday_msg' || i.customId === 'bday_ch') {
                const isMsg = i.customId === 'bday_msg';
                const modal = new ModalBuilder().setCustomId(isMsg ? 'm_modal' : 'c_modal').setTitle(isMsg ? 'Custom Message' : 'Announcement Channel');
                const input = new TextInputBuilder().setCustomId(isMsg ? 'm_in' : 'c_in').setLabel(isMsg ? 'Message' : 'Channel ID').setStyle(TextInputStyle.Short).setPlaceholder(isMsg ? 'Happy Birthday!' : msg.channel.id).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await i.showModal(modal);

                try {
                    const mRes = await i.awaitModalSubmit({ filter: mi => mi.user.id === msg.author.id, time: 30000 });
                    const val = mRes.fields.getTextInputValue(isMsg ? 'm_in' : 'c_in').trim();

                    if (!isMsg) {
                        const targetCh = msg.guild.channels.cache.get(val);
                        if (!targetCh) return mRes.reply({ content: 'Channel not found.', flags: MessageFlags.Ephemeral });
                        db.prepare(`INSERT INTO birthday_settings (guild_id, channel_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET channel_id = ?`).run(msg.guild.id, val, val);
                        return mRes.reply({ content: `Channel set to <#${val}>.`, flags: MessageFlags.Ephemeral });
                    }

                    db.prepare(`INSERT INTO birthday_settings (guild_id, custom_message) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET custom_message = ?`).run(msg.guild.id, val, val);
                    mRes.reply({ content: 'Custom message updated.', flags: MessageFlags.Ephemeral });
                } catch (err) {}
            }
        });
    }
};