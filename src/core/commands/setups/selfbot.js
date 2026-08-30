const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'data.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_selfbots (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT,
        message_id TEXT,
        ban_count INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1
    );
`);

const buildEmbed = (data, ch) => {
    return new EmbedBuilder()
        .setTitle('Selfbot Trap Config')
        .addFields(
            { name: 'Status', value: data?.enabled ? 'ENABLED' : 'DISABLED', inline: true },
            { name: 'Channel', value: ch ? `${ch}` : 'None', inline: true },
            { name: 'Total Bans', value: String(data?.ban_count || 0), inline: false }
        )
        .setColor(0x2b2d31);
};

const buildRow = (data) => {
    const active = data?.enabled === 1;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('toggle_selfbot')
            .setLabel(active ? 'Disable Trap' : 'Enable Trap')
            .setStyle(active ? ButtonStyle.Danger : ButtonStyle.Success)
    );
};

module.exports = {
    name: 'selfbot',
    description: 'Designates a trap channel to ban self bots',
    usage: '[#channel]',
    selfClean: 9000,
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return msg.reply('Missing Manage Server permissions.');
        }

        let data = db.prepare('SELECT * FROM guild_selfbots WHERE guild_id = ?').get(msg.guild.id);
        const targetCh = msg.mentions.channels.first() || msg.guild.channels.cache.get(args[0]);

        let activeCh = null;

        if (targetCh) {
            const warnEmbed = new EmbedBuilder()
                .setTitle('Trap Active')
                .setDescription('Non-staff messages here will trigger an automated ban.')
                .addFields({ name: 'Bans Issued', value: '0', inline: false })
                .setColor(0xcc3333);

            const trapMsg = await targetCh.send({ embeds: [warnEmbed] }).catch(() => null);
            if (!trapMsg) return msg.reply('Failed to send trap message to that channel.');

            db.prepare(`
                INSERT INTO guild_selfbots (guild_id, channel_id, message_id, ban_count, enabled) 
                VALUES (?, ?, ?, 0, 1)
                ON CONFLICT(guild_id) DO UPDATE SET channel_id = ?, message_id = ?, ban_count = 0, enabled = 1
            `).run(msg.guild.id, targetCh.id, trapMsg.id, targetCh.id, trapMsg.id);

            data = { guild_id: msg.guild.id, channel_id: targetCh.id, message_id: trapMsg.id, ban_count: 0, enabled: 1 };
            activeCh = targetCh;
        } else if (data?.channel_id) {
            activeCh = msg.guild.channels.cache.get(data.channel_id);
        } else {
            return msg.reply('Please specify a valid text channel.');
        }

        const res = await msg.reply({
            embeds: [buildEmbed(data, activeCh)],
            components: [buildRow(data)]
        });

        const collector = res.createMessageComponentCollector({
            filter: i => i.user.id === msg.author.id,
            time: 60000
        });

        collector.on('collect', async i => {
            const current = db.prepare('SELECT enabled FROM guild_selfbots WHERE guild_id = ?').get(msg.guild.id);
            if (!current?.enabled) return;

            db.prepare('DELETE FROM guild_selfbots WHERE guild_id = ?').run(msg.guild.id);
            await i.update({
                embeds: [buildEmbed(null, null)],
                components: [buildRow(null)]
            });
        });

        collector.on('end', () => {
            res.edit({ components: [] }).catch(() => {});
        });
    }
};