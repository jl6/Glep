const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'nuke',
    description: 'Deletes and recreates the current channel.',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return msg.reply('Missing permissions.');
        }

        const ch = msg.channel;
        if (!ch.isTextBased() || ch.isThread()) {
            return msg.reply('Invalid channel type.');
        }

        try {
            const fresh = await ch.clone({ reason: `Nuked by ${msg.author.tag}` });
            await ch.delete(`Nuked by ${msg.author.tag}`);

            const embed = new EmbedBuilder()
                .setDescription(`Channel reset by ${msg.author.tag}`);

            await fresh.send({ embeds: [embed] });
        } catch (err) {
            console.error('Failed to nuke channel:', err);
            await msg.reply('Failed to execute command.');
        }
    }
};