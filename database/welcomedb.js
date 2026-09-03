const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database', 'data.db');
const db = new Database(dbPath);

db.prepare(`
    CREATE TABLE IF NOT EXISTS welcome_settings (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT,
        type TEXT DEFAULT 'image',
        welcome_msg TEXT DEFAULT 'Welcome {user} to {server}!',
        leave_msg TEXT DEFAULT '{user} has left the server.',
        dm_welcome TEXT,
        dm_leave TEXT
    )
`).run();

const getWelcome = db.prepare('SELECT * FROM welcome_settings WHERE guild_id = ?');

const upsertWelcome = db.prepare(`
    INSERT INTO welcome_settings (guild_id, channel_id, type, welcome_msg, leave_msg, dm_welcome, dm_leave)
    VALUES (@guild_id, @channel_id, @type, @welcome_msg, @leave_msg, @dm_welcome, @dm_leave)
    ON CONFLICT(guild_id) DO UPDATE SET
        channel_id = COALESCE(excluded.channel_id, channel_id),
        type = COALESCE(excluded.type, type),
        welcome_msg = COALESCE(excluded.welcome_msg, welcome_msg),
        leave_msg = COALESCE(excluded.leave_msg, leave_msg),
        dm_welcome = COALESCE(excluded.dm_welcome, dm_welcome),
        dm_leave = COALESCE(excluded.dm_leave, dm_leave)
`);

const deleteWelcome = db.prepare('DELETE FROM welcome_settings WHERE guild_id = ?');

module.exports = {
    get: (guildId) => getWelcome.get(guildId),
    set: (data) => {
        const current = getWelcome.get(data.guild_id) || {};
        const payload = {
            guild_id: data.guild_id,
            channel_id: data.channel_id !== undefined ? data.channel_id : (current.channel_id || null),
            type: data.type !== undefined ? data.type : (current.type || 'image'),
            welcome_msg: data.welcome_msg !== undefined ? data.welcome_msg : (current.welcome_msg || 'Welcome {user} to {server}!'),
            leave_msg: data.leave_msg !== undefined ? data.leave_msg : (current.leave_msg || '{user} has left the server.'),
            dm_welcome: data.dm_welcome !== undefined ? data.dm_welcome : (current.dm_welcome || null),
            dm_leave: data.dm_leave !== undefined ? data.dm_leave : (current.dm_leave || null)
        };
        return upsertWelcome.run(payload);
    },
    remove: (guildId) => deleteWelcome.run(guildId)
};