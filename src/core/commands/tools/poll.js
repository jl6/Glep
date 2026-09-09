const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    name: 'poll',
    description: 'Create an interactive poll via modal',
    usage: '',

    async execute(msg, args) {
        if (!msg.guild) return;
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return msg.reply('Missing permissions.');
        }

        const embed = new EmbedBuilder()
            .setTitle('Create Poll')
            .setDescription('Click the button below to open the poll creation form.')
            .setColor(0x2b2d31);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_create_poll')
                .setLabel('Create Poll')
                .setStyle(ButtonStyle.Primary)
        );

        const promptMsg = await msg.channel.send({ embeds: [embed], components: [row] });
        const filter = i => i.user.id === msg.author.id;
        const collector = promptMsg.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'btn_create_poll') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_poll')
                    .setTitle('Create Poll');

                const qInput = new TextInputBuilder()
                    .setCustomId('poll_question')
                    .setLabel('Poll Question')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const o1Input = new TextInputBuilder()
                    .setCustomId('poll_opt1')
                    .setLabel('Option 1')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const o2Input = new TextInputBuilder()
                    .setCustomId('poll_opt2')
                    .setLabel('Option 2')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const o3Input = new TextInputBuilder()
                    .setCustomId('poll_opt3')
                    .setLabel('Option 3 (Optional)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                const o4Input = new TextInputBuilder()
                    .setCustomId('poll_opt4')
                    .setLabel('Option 4 (Optional)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(qInput),
                    new ActionRowBuilder().addComponents(o1Input),
                    new ActionRowBuilder().addComponents(o2Input),
                    new ActionRowBuilder().addComponents(o3Input),
                    new ActionRowBuilder().addComponents(o4Input)
                );

                await i.showModal(modal);

                try {
                    const modalRes = await i.awaitModalSubmit({
                        filter: mi => mi.customId === 'modal_poll' && mi.user.id === msg.author.id,
                        time: 60000
                    });

                    const question = modalRes.fields.getTextInputValue('poll_question').trim();
                    const rawOpts = [
                        modalRes.fields.getTextInputValue('poll_opt1'),
                        modalRes.fields.getTextInputValue('poll_opt2'),
                        modalRes.fields.getTextInputValue('poll_opt3'),
                        modalRes.fields.getTextInputValue('poll_opt4')
                    ];

                    const options = rawOpts.map(o => o?.trim()).filter(Boolean);
                    const votes = new Map();
                    options.forEach((_, idx) => votes.set(idx, new Set()));

                    const pollEmbed = new EmbedBuilder()
                        .setTitle('Poll: ' + question)
                        .setDescription(options.map((opt, idx) => `[${idx + 1}] ${opt} - 0 votes`).join('\n\n'))
                        .setColor(0x2b2d31)
                        .setTimestamp();

                    const pollRow = new ActionRowBuilder().addComponents(
                        options.map((_, idx) => 
                            new ButtonBuilder()
                                .setCustomId(`poll_vote_${idx}`)
                                .setLabel(`${idx + 1}`)
                                .setStyle(ButtonStyle.Secondary)
                        )
                    );

                    await modalRes.reply({ content: 'Poll created.', flags: MessageFlags.Ephemeral });
                    await promptMsg.delete().catch(() => {});
                    
                    const pollMsg = await msg.channel.send({ embeds: [pollEmbed], components: [pollRow] });
                    const voteCollector = pollMsg.createMessageComponentCollector({ time: 604800000 });

                    voteCollector.on('collect', async vi => {
                        const idx = parseInt(vi.customId.split('_')[2]);

                        for (const [optIdx, voters] of votes.entries()) {
                            if (voters.has(vi.user.id) && optIdx !== idx) {
                                voters.delete(vi.user.id);
                            }
                        }

                        const userVotes = votes.get(idx);
                        if (userVotes.has(vi.user.id)) {
                            userVotes.delete(vi.user.id);
                        } else {
                            userVotes.add(vi.user.id);
                        }

                        const updatedEmbed = new EmbedBuilder()
                            .setTitle('Poll: ' + question)
                            .setDescription(options.map((opt, iIndex) => `[${iIndex + 1}] ${opt} - ${votes.get(iIndex).size} votes`).join('\n\n'))
                            .setColor(0x2b2d31)
                            .setTimestamp();

                        await vi.update({ embeds: [updatedEmbed] });
                    });
                } catch (err) {}
            }
        });

        collector.on('end', () => {
            promptMsg.edit({ components: [] }).catch(() => {});
        });
    }
};