const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

let isInitialized = false;

module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
        console.log(`Online`);
    }
};