const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../database/data.db'));

module.exports = async function afkHandler(msg) {
    if (msg.author.bot || !msg.guild) return false;

    const row = db.prepare('SELECT timestamp FROM afk WHERE userId = ?').get(msg.author.id);
    if (row) {
        db.prepare('DELETE FROM afk WHERE userId = ?').run(msg.author.id);
        const reply = await msg.reply(`Welcome back **${msg.author.username}**, your AFK status has been cleared.`);
        setTimeout(() => reply.delete().catch(() => {}), 5000);
    }

    if (!msg.mentions.users.size) return false;

    for (const [userId, user] of msg.mentions.users) {
        if (userId === msg.author.id) continue;

        const target = db.prepare('SELECT reason, timestamp FROM afk WHERE userId = ?').get(userId);
        if (!target) continue;

        const relTime = `<t:${Math.floor(target.timestamp / 1000)}:R>`;
        const reply = await msg.reply(`**${user.username}** is AFK: **${target.reason}** (${relTime})`);
        setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    return false;
};