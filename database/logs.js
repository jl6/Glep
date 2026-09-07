const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_logs (
        guild_id TEXT PRIMARY KEY,
        category_id TEXT,
        single_channel_id TEXT,
        kick_channel_id TEXT,
        ban_channel_id TEXT,
        unban_channel_id TEXT,
        warn_channel_id TEXT,
        unwarn_channel_id TEXT,
        nickname_channel_id TEXT,
        username_channel_id TEXT,
        shield_channel_id TEXT,
        separated INTEGER DEFAULT 0,
        kick_logs INTEGER DEFAULT 1,
        ban_logs INTEGER DEFAULT 1,
        unban_logs INTEGER DEFAULT 1,
        warn_logs INTEGER DEFAULT 1,
        unwarn_logs INTEGER DEFAULT 1,
        nickname_logs INTEGER DEFAULT 1,
        username_logs INTEGER DEFAULT 1,
        shield_logs INTEGER DEFAULT 1
    );
`);

module.exports = db;