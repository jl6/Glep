const { EmbedBuilder, WebhookClient } = require('discord.js');
const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

db.prepare(`
    CREATE TABLE IF NOT EXISTS tracked_characters (
        hash TEXT PRIMARY KEY,
        current_name TEXT NOT NULL,
        history TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

const webhookUrl = process.env.WEBHOOK_URL;
const webhookClient = webhookUrl && webhookUrl.startsWith('http') ? new WebhookClient({ url: webhookUrl }) : null;

function escapeCensusRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function sendNameChangeWebhook(hash, newName, oldName, historyArray) {
    if (!webhookClient) return;

    const first = historyArray.length > 0 ? historyArray[0].old_name : oldName;
    const rest = historyArray.map(h => h.new_name);
    const timeline = [first, ...rest].join(' -> ');

    const embed = new EmbedBuilder()
        .setTitle('Character Name Change Detected')
        .setColor(0xf1c40f)
        .addFields(
            { name: 'Hash', value: hash, inline: false },
            { name: 'Old Name', value: oldName, inline: true },
            { name: 'New Name', value: newName, inline: true },
            { name: 'Timeline', value: timeline || 'No prior history', inline: false }
        )
        .setTimestamp();

    try {
        await webhookClient.send({
            username: 'Census Tracker',
            embeds: [embed]
        });
    } catch (err) {
        console.error('Webhook error:', err.message);
    }
}

function trackCharacterInDb(hash, currentName) {
    const existing = db.prepare('SELECT * FROM tracked_characters WHERE hash = ?').get(hash);

    let isNew = false;
    let renamed = false;
    let oldName = null;
    let history = [];

    if (!existing) {
        isNew = true;
        db.prepare('INSERT INTO tracked_characters (hash, current_name, history) VALUES (?, ?, ?)').run(hash, currentName, JSON.stringify([]));
    } else {
        history = JSON.parse(existing.history || '[]');
        if (existing.current_name.toLowerCase() !== currentName.toLowerCase()) {
            renamed = true;
            oldName = existing.current_name;
            
            history.push({ old_name: oldName, new_name: currentName, timestamp: new Date().toISOString() });

            db.prepare('UPDATE tracked_characters SET current_name = ?, history = ?, updated_at = CURRENT_TIMESTAMP WHERE hash = ?').run(currentName, JSON.stringify(history), hash);
        }
    }

    return { isNew, renamed, oldName, history };
}

module.exports = {
    name: 'track',
    description: 'Tracks character name changes',
    usage: '[name]',
    selfClean: 15000,
    specialOnly: true,

    async execute(msg, args) {
        if (!args.length) return msg.reply('Provide a character name.');

        const serviceId = process.env.CENSUS_SERVICE_ID;
        if (!serviceId) return msg.reply('Census service identifier not configured.');

        const query = args.join(' ').trim();
        const encoded = encodeURIComponent(query);
        const escaped = encodeURIComponent(escapeCensusRegex(query));

        const status = await msg.reply(`Looking up ${query}...`);

        const endpoints = [
            `https://census.daybreakgames.com/s:${serviceId}/json/get/dcuo:v1/character?name=${encoded}&c:case=false`,
            `https://census.daybreakgames.com/s:${serviceId}/json/get/dcuo:v1/character?name=^${escaped}&c:case=false`
        ];

        try {
            let data = null;

            for (const url of endpoints) {
                const res = await axios.get(url, {
                    timeout: 10000,
                    headers: { 'User-Agent': 'DiscordBotStats/1.0' }
                });

                if (res.data?.character_list?.length > 0 || res.data?.error || res.data?.errorMessage) {
                    data = res.data;
                    break;
                }
            }

            if (data?.error || data?.errorMessage) {
                await status.delete().catch(() => {});
                return msg.reply(`API Error: ${data.error || data.errorMessage}`);
            }

            if (!data?.character_list?.length) {
                await status.delete().catch(() => {});
                return msg.reply(`No record found for ${query}.`);
            }

            const char = data.character_list[0];
            const name = char.name || query;
            const hash = char.hash || 'N/A';

            if (hash === 'N/A') {
                await status.delete().catch(() => {});
                return msg.reply(`Could not resolve character hash for ${name}.`);
            }

            const tracking = trackCharacterInDb(hash, name);

            if (tracking.renamed) {
                await sendNameChangeWebhook(hash, name, tracking.oldName, tracking.history);
            }

            let desc = `Hash: ${hash}`;

            if (tracking.isNew) {
                desc += '\nCharacter is now being tracked.';
            } else if (tracking.renamed) {
                desc += '\nName change detected.';
            }

            if (tracking.history.length > 0) {
                const first = tracking.history[0].old_name;
                const rest = tracking.history.map(h => h.new_name);
                const timeline = [first, ...rest].join(' -> ');
                desc += `\n\nHistory:\n${timeline}`;
            }

            const embed = new EmbedBuilder()
                .setTitle(name)
                .setDescription(desc)
                .setColor(tracking.renamed ? 0xf1c40f : 0x5865f2);

            await status.delete().catch(() => {});
            return msg.reply({ embeds: [embed] });

        } catch (err) {
            console.error('Track error:', err.message);
            await status.delete().catch(() => {});
            return msg.reply(`Connection error: ${err.message}`);
        }
    }
};