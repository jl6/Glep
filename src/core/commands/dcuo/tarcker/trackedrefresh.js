const { EmbedBuilder, WebhookClient } = require('discord.js');
const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

const serviceId = process.env.CENSUS_SERVICE_ID;
const webhookUrl = process.env.WEBHOOK_URL;
const webhookClient = webhookUrl && webhookUrl.startsWith('http') ? new WebhookClient({ url: webhookUrl }) : null;

if (!serviceId) {
    console.warn('Warning: CENSUS_SERVICE_ID is not defined.');
}

function touchTimestamp(hash) {
    db.prepare('UPDATE tracked_characters SET updated_at = CURRENT_TIMESTAMP WHERE hash = ?').run(hash);
}

function getHistory(hash) {
    const row = db.prepare('SELECT history FROM tracked_characters WHERE hash = ?').get(hash);
    if (!row) return [];
    try {
        return JSON.parse(row.history || '[]');
    } catch {
        return [];
    }
}

function recordNameChange(hash, oldName, newName) {
    const history = getHistory(hash);
    history.push({ old_name: oldName, new_name: newName, timestamp: new Date().toISOString() });

    db.prepare('UPDATE tracked_characters SET current_name = ?, history = ?, updated_at = CURRENT_TIMESTAMP WHERE hash = ?')
        .run(newName, JSON.stringify(history), hash);
}

function findCharacter(input) {
    return db.prepare('SELECT * FROM tracked_characters WHERE hash = ? OR LOWER(current_name) = LOWER(?)').get(input, input);
}

async function processRecordRefresh(hash, oldName) {
    if (!serviceId) return { updated: false, reason: 'Census service ID missing' };

    const url = `https://census.daybreakgames.com/s:${serviceId}/json/get/dcuo:v1/character?hash=${encodeURIComponent(hash)}`;
    
    try {
        const res = await axios.get(url, {
            timeout: 10000,
            headers: { 'User-Agent': `${serviceId}/1.0` }
        });

        const list = res.data?.character_list;
        if (!list || !list.length) return { updated: false, reason: 'Character not found' };

        const newName = list[0].name;
        if (!newName) return { updated: false, reason: 'Invalid data' };

        touchTimestamp(hash);

        if (newName.toLowerCase() !== oldName.toLowerCase()) {
            recordNameChange(hash, oldName, newName);
            const history = getHistory(hash);

            if (webhookClient) {
                const first = history.length ? history[0].old_name : oldName;
                const rest = history.map(h => h.new_name);
                const timeline = [first, ...rest].join(' -> ');

                const embed = new EmbedBuilder()
                    .setTitle('Name Change Detected')
                    .setColor(0xf1c40f)
                    .addFields(
                        { name: 'Hash', value: hash, inline: false },
                        { name: 'Old Name', value: oldName, inline: true },
                        { name: 'New Name', value: newName, inline: true },
                        { name: 'Timeline', value: timeline || 'No prior history', inline: false }
                    )
                    .setTimestamp();

                await webhookClient.send({ username: 'Census Tracker', embeds: [embed] }).catch(() => {});
            }

            return { updated: true, oldName, newName };
        }

        return { updated: false, currentName: oldName };
    } catch (err) {
        return { updated: false, reason: err.message };
    }
}

module.exports = {
    name: 'trefresh',
    description: 'Refreshes tracked character data',
    usage: '[name | hash | all]',
    selfClean: 15000,
    specialOnly: true,

    async execute(msg, args) {
        if (!serviceId) return msg.reply('Census service ID not configured.');

        const query = args.join(' ').trim().toLowerCase();
        if (!query) return msg.reply('Specify a target to refresh.');

        const status = await msg.reply('Synchronizing with Census...');

        try {
            if (query === 'all') {
                const records = db.prepare('SELECT hash, current_name FROM tracked_characters').all();
                
                if (!records.length) return status.edit('No tracked records found.');

                let updatedCount = 0;
                for (const rec of records) {
                    const res = await processRecordRefresh(rec.hash, rec.current_name);
                    if (res.updated) updatedCount++;
                    await new Promise(r => setTimeout(r, 1000));
                }

                return status.edit(`Refreshed ${records.length} records. Changes detected: ${updatedCount}.`);
            } 

            const record = findCharacter(query);
            if (!record) return status.edit(`No tracked record found for ${args.join(' ')}.`);

            const result = await processRecordRefresh(record.hash, record.current_name);

            if (result.updated) {
                return status.edit(`Name change detected: ${result.oldName} -> ${result.newName}`);
            } else if (result.reason) {
                return status.edit(`Check failed: ${result.reason}`);
            } else {
                return status.edit(`Checked ${record.current_name}. No changes detected.`);
            }

        } catch (err) {
            console.error('Refresh error:', err.message);
            return status.edit(`Sync error: ${err.message}`);
        }
    }
};