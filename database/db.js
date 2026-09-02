// File: database/db.js

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const sqlite = new Database(dbPath);

sqlite.prepare(`
    CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT
    )
`).run();

module.exports = {
    get(key) {
        const row = sqlite.prepare('SELECT value FROM kv_store WHERE key = ?').get(key);
        return row ? JSON.parse(row.value) : null;
    },
    set(key, value) {
        sqlite.prepare('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
    }
};