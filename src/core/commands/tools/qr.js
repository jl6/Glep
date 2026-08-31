const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'qr',
    description: 'Generates a QR code for text or links.',
    async execute(msg, args) {
        const text = args.join(' ');
        if (!text) {
            return msg.reply('Missing content for QR code.');
        }

        const encoded = encodeURIComponent(text);
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setTitle('QR Code')
            .setDescription(text.length > 30 ? text.slice(0, 27) + '...' : text)
            .setImage(url)
            .setFooter({ text: `Requested by ${msg.author.username}` });

        await msg.reply({ embeds: [embed] }).catch(() => {});
    }
};