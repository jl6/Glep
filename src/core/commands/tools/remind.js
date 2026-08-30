const { EmbedBuilder } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../../../database/data.db'));

db.prepare(`
    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        channel_id TEXT,
        guild_id TEXT,
        message TEXT,
        expires_at INTEGER,
        created_at INTEGER
    )
`).run();

const activeTimers = new Map();

function parseDuration(str) {
    if (!str) return null;
    const match = str.match(/^(\d+)([smhd])$/i);
    if (!match) return null;

    const val = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

    return val * mult[unit];
}

function scheduleReminder(client, rem) {
    const delay = rem.expires_at - Date.now();

    const trigger = async () => {
        try {
            const ch = await client.channels.fetch(rem.channel_id).catch(() => null);
            const user = await client.users.fetch(rem.user_id).catch(() => null);

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('Reminder')
                .setDescription(rem.message)
                .setTimestamp(rem.created_at);

            if (ch) {
                await ch.send({ content: `<@${rem.user_id}>`, embeds: [embed] }).catch(() => {});
            } else if (user) {
                await user.send({ embeds: [embed] }).catch(() => {});
            }
        } catch (err) {
            console.error('Failed to trigger reminder:', err);
        } finally {
            db.prepare('DELETE FROM reminders WHERE id = ?').run(rem.id);
            activeTimers.delete(rem.id);
        }
    };

    if (delay <= 0) {
        trigger();
    } else {
        const timer = setTimeout(trigger, delay);
        activeTimers.set(rem.id, timer);
    }
}

module.exports = {
    name: 'remind',
    description: 'Set a timed reminder',
    usage: '<time> <message>',
    selfClean: false,
   

    async execute(msg, args) {
        if (!args[0] || !args[1]) {
            return msg.reply('Usage: remind <10s|15m|2h|1d> <message>');
        }

        const ms = parseDuration(args[0]);
        if (!ms) return msg.reply('Invalid duration format. Use s, m, h, or d.');
        if (ms < 5000) return msg.reply('Minimum reminder duration is 5 seconds.');
        if (ms > 2592000000) return msg.reply('Maximum reminder duration is 30 days.');

        const text = args.slice(1).join(' ');
        const expiresAt = Date.now() + ms;
        const createdAt = Date.now();

        const info = db.prepare(`
            INSERT INTO reminders (user_id, channel_id, guild_id, message, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(msg.author.id, msg.channel.id, msg.guild.id, text, expiresAt, createdAt);

        const rem = {
            id: info.lastInsertRowid,
            user_id: msg.author.id,
            channel_id: msg.channel.id,
            guild_id: msg.guild.id,
            message: text,
            expires_at: expiresAt,
            created_at: createdAt
        };

        scheduleReminder(msg.client, rem);

        const target = Math.floor(expiresAt / 1000);
        return msg.reply(`Reminder set for <t:${target}:R>.`);
    },

    initReminders(client) {
        const pending = db.prepare('SELECT * FROM reminders').all();
        for (const rem of pending) {
            scheduleReminder(client, rem);
        }
        console.log(`Loaded ${pending.length} pending reminders.`);
    }
};