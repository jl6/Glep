const Database = require('better-sqlite3');
const path = require('path');
const { initPoller } = require('../../../utils/trackerHandler');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

let isInitialized = false;

module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
        if (isInitialized) return;
        isInitialized = true;

        db.exec(`
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                category_id TEXT,
                is_enabled INTEGER,
                prefix TEXT
            );
        `);

        try {
            db.exec('ALTER TABLE guild_settings ADD COLUMN prefix TEXT;');
        } catch {}

        console.log(`Online`);

        initPoller();
    }
};