const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

db.prepare(`
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        category_id TEXT,
        is_enabled INTEGER DEFAULT 0
    )
`).run();

module.exports = {
    name: 'dmamod',
    description: 'Configure the direct message relay system.',
    usage: '',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return msg.reply('Missing permissions.');
        }

        const row = db.prepare('SELECT is_enabled FROM guild_settings WHERE guild_id = ?').get(msg.guild.id);
        const active = row?.is_enabled === 1;

        const rowComp = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('dmamod_toggle_on')
                .setLabel('Turn On')
                .setStyle(ButtonStyle.Success)
                .setDisabled(active),
            new ButtonBuilder()
                .setCustomId('dmamod_toggle_off')
                .setLabel('Turn Off')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!active)
        );

        await msg.reply({
            content: `DM System Status: ${active ? 'Enabled' : 'Disabled'}`,
            components: [rowComp]
        });
    }
};