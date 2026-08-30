const { PermissionFlagsBits } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../../../database/data.db');
const db = new Database(dbPath);

db.prepare(`
    CREATE TABLE IF NOT EXISTS sticky_messages (
        guild_id TEXT,
        channel_id TEXT PRIMARY KEY,
        message TEXT,
        last_msg_id TEXT
    )
`).run();

module.exports = {
    name: 'sticky',
    description: 'Sets a persistent message at the bottom of the channel',
    usage:'[MESSGE] | remove',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return msg.reply('Missing permissions: Manage Messages required.');
        }

        const action = args[0];
        if (!action) {
            return msg.reply('Usage: !sticky <text> or !sticky remove');
        }

        if (action === 'remove') {
            const info = db.prepare('DELETE FROM sticky_messages WHERE channel_id = ?').run(msg.channel.id);
            if (info.changes === 0) {
                return msg.reply('No active sticky message found for this channel.');
            }
            return msg.reply('Sticky message removed.');
        }

        const content = args.join(' ');
        if (!content) {
            return msg.reply('Please provide text for the sticky message.');
        }

        db.prepare(`
            INSERT INTO sticky_messages (guild_id, channel_id, message, last_msg_id)
            VALUES (?, ?, ?, NULL)
            ON CONFLICT(channel_id) DO UPDATE SET message = ?, last_msg_id = NULL
        `).run(msg.guild.id, msg.channel.id, content, content);

        await msg.reply('Sticky message configured successfully.');
    }
};