const { EmbedBuilder } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

function findCharacter(input) {
    return db.prepare('SELECT * FROM tracked_characters WHERE hash = ? OR LOWER(current_name) = LOWER(?)').get(input, input);
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

module.exports = {
    name: 'history',
    description: 'Displays name history for tracked character',
    usage: '<name_or_hash>',
    selfClean: 15000,
    specialOnly: true,

    async execute(msg, args) {
        if (!args.length) return msg.reply('Provide a character name or hash.');

        const query = args.join(' ').trim();
        const target = findCharacter(query);

        if (!target) return msg.reply(`No tracked record found for ${query}.`);

        const historyRows = getHistory(target.hash);

        const embed = new EmbedBuilder()
            .setTitle(`Name History: ${target.current_name}`)
            .setColor(0x3498db)
            .addFields(
                { name: 'Hash', value: target.hash, inline: false },
                { name: 'Current Name', value: target.current_name, inline: false }
            );

        if (!historyRows.length) {
            embed.setDescription('No name changes recorded for this character.');
        } else {
            const first = historyRows[0].old_name;
            const subsequent = historyRows.map(h => h.new_name);
            const chain = [first, ...subsequent].join(' -> ');

            const trail = historyRows.map((row, idx) => {
                const ts = typeof row.changed_at === 'number'
                    ? row.changed_at
                    : Math.floor(new Date(row.timestamp || row.changed_at).getTime() / 1000);

                const timeStr = isNaN(ts) ? '' : `(<t:${ts}:R>)`;
                return `${idx + 1}. ${row.old_name} -> ${row.new_name} ${timeStr}`;
            }).join('\n');

            embed.setDescription(`Chain:\n${chain}\n\nTrail:\n${trail}`);
        }

        return msg.reply({ embeds: [embed] });
    }
};