const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));
const locks = new Set();

async function checkSticky(msg) {
    const channelId = msg.channel.id;
    if (locks.has(channelId)) return;

    const row = db.prepare('SELECT message, last_msg_id FROM sticky_messages WHERE channel_id = ?').get(channelId);
    if (!row || row.last_msg_id === msg.id) return;

    locks.add(channelId);
    try {
        if (row.last_msg_id) {
            try {
                const oldMsg = await msg.channel.messages.fetch(row.last_msg_id);
                if (oldMsg) await oldMsg.delete();
            } catch (err) {

            }
        }

        const newMsg = await msg.channel.send(row.message);
        db.prepare('UPDATE sticky_messages SET last_msg_id = ? WHERE channel_id = ?').run(newMsg.id, channelId);
    } finally {
        locks.delete(channelId);
    }
}

module.exports = { checkSticky };