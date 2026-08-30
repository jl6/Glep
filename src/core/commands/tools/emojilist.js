const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'emojilist',
    description: 'Shows all custom emoji names and IDs',
    usage: 'emojilist',
    selfClean: false,
    async execute(msg, args) {
        const emojis = Array.from(msg.guild.emojis.cache.values());
        if (!emojis.length) return msg.reply('No custom emojis found.');

        let page = 0;
        const limit = 10;
        const totalPages = Math.ceil(emojis.length / limit);

        const makeEmbed = (p) => {
            const chunk = emojis.slice(p * limit, (p + 1) * limit);
            const text = chunk.map(e => {
                const tag = e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`;
                return `${tag} **${e.name}**\nCode: \`${tag}\``;
            }).join('\n\n');

            return new EmbedBuilder()
                .setTitle(`Server Emojis: ${msg.guild.name}`)
                .setColor(0x5865f2)
                .setDescription(text);
        };

        const makeRow = (p, disabled = false) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('emoji_prev')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled || p === 0),
                new ButtonBuilder()
                    .setCustomId('emoji_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled || p === totalPages - 1)
            );
        };

        const reply = await msg.reply({
            embeds: [makeEmbed(page)],
            components: totalPages > 1 ? [makeRow(page)] : []
        });

        if (totalPages === 1) return;

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== msg.author.id) {
                return i.reply({ content: 'You cannot use this menu.', ephemeral: true });
            }

            if (i.customId === 'emoji_prev' && page > 0) page--;
            if (i.customId === 'emoji_next' && page < totalPages - 1) page++;

            await i.update({
                embeds: [makeEmbed(page)],
                components: [makeRow(page)]
            });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                reply.edit({ components: [makeRow(page, true)] }).catch(() => {});
            }
        });
    }
};