const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    name: 'embed',
    description: 'Create single or batch embeds via modal',
    usage: '',

    async execute(msg, args) {
        if (!msg.guild) return;
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return msg.reply('Missing permissions.');
        }

        const queue = [];

        const getPanelEmbed = () => new EmbedBuilder()
            .setTitle('Embed Builder')
            .setDescription(`Queued embeds: ${queue.length}/10\n\nClick Add Embed to queue another, or Send Batch to post all queued embeds together.`)
            .setColor(0x2b2d31);

        const getPanelRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_add_embed')
                .setLabel('Add Embed')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('btn_send_batch')
                .setLabel(`Send Batch (${queue.length})`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(queue.length === 0),
            new ButtonBuilder()
                .setCustomId('btn_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
        );

        const promptMsg = await msg.channel.send({ embeds: [getPanelEmbed()], components: [getPanelRow()] });
        const filter = i => i.user.id === msg.author.id;
        const collector = promptMsg.createMessageComponentCollector({ filter, time: 300000 });

        collector.on('collect', async i => {
            if (i.customId === 'btn_cancel') {
                collector.stop();
                return i.update({ content: 'Cancelled.', embeds: [], components: [] });
            }

            if (i.customId === 'btn_add_embed') {
                if (queue.length >= 10) {
                    return i.reply({ content: 'Maximum 10 embeds per batch.', flags: MessageFlags.Ephemeral });
                }

                const modal = new ModalBuilder()
                    .setCustomId('modal_embed_' + Date.now())
                    .setTitle(`Add Embed (${queue.length + 1}/10)`);

                const titleInput = new TextInputBuilder()
                    .setCustomId('embed_title')
                    .setLabel('Title (Optional)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                const descInput = new TextInputBuilder()
                    .setCustomId('embed_desc')
                    .setLabel('Description')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(titleInput),
                    new ActionRowBuilder().addComponents(descInput)
                );

                await i.showModal(modal);

                try {
                    const modalRes = await i.awaitModalSubmit({
                        filter: mi => mi.customId.startsWith('modal_embed_') && mi.user.id === msg.author.id,
                        time: 60000
                    });

                    const title = modalRes.fields.getTextInputValue('embed_title').trim();
                    const description = modalRes.fields.getTextInputValue('embed_desc').trim();
                    const randomColor = Math.floor(Math.random() * 16777215);

                    const eb = new EmbedBuilder()
                        .setDescription(description)
                        .setColor(randomColor);

                    if (title) eb.setTitle(title);

                    queue.push(eb);

                    await modalRes.reply({ content: 'Embed added to queue.', flags: MessageFlags.Ephemeral });
                    await promptMsg.edit({ embeds: [getPanelEmbed()], components: [getPanelRow()] });
                } catch (err) {}
            }

            if (i.customId === 'btn_send_batch') {
                if (queue.length === 0) {
                    return i.reply({ content: 'Queue is empty.', flags: MessageFlags.Ephemeral });
                }

                collector.stop();
                await promptMsg.delete().catch(() => {});
                await msg.channel.send({ embeds: queue });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                promptMsg.edit({ content: 'Timed out.', components: [] }).catch(() => {});
            }
        });
    }
};