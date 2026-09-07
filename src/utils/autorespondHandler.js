const pathH = require('path');
const DatabaseH = require('better-sqlite3');
const dbH = new DatabaseH(pathH.join(process.cwd(), 'database', 'data.db'));

async function checkAutoRespond(msg) {
    if (!msg.guild || msg.author.bot) return false;

    const rows = dbH.prepare('SELECT trigger, response FROM guild_autorespond WHERE guild_id = ?').all(msg.guild.id);
    if (!rows || rows.length === 0) return false;

    const content = msg.content.toLowerCase();
    for (const row of rows) {
        if (content === row.trigger || content.includes(row.trigger)) {
            await msg.channel.send(row.response).catch(() => {});
            return true;
        }
    }

    return false;
}

module.exports = { checkAutoRespond };