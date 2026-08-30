const { EmbedBuilder } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

module.exports = {
    name: 'untrack',
    description: 'Removes tracked character from database',
    usage: '[name | hash | all]',
    selfClean: 15000,
    specialOnly: true,

    async execute(msg, args) {
        if (!args.length) return msg.reply('Provide a character name, hash, or all.');

        const query = args.join(' ').trim();
        const isWipe = ['all', 'clear', 'wipe'].includes(query.toLowerCase());

        try {
            if (isWipe) {
                const countRes = db.prepare('SELECT COUNT(*) as count FROM tracked_characters').get();
                const total = countRes ? countRes.count : 0;

                db.prepare('DELETE FROM tracked_characters').run();

                const embed = new EmbedBuilder()
                    .setTitle('Database Cleared')
                    .setColor(0xe74c3c)
                    .setDescription(`Purged all tracked records. Removed ${total} entries.`)
                    .setTimestamp();

                return msg.reply({ embeds: [embed] });
            }

            const stmt = db.prepare('SELECT hash, current_name FROM tracked_characters WHERE hash = ? OR LOWER(current_name) = LOWER(?)');
            const target = stmt.get(query, query);

            if (!target) return msg.reply(`No tracked record found for ${query}.`);

            db.prepare('DELETE FROM tracked_characters WHERE hash = ?').run(target.hash);

            const embed = new EmbedBuilder()
                .setTitle('Character Untracked')
                .setColor(0xe74c3c)
                .setDescription(`Removed ${target.current_name} from tracking.`)
                .addFields({ name: 'Hash', value: target.hash })
                .setTimestamp();

            return msg.reply({ embeds: [embed] });

        } catch (err) {
            console.error('Untrack error:', err.message);
            return msg.reply(`Failed to delete record: ${err.message}`);
        }
    }
};