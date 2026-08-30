const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));
const PAGE_SIZE = 8;

module.exports = {
    name: 'tracked',
    description: 'Lists all tracked characters',
    usage: '',
    selfClean: 15000,
    specialOnly: true,

    async execute(msg) {
        try {
            const records = db.prepare('SELECT hash, current_name, updated_at FROM tracked_characters ORDER BY updated_at DESC').all();

            if (!records.length) return msg.reply('No character hashes are currently being tracked.');

            const totalPages = Math.ceil(records.length / PAGE_SIZE);
            let page = 0;

            const buildEmbed = (p) => {
                const start = p * PAGE_SIZE;
                const items = records.slice(start, start + PAGE_SIZE);

                const embed = new EmbedBuilder()
                    .setTitle(`Tracked Characters (${records.length} Total)`)
                    .setColor(0x5865f2)
                    .setFooter({ text: `Page ${p + 1} of ${totalPages}` });

                const desc = items.map((row, idx) => 
                    `${start + idx + 1}. ${row.current_name}\nHash: ${row.hash}`
                ).join('\n\n');

                return embed.setDescription(desc);
            };

            const buildButtons = (p) => new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(p === totalPages - 1)
            );

            const reply = await msg.reply({
                embeds: [buildEmbed(page)],
                components: totalPages > 1 ? [buildButtons(page)] : []
            });

            if (totalPages <= 1) return;

            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 120000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== msg.author.id) {
                    return i.reply({ content: 'Not your menu.', ephemeral: true });
                }

                if (i.customId === 'prev_page' && page > 0) page--;
                else if (i.customId === 'next_page' && page < totalPages - 1) page++;

                await i.update({
                    embeds: [buildEmbed(page)],
                    components: [buildButtons(page)]
                });
            });

            collector.on('end', () => {
                const disabled = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('prev_page').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next_page').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                reply.edit({ components: [disabled] }).catch(() => {});
            });

        } catch (err) {
            console.error('Tracked command error:', err.message);
            return msg.reply(`Failed to retrieve records: ${err.message}`);
        }
    }
};