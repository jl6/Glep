const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'pin',
    description: 'Pins a message via reply, ID, or custom text',
    usage: 'pin [text or message id]',
    
    async execute(msg, args) {
        if (msg.reference?.messageId) {
            const target = await msg.channel.messages.fetch(msg.reference.messageId).catch(() => null);
            if (!target) return msg.reply('Could not fetch the replied message.');
            if (target.pinned) return msg.reply('That message is already pinned.');
            
            await target.pin();
            await msg.delete().catch(() => null);
            
            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setDescription(`Pinned message from **${target.author.tag}**`)
                .addFields({ name: 'Jump Link', value: `[Jump to Message](${target.url})` });
            
            return msg.channel.send({ embeds: [embed] });
        }

        if (!args.length) {
            return msg.reply('Provide text, a message ID, or reply to a message to pin it.');
        }

        const query = args[0];
        if (/^\d{17,20}$/.test(query)) {
            const target = await msg.channel.messages.fetch(query).catch(() => null);
            if (!target) return msg.reply('Could not find a message matching that ID.');
            if (target.pinned) return msg.reply('That message is already pinned.');

            await target.pin();
            await msg.delete().catch(() => null);

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setDescription(`Pinned message from **${target.author.tag}**`)
                .addFields({ name: 'Jump Link', value: `[Jump to Message](${target.url})` });

            return msg.channel.send({ embeds: [embed] });
        }

        const text = args.join(' ');
        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription(text)
            .addFields({ name: 'Pinned By', value: `${msg.author}` });

        const sent = await msg.channel.send({ embeds: [embed] });
        await sent.pin();
        await msg.delete().catch(() => null);
    }
};