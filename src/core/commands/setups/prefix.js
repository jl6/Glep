const { PermissionFlagsBits } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

module.exports = {
    name: 'prefix',
    description: 'Change command prefix',
    usage: '<prefix>',
    selfClean: 9000,

    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return msg.reply('Missing Manage Server permissions.');
        }

        const pfx = args[0];
        if (!pfx) return msg.reply('Provide a new prefix.');
        if (pfx.length > 5) return msg.reply('Prefix cannot exceed 5 characters.');

        db.prepare(`
            INSERT INTO guild_settings (guild_id, prefix)
            VALUES (?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET prefix = excluded.prefix
        `).run(msg.guild.id, pfx);

        return msg.reply(`Prefix updated to ${pfx}`);
    }
};