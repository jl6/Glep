const { PermissionFlagsBits, Collection } = require('discord.js');

module.exports = {
    name: 'clear',
    description: 'Bulk deletes messages',
    usage: 'clear <amount> [filter]',
  

    async execute(msg, args) {
        if (!args[0]) return msg.reply('Provide an amount or message ID to clear.');

        const isId = /^\d{17,20}$/.test(args[0]);
        let targets;

        if (isId) {
            const fetched = await msg.channel.messages.fetch({ limit: 100 });
            targets = fetched.filter(m => m.id >= args[0]);
            if (!targets.has(args[0])) return msg.reply('Could not find that message ID in recent history.');
        } else {
            const count = parseInt(args[0], 10);
            if (isNaN(count) || count < 1 || count > 100) {
                return msg.reply('Amount must be between 1 and 100.');
            }

            const mention = msg.mentions.users.first();
            const filter = args[1]?.toLowerCase();
            const hasFilter = mention || filter === 'bots' || filter === 'users';
            
            const fetched = await msg.channel.messages.fetch({ limit: hasFilter ? 100 : Math.min(count + 1, 100) });
            let list = Array.from(fetched.values());

            if (mention) {
                list = list.filter(m => m.author.id === mention.id || m.id === msg.id);
            } else if (filter === 'bots') {
                list = list.filter(m => m.author.bot || m.id === msg.id);
            } else if (filter === 'users') {
                list = list.filter(m => !m.author.bot || m.id === msg.id);
            }

            targets = new Collection(list.slice(0, count + 1).map(m => [m.id, m]));
        }

        if (!targets.has(msg.id)) targets.set(msg.id, msg);

        try {
            const deleted = await msg.channel.bulkDelete(targets, true);
            const total = deleted.has(msg.id) ? deleted.size - 1 : deleted.size;

            const feedback = await msg.channel.send(`Purged ${Math.max(0, total)} messages.`);
            setTimeout(() => feedback.delete().catch(() => {}), 4000);
        } catch (err) {
            if (err.code === 50034) {
                return msg.reply('Cannot delete messages older than 14 days via bulk delete.');
            }
            throw err;
        }
    }
};