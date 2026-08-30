const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'addemoji',
    description: 'Inspects and adds custom emojis to the server',
    usage: 'addemoji <emoji>',
    category: 'tools',
    selfClean: 15000,
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            return msg.reply('Missing permissions.');
        }

        const input = args[0];
        if (!input) return msg.reply('Provide a custom emoji.');

        const match = input.match(/<(a?):(.+?):(\d+)>/);
        if (!match) return msg.reply('Could not parse custom emoji.');

        const isAnimated = match[1] === 'a';
        const name = match[2];
        const id = match[3];
        const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}?size=1024`;

        const embed = new EmbedBuilder()
            .setTitle('Emoji Info')
            .setDescription(`Name: ${name}\nID: ${id}\nType: ${isAnimated ? 'Animated' : 'Static'}`)
            .setImage(url)
            .setColor(0x5865f2);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('add_emoji_btn')
                .setLabel('Add to Server')
                .setStyle(ButtonStyle.Success)
        );

        const reply = await msg.reply({ embeds: [embed], components: [row] });
        const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async (i) => {
            if (!i.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
                return i.reply({ content: 'Missing permissions.', ephemeral: true });
            }

            if (i.user.id !== msg.author.id) {
                return i.reply({ content: 'You cannot use this button.', ephemeral: true });
            }

            try {
                await i.update({ components: [] });

                let sanitized = name.replace(/[- ]/g, '_').replace(/[^a-zA-Z0-9_]/g, '').trim();
                if (sanitized.length < 2) sanitized = `emoji_${Math.floor(Math.random() * 999)}`;
                if (sanitized.length > 32) sanitized = sanitized.substring(0, 32);

                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch image.');

                const buffer = Buffer.from(await res.arrayBuffer());
                const created = await i.guild.emojis.create({ attachment: buffer, name: sanitized });

                await i.editReply({
                    content: `Added emoji ${created} as ${sanitized}.`,
                    embeds: [],
                    components: []
                });
            } catch (err) {
                const text = err.code === 30008 ? 'Server emoji limit reached.' : `Failed to add emoji: ${err.message}`;
                return i.followUp({ content: text, ephemeral: true });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                const disabled = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(row.components[0]).setDisabled(true)
                );
                reply.edit({ components: [disabled] }).catch(() => {});
            }
        });
    }
};