const path = require('path');
const Database = require('better-sqlite3');
const { 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    MessageFlags 
} = require('discord.js');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_autorespond (
        guild_id TEXT,
        trigger TEXT,
        response TEXT,
        PRIMARY KEY (guild_id, trigger)
    );
`);

module.exports = {
    name: 'autorespond',
    description: 'Manage auto responses via interactive panel',
    usage: '',

    async execute(msg, args) {
        if (!msg.guild) return;
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return msg.reply('Missing permissions.');
        }

        const embed = new EmbedBuilder()
            .setTitle('Auto Response Management')
            .setDescription('Use buttons below to add, edit, remove, or view triggers.')
            .setColor(0x2b2d31)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ar_add').setLabel('Add').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ar_edit').setLabel('Edit').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ar_remove').setLabel('Remove').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('ar_list').setLabel('List').setStyle(ButtonStyle.Secondary)
        );

        const panel = await msg.channel.send({ embeds: [embed], components: [row] });
        const filter = i => i.user.id === msg.author.id;
        const collector = panel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'ar_add') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_ar_add')
                    .setTitle('Add Auto Response');

                const tInput = new TextInputBuilder()
                    .setCustomId('ar_trigger')
                    .setLabel('Trigger Word')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const rInput = new TextInputBuilder()
                    .setCustomId('ar_response')
                    .setLabel('Bot Response')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(tInput),
                    new ActionRowBuilder().addComponents(rInput)
                );

                await i.showModal(modal);

                try {
                    const modalRes = await i.awaitModalSubmit({
                        filter: mi => mi.customId === 'modal_ar_add' && mi.user.id === msg.author.id,
                        time: 30000
                    });

                    const trigger = modalRes.fields.getTextInputValue('ar_trigger').toLowerCase().trim();
                    const response = modalRes.fields.getTextInputValue('ar_response').trim();

                    db.prepare('INSERT OR REPLACE INTO guild_autorespond (guild_id, trigger, response) VALUES (?, ?, ?)').run(msg.guild.id, trigger, response);
                    await modalRes.reply({ content: `Auto response set for ${trigger}.`, flags: MessageFlags.Ephemeral });
                } catch (err) {}
            } else if (i.customId === 'ar_edit') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_ar_edit')
                    .setTitle('Edit Auto Response');

                const tInput = new TextInputBuilder()
                    .setCustomId('ar_trigger_edit')
                    .setLabel('Existing Trigger Word')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const rInput = new TextInputBuilder()
                    .setCustomId('ar_response_edit')
                    .setLabel('New Bot Response')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(tInput),
                    new ActionRowBuilder().addComponents(rInput)
                );

                await i.showModal(modal);

                try {
                    const modalRes = await i.awaitModalSubmit({
                        filter: mi => mi.customId === 'modal_ar_edit' && mi.user.id === msg.author.id,
                        time: 30000
                    });

                    const trigger = modalRes.fields.getTextInputValue('ar_trigger_edit').toLowerCase().trim();
                    const response = modalRes.fields.getTextInputValue('ar_response_edit').trim();

                    const check = db.prepare('SELECT trigger FROM guild_autorespond WHERE guild_id = ? AND trigger = ?').get(msg.guild.id, trigger);
                    if (!check) {
                        await modalRes.reply({ content: 'Trigger not found.', flags: MessageFlags.Ephemeral });
                    } else {
                        db.prepare('UPDATE guild_autorespond SET response = ? WHERE guild_id = ? AND trigger = ?').run(response, msg.guild.id, trigger);
                        await modalRes.reply({ content: `Auto response for ${trigger} updated.`, flags: MessageFlags.Ephemeral });
                    }
                } catch (err) {}
            } else if (i.customId === 'ar_remove') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_ar_remove')
                    .setTitle('Remove Auto Response');

                const tInput = new TextInputBuilder()
                    .setCustomId('ar_trigger_rem')
                    .setLabel('Trigger Word')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(tInput));
                await i.showModal(modal);

                try {
                    const modalRes = await i.awaitModalSubmit({
                        filter: mi => mi.customId === 'modal_ar_remove' && mi.user.id === msg.author.id,
                        time: 30000
                    });

                    const trigger = modalRes.fields.getTextInputValue('ar_trigger_rem').toLowerCase().trim();
                    const res = db.prepare('DELETE FROM guild_autorespond WHERE guild_id = ? AND trigger = ?').run(msg.guild.id, trigger);

                    const replyText = res.changes > 0 ? `Auto response for ${trigger} removed.` : 'Trigger not found.';
                    await modalRes.reply({ content: replyText, flags: MessageFlags.Ephemeral });
                } catch (err) {}
            } else if (i.customId === 'ar_list') {
                const rows = db.prepare('SELECT trigger, response FROM guild_autorespond WHERE guild_id = ?').all(msg.guild.id);
                if (!rows.length) {
                    return i.reply({ content: 'No auto responses configured.', flags: MessageFlags.Ephemeral });
                }
                const list = rows.map(r => `**${r.trigger}** -> ${r.response}`).join('\n');
                const listEmbed = new EmbedBuilder()
                    .setTitle('Configured Auto Responses')
                    .setDescription(list)
                    .setColor(0x2b2d31)
                    .setTimestamp();
                await i.reply({ embeds: [listEmbed], flags: MessageFlags.Ephemeral });
            }
        });

        collector.on('end', () => panel.edit({ components: [] }).catch(() => {}));
    }
};