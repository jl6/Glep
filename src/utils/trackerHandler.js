const { EmbedBuilder, WebhookClient } = require('discord.js');
const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

try {
    db.exec('ALTER TABLE tracked_characters ADD COLUMN last_updated INTEGER DEFAULT 0;');
} catch {}

try {
    db.exec('ALTER TABLE tracked_characters ADD COLUMN fail_count INTEGER DEFAULT 0;');
} catch {}

const SERVICE_ID = process.env.CENSUS_SERVICE_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!SERVICE_ID) {
    console.warn('CENSUS_SERVICE_ID is not defined.');
}

const BASE_POLL_INTERVAL_MS = 2000;
const API_TIMEOUT_MS = 15000;

const webhookClient = WEBHOOK_URL && WEBHOOK_URL.startsWith('http') ? new WebhookClient({ url: WEBHOOK_URL }) : null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getStalestCharacter() {
    return db.prepare(`
        SELECT * FROM tracked_characters 
        WHERE last_updated <= unixepoch() 
        ORDER BY last_updated ASC 
        LIMIT 1
    `).get() || db.prepare(`
        SELECT * FROM tracked_characters 
        ORDER BY last_updated ASC 
        LIMIT 1
    `).get();
}

function recordNameChange(hash, oldName, newName) {
    const row = db.prepare('SELECT history FROM tracked_characters WHERE hash = ?').get(hash);
    if (!row) return;

    let history = [];
    try {
        history = JSON.parse(row.history || '[]');
    } catch {
        history = [];
    }

    history.push({
        old_name: oldName,
        new_name: newName,
        timestamp: new Date().toISOString()
    });

    db.prepare(`
        UPDATE tracked_characters 
        SET current_name = ?, history = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE hash = ?
    `).run(newName, JSON.stringify(history), hash);
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

function getDeferralSeconds(failCount) {
    if (failCount >= 6) return 43200;
    if (failCount >= 5) return 7200;
    return 1800;
}

function handleFailedAttempt(target) {
    const nextFailCount = (target.fail_count || 0) + 1;

    if (nextFailCount >= 3) {
        const deferSeconds = getDeferralSeconds(nextFailCount);
        console.log(`Deferring ${target.current_name} (${target.hash}) for ${deferSeconds / 60}m due to repeated failures.`);

        db.prepare(`
            UPDATE tracked_characters
            SET last_updated = unixepoch() + ?, fail_count = ?
            WHERE hash = ?
        `).run(deferSeconds, nextFailCount, target.hash);
    } else {
        console.log(`Failed check for ${target.current_name} (${target.hash}) (${nextFailCount}/3). Retrying.`);

        db.prepare(`
            UPDATE tracked_characters
            SET last_updated = unixepoch(), fail_count = ?
            WHERE hash = ?
        `).run(nextFailCount, target.hash);
    }

    return { delay: BASE_POLL_INTERVAL_MS };
}

async function pollNextCharacter() {
    if (!SERVICE_ID) return { delay: 10000 };

    const target = getStalestCharacter();
    if (!target) return { delay: 5000 };

    const endpoint = `https://census.daybreakgames.com/s:${SERVICE_ID}/json/get/dcuo:v1/character?hash=${encodeURIComponent(target.hash)}`;

    try {
        const res = await axios.get(endpoint, {
            timeout: API_TIMEOUT_MS,
            headers: { 'User-Agent': `${SERVICE_ID}/1.0` }
        });

        const raw = res.data;
        const list = raw?.character_list;

        if (raw?.error || raw?.errorMessage || !list || list.length === 0) {
            return handleFailedAttempt(target);
        }

        db.prepare(`
            UPDATE tracked_characters
            SET last_updated = unixepoch(), fail_count = 0
            WHERE hash = ?
        `).run(target.hash);

        const active = list[0];
        const latestName = active.name;

        if (latestName && latestName.toLowerCase() !== target.current_name.toLowerCase()) {
            console.log(`Rename detected: ${target.current_name} -> ${latestName} (${target.hash})`);

            recordNameChange(target.hash, target.current_name, latestName);
            const history = getHistory(target.hash);

            if (webhookClient) {
                const firstName = history.length > 0 ? history[0].old_name : target.current_name;
                const subsequent = history.map(h => h.new_name);
                const timeline = [firstName, ...subsequent].map(n => `\`${n}\``).join(' -> ');

                const embed = new EmbedBuilder()
                    .setTitle('Character Name Change Detected')
                    .setColor(0x2ecc71)
                    .addFields(
                        { name: 'Character Hash', value: `\`${target.hash}\``, inline: false },
                        { name: 'Old Name', value: `\`${target.current_name}\``, inline: true },
                        { name: 'New Name', value: `\`${latestName}\``, inline: true },
                        { name: 'Timeline', value: timeline || '`None`', inline: false }
                    )
                    .setTimestamp();

                await webhookClient.send({
                    username: 'Census Tracker',
                    embeds: [embed]
                }).catch((err) => {
                    if (err.code !== 10015) {
                        console.log('Failed to send webhook notification:', err.message);
                    }
                });
            }
        }

        return { delay: BASE_POLL_INTERVAL_MS };
    } catch {
        return handleFailedAttempt(target);
    }
}

async function startPoller() {
    console.log('Tracker poller loop started.');

    while (true) {
        const { delay } = await pollNextCharacter();
        await sleep(delay);
    }
}

process.on('uncaughtException', (err) => console.log('Uncaught exception:', err.message));
process.on('unhandledRejection', (reason) => console.log('Unhandled rejection:', reason));

module.exports = {
    initPoller: startPoller
};