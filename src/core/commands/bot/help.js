const Database = require('better-sqlite3');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const dbPath = path.join(process.cwd(), 'database', 'data.db');
const db = new Database(dbPath);

module.exports = {
    name: 'help',
    description: 'Displays available commands or specific command info.',
    usage: '[command]',
    async execute(msg, args, client) {
        let prefix = process.env.PREFIX || '!';

        if (msg.guild) {
            const row = db.prepare('SELECT prefix FROM guild_settings WHERE guild_id = ?').get(msg.guild.id);
            if (row?.prefix) prefix = row.prefix;
        }

        const target = args[0]?.toLowerCase();
        if (target) {
            const cmd = client.commands.get(target);
            if (!cmd) return msg.reply('Command not found.');

            const usage = cmd.usage ? `${prefix}${cmd.name} ${cmd.usage}` : `${prefix}${cmd.name}`;
            const embed = new EmbedBuilder()
                .setTitle(`Command: ${cmd.name}`)
                .setDescription(cmd.description || 'No description provided.')
                .addFields({ name: 'Usage', value: `\`\`\`text\n${usage}\n\`\`\`` });

            return msg.reply({ embeds: [embed] });
        }

        const groups = {};
        client.commands.forEach(cmd => {
            const cat = cmd.category ? cmd.category.toUpperCase() : 'GENERAL';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(cmd);
        });

        const embed = new EmbedBuilder()
            .setTitle('Command Directory')
            .setDescription(`Prefix: \`${prefix}\``);

        for (const [cat, cmds] of Object.entries(groups)) {
            const list = cmds.map(c => `\`${prefix}${c.name}\` - ${c.description || 'No description'}`).join('\n');
            embed.addFields({ name: cat, value: list });
        }

        return msg.reply({ embeds: [embed] });
    }
};