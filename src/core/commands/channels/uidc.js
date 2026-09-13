const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));
db.prepare(`
    CREATE TABLE IF NOT EXISTS userid_channels (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT
    )
`).run();

module.exports = {
    name: 'uidc',
    description: 'Set or remove the channel for automatic user ID lookups.',
    usage: '#channel or remove',

    async execute(msg, args) {
        if (!msg.guild) return;
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return msg.reply('Missing permissions.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('uic_set_current').setLabel('Use This Channel').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('uic_remove').setLabel('Disable Lookup').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('uic_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );

        const current = db.prepare('SELECT channel_id FROM userid_channels WHERE guild_id = ?').get(msg.guild.id);
        const curCh = current ? msg.guild.channels.cache.get(current.channel_id) : null;
        const curText = curCh ? `<#${curCh.id}>` : 'None';

        const eb = new EmbedBuilder()
            .setTitle('User ID Lookup Setup')
            .setDescription(`Current channel: ${curText}\n\nClick a button below or provide a channel argument like \`_uidc #channel\`.`)
            .setColor(0x2b2d31);

        const arg = args[0];
        if (arg) {
            const isRemove = ['remove', 'off', 'disable'].includes(arg.toLowerCase());
            if (isRemove) {
                db.prepare('DELETE FROM userid_channels WHERE guild_id = ?').run(msg.guild.id);
                return msg.reply('Channel lookup disabled.');
            }

            const chId = arg.replace(/[<#&>]/g, '');
            const ch = msg.guild.channels.cache.get(chId);
            if (!ch) return msg.reply('Channel not found.');

            db.prepare('INSERT OR REPLACE INTO userid_channels (guild_id, channel_id) VALUES (?, ?)').run(msg.guild.id, ch.id);
            return msg.reply(`User ID lookup channel set to ${ch.name}.`);
        }

        const panel = await msg.channel.send({ embeds: [eb], components: [row] });
        const collector = panel.createMessageComponentCollector({ filter: i => i.user.id === msg.author.id, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'uic_cancel') {
                collector.stop();
                return i.update({ content: 'Cancelled.', embeds: [], components: [] });
            }

            if (i.customId === 'uic_remove') {
                db.prepare('DELETE FROM userid_channels WHERE guild_id = ?').run(msg.guild.id);
                collector.stop();
                return i.update({ content: 'Channel lookup disabled.', embeds: [], components: [] });
            }

            if (i.customId === 'uic_set_current') {
                db.prepare('INSERT OR REPLACE INTO userid_channels (guild_id, channel_id) VALUES (?, ?)').run(msg.guild.id, msg.channel.id);
                collector.stop();
                return i.update({ content: `User ID lookup channel set to <#${msg.channel.id}>.`, embeds: [], components: [] });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') panel.edit({ content: 'Timed out.', components: [] }).catch(() => {});
        });
    }
};