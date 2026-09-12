const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));
db.prepare(`
    CREATE TABLE IF NOT EXISTS saved_webhooks (
        guild_id TEXT,
        name TEXT,
        url TEXT,
        avatar TEXT,
        PRIMARY KEY (guild_id, name)
    )
`).run();

try {
    db.prepare('ALTER TABLE saved_webhooks ADD COLUMN avatar TEXT').run();
} catch {}

module.exports = {
    name: 'webhook',
    description: 'Manage and use saved webhooks across chats\n to set up an profile picture for the webhook, use a direct image link (e.g., https://example.com/image.png). or send the image in chat and copy the link.',
    usage: '',
    async execute(msg, args) {
        if (!msg.guild) return;
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
            return msg.reply('Missing permissions.');
        }

        const getPanel = () => {
            const hooks = db.prepare('SELECT name FROM saved_webhooks WHERE guild_id = ?').all(msg.guild.id);
            const list = hooks.length ? hooks.map(h => h.name).join(', ') : 'None';

            const eb = new EmbedBuilder()
                .setTitle('Webhook Manager')
                .setDescription(`Saved Webhooks:\n${list}`)
                .setColor(0x2b2d31);

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('wh_create').setLabel('Create & Save').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('wh_send').setLabel('Send Message').setStyle(ButtonStyle.Success).setDisabled(hooks.length === 0),
                new ButtonBuilder().setCustomId('wh_list').setLabel('List All').setStyle(ButtonStyle.Secondary).setDisabled(hooks.length === 0)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('wh_delete').setLabel('Delete Saved').setStyle(ButtonStyle.Danger).setDisabled(hooks.length === 0),
                new ButtonBuilder().setCustomId('wh_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );

            return { embeds: [eb], components: [row1, row2] };
        };

        const panelMsg = await msg.channel.send(getPanel());
        const collector = panelMsg.createMessageComponentCollector({ filter: i => i.user.id === msg.author.id, time: 300000 });

        collector.on('collect', async i => {
            if (i.customId === 'wh_cancel') {
                collector.stop();
                return i.update({ content: 'Cancelled.', embeds: [], components: [] });
            }

            if (i.customId === 'wh_list') {
                const hooks = db.prepare('SELECT name, avatar FROM saved_webhooks WHERE guild_id = ?').all(msg.guild.id);
                if (!hooks.length) return i.reply({ content: 'No saved webhooks.', flags: MessageFlags.Ephemeral });
                const content = hooks.map(h => `- **${h.name}** ${h.avatar ? '(Custom Avatar)' : ''}`).join('\n');
                return i.reply({ content: `Saved Webhooks:\n\n${content}`, flags: MessageFlags.Ephemeral });
            }

            if (i.customId === 'wh_create') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_wh_create_' + Date.now())
                    .setTitle('Create and Save Webhook')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('wh_name').setLabel('Webhook Alias Name').setStyle(TextInputStyle.Short).setRequired(true).setValue('Glep Webhook')
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('wh_avatar').setLabel('Avatar Image URL (Optional)').setStyle(TextInputStyle.Short).setRequired(false)
                        )
                    );

                await i.showModal(modal);

                let modalRes;
                try {
                    modalRes = await i.awaitModalSubmit({
                        filter: mi => mi.customId.startsWith('modal_wh_create_') && mi.user.id === msg.author.id,
                        time: 60000
                    });
                } catch {
                    return;
                }

                await modalRes.deferReply({ flags: MessageFlags.Ephemeral });

                const name = modalRes.fields.getTextInputValue('wh_name').trim();
                const avatar = modalRes.fields.getTextInputValue('wh_avatar').trim();

                let avatarBuffer = null;
                if (avatar) {
                    try {
                        const fetchRes = await fetch(avatar);
                        if (fetchRes.ok) avatarBuffer = Buffer.from(await fetchRes.arrayBuffer());
                    } catch {}
                }

                const createOpts = { name };
                if (avatarBuffer) createOpts.avatar = avatarBuffer;

                const hook = await msg.channel.createWebhook(createOpts).catch(() => null);
                if (!hook) return modalRes.editReply({ content: 'Failed to create webhook. Check the image URL.' });

                db.prepare('INSERT OR REPLACE INTO saved_webhooks (guild_id, name, url, avatar) VALUES (?, ?, ?, ?)').run(msg.guild.id, name, hook.url, avatar || null);

                await modalRes.editReply({ content: 'Webhook created and saved.' });
                await panelMsg.edit(getPanel());
            }

            if (i.customId === 'wh_send') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_wh_send_' + Date.now())
                    .setTitle('Send via Saved Webhook')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('wh_name').setLabel('Webhook Alias Name').setStyle(TextInputStyle.Short).setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('wh_text').setLabel('Message').setStyle(TextInputStyle.Paragraph).setRequired(true)
                        )
                    );

                await i.showModal(modal);

                try {
                    const modalRes = await i.awaitModalSubmit({
                        filter: mi => mi.customId.startsWith('modal_wh_send_') && mi.user.id === msg.author.id,
                        time: 60000
                    });

                    const name = modalRes.fields.getTextInputValue('wh_name').trim();
                    const text = modalRes.fields.getTextInputValue('wh_text').trim();

                    const record = db.prepare('SELECT url, avatar FROM saved_webhooks WHERE guild_id = ? AND name = ?').get(msg.guild.id, name);
                    if (!record) return modalRes.reply({ content: 'Webhook alias not found.', flags: MessageFlags.Ephemeral });

                    const payload = { content: text, username: name };
                    if (record.avatar) payload.avatar_url = record.avatar;

                    const res = await fetch(record.url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) return modalRes.reply({ content: 'Failed to send webhook message.', flags: MessageFlags.Ephemeral });

                    msg.delete().catch(() => {});
                    await modalRes.reply({ content: 'Message sent.', flags: MessageFlags.Ephemeral });
                } catch {}
            }

            if (i.customId === 'wh_delete') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_wh_del_' + Date.now())
                    .setTitle('Delete Saved Webhook')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId('wh_name').setLabel('Webhook Alias Name').setStyle(TextInputStyle.Short).setRequired(true)
                        )
                    );

                await i.showModal(modal);

                try {
                    const modalRes = await i.awaitModalSubmit({
                        filter: mi => mi.customId.startsWith('modal_wh_del_') && mi.user.id === msg.author.id,
                        time: 60000
                    });

                    const name = modalRes.fields.getTextInputValue('wh_name').trim();
                    const info = db.prepare('DELETE FROM saved_webhooks WHERE guild_id = ? AND name = ?').run(msg.guild.id, name);

                    if (info.changes === 0) return modalRes.reply({ content: 'Webhook alias not found.', flags: MessageFlags.Ephemeral });

                    await modalRes.reply({ content: 'Webhook deleted from storage.', flags: MessageFlags.Ephemeral });
                    await panelMsg.edit(getPanel());
                } catch {}
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') panelMsg.edit({ content: 'Timed out.', components: [] }).catch(() => {});
        });
    }
};