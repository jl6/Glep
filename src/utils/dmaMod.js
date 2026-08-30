const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

async function initializeDmaModSession(src, guild, client) {
    const user = src.author || src.user;
    const uid = user.id;

    const row = db.prepare('SELECT category_id, is_enabled FROM guild_settings WHERE guild_id = ?').get(guild.id);
    if (!row || row.is_enabled !== 1 || !row.category_id) {
        const msg = 'System is disabled or unconfigured.';
        return src.replied || src.deferred ? src.followUp(msg) : src.reply(msg);
    }

    const cat = guild.channels.cache.get(row.category_id);
    if (!cat) {
        const msg = 'Category not found.';
        return src.replied || src.deferred ? src.followUp(msg) : src.reply(msg);
    }

    const cleanName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ticket = await guild.channels.create({
        name: `dmamod-${cleanName}`,
        type: ChannelType.GuildText,
        parent: cat.id,
        permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
        ],
        reason: `Session opened by ${user.tag}`
    });

    client.activeDmaMod.set(uid, ticket.id);
    client.activeDmaThreads.set(ticket.id, uid);

    const closeBtn = new ButtonBuilder()
        .setCustomId('dmamod_close_channel')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger);

    await ticket.send({
        content: `Ticket from **${user.tag}** (${uid})`,
        components: [new ActionRowBuilder().addComponents(closeBtn)]
    });

    let content = src.content || '';
    if (!content && client.pendingDmaModContent?.has(uid)) {
        const pending = client.pendingDmaModContent.get(uid);
        content = pending.content;
        if (pending.attachments?.length) {
            content += `\n${pending.attachments.join('\n')}`;
        }
        client.pendingDmaModContent.delete(uid);
    }

    if (src.attachments?.size > 0) {
        const links = src.attachments.map(a => a.url).join('\n');
        content += `\n${links}`;
    }

    if (content.trim()) {
        await ticket.send(`**${user.tag}**: ${content}`);
    }

    if (typeof src.isStringSelectMenu === 'function' && src.isStringSelectMenu()) {
        await src.update({ content: 'Session started.', components: [] });
    } else {
        await src.reply('Message sent to staff.');
    }
}

async function handleToggleOn(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'Missing permissions.', ephemeral: true });
    }

    const guild = interaction.guild;
    const cat = await guild.channels.create({
        name: 'DM Support',
        type: ChannelType.GuildCategory,
        reason: 'DM system enabled'
    });

    db.prepare(`
        INSERT INTO guild_settings (guild_id, category_id, is_enabled)
        VALUES (?, ?, 1)
        ON CONFLICT(guild_id) DO UPDATE SET category_id = excluded.category_id, is_enabled = 1
    `).run(guild.id, cat.id);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dmamod_toggle_on').setLabel('Turn On').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('dmamod_toggle_off').setLabel('Turn Off').setStyle(ButtonStyle.Danger).setDisabled(false)
    );

    return interaction.update({ content: 'DM System Status: Enabled', components: [row] });
}

async function handleToggleOff(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'Missing permissions.', ephemeral: true });
    }

    const guild = interaction.guild;
    const row = db.prepare('SELECT category_id FROM guild_settings WHERE guild_id = ?').get(guild.id);

    if (row?.category_id) {
        const cat = guild.channels.cache.get(row.category_id);
        if (cat) {
            for (const [, child] of cat.children.cache) {
                await child.delete().catch(() => {});
            }
            await cat.delete().catch(() => {});
        }
    }

    db.prepare('DELETE FROM guild_settings WHERE guild_id = ?').run(guild.id);

    const comps = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dmamod_toggle_on').setLabel('Turn On').setStyle(ButtonStyle.Success).setDisabled(false),
        new ButtonBuilder().setCustomId('dmamod_toggle_off').setLabel('Turn Off').setStyle(ButtonStyle.Danger).setDisabled(true)
    );

    return interaction.update({ content: 'DM System Status: Disabled', components: [comps] });
}

async function handleCloseChannel(interaction, client) {
    const ch = interaction.channel;
    const uid = client.activeDmaThreads.get(ch.id);

    if (uid) {
        client.activeDmaMod.delete(uid);
        client.activeDmaThreads.delete(ch.id);
        const user = await client.users.fetch(uid).catch(() => null);
        if (user) {
            await user.send('Conversation closed by staff.').catch(() => {});
        }
    }

    await interaction.reply('Closing channel...');
    await ch.delete().catch(() => {});
}

module.exports = {
    initializeDmaModSession,
    handleToggleOn,
    handleToggleOff,
    handleCloseChannel
};