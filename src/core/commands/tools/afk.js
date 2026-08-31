// src/core/commands/tools/afk.js
const { EmbedBuilder } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../../../database/data.db'));

db.exec('CREATE TABLE IF NOT EXISTS afk (userId TEXT PRIMARY KEY, reason TEXT, timestamp INTEGER)');

module.exports = {
    name: 'afk',
    description: 'Set your AFK status and reason',
    usage: '[MESSAGE]',

    async execute(msg, args) {
        const reason = args.join(' ') || 'AFK';
        
        db.prepare('INSERT OR REPLACE INTO afk (userId, reason, timestamp) VALUES (?, ?, ?)').run(
            msg.author.id,
            reason,
            Date.now()
        );

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(`**${msg.author.username}**, I set your AFK: **${reason}**`);

        const reply = await msg.reply({ embeds: [embed] });
        setTimeout(() => reply.delete().catch(() => {}), 10000);
    }
};