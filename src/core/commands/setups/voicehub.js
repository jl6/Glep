const { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'data.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_voice_hubs (
        guild_id TEXT PRIMARY KEY,
        hub_channel_id TEXT,
        dashboard_channel_id TEXT,
        category_id TEXT
    );
    CREATE TABLE IF NOT EXISTS temp_voice_channels (
        channel_id TEXT PRIMARY KEY,
        owner_id TEXT,
        guild_id TEXT
    );
`);

module.exports = {
    name: 'vhub',
    description: 'Builds a dynamic voice hub with a control dashboard',
    usage: '[off]',
    selfClean: 9000,

    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return msg.reply('Missing Administrator permissions.');
        }

        const action = args[0]?.toLowerCase();

        if (action === 'disable' || action === 'off') {
            const row = db.prepare('SELECT * FROM guild_voice_hubs WHERE guild_id = ?').get(msg.guild.id);
            if (!row) return msg.reply('Voice hub is not configured.');

            if (row.category_id) {
                const cat = await msg.guild.channels.fetch(row.category_id).catch(() => null);
                if (cat) {
                    const children = msg.guild.channels.cache.filter(c => c.parentId === cat.id);
                    for (const [id, child] of children) {
                        await child.delete().catch(() => {});
                        db.prepare('DELETE FROM temp_voice_channels WHERE channel_id = ?').run(id);
                    }
                    await cat.delete().catch(() => {});
                }
            }

            if (row.hub_channel_id) {
                const hub = await msg.guild.channels.fetch(row.hub_channel_id).catch(() => null);
                if (hub) await hub.delete().catch(() => {});
            }

            if (row.dashboard_channel_id) {
                const dash = await msg.guild.channels.fetch(row.dashboard_channel_id).catch(() => null);
                if (dash) await dash.delete().catch(() => {});
            }

            db.prepare('DELETE FROM guild_voice_hubs WHERE guild_id = ?').run(msg.guild.id);
            return msg.reply('Voice hub disabled.');
        }

        const existing = db.prepare('SELECT * FROM guild_voice_hubs WHERE guild_id = ?').get(msg.guild.id);
        if (existing) {
            const embed = new EmbedBuilder()
                .setTitle('Voice Hub Config')
                .setDescription('Voice hub is already active. Use the button below to remove it.')
                .setColor(0x2b2d31);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('vhub_disable')
                    .setLabel('Disable Hub')
                    .setStyle(ButtonStyle.Danger)
            );

            return msg.reply({ embeds: [embed], components: [row] });
        }

        const statusMsg = msg.reply('Setting up voice hub...');

        try {
            const cat = await msg.guild.channels.create({
                name: 'Voice Channels',
                type: ChannelType.GuildCategory
            });

            const hub = await msg.guild.channels.create({
                name: 'Join to Create',
                type: ChannelType.GuildVoice,
                parent: cat.id
            });

            const dash = await msg.guild.channels.create({
                name: 'dashboard',
                type: ChannelType.GuildText,
                parent: cat.id,
                permissionOverwrites: [
                    {
                        id: msg.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.SendMessages]
                    }
                ]
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('room_lock').setLabel('Lock').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('room_unlock').setLabel('Unlock').setStyle(ButtonStyle.Secondary)
            );

            await dash.send({
                content: 'Use these buttons while inside your temporary voice channel to manage access.',
                components: [row]
            });

            db.prepare(`
                INSERT INTO guild_voice_hubs (guild_id, hub_channel_id, dashboard_channel_id, category_id)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(guild_id) DO UPDATE SET hub_channel_id = ?, dashboard_channel_id = ?, category_id = ?
            `).run(msg.guild.id, hub.id, dash.id, cat.id, hub.id, dash.id, cat.id);

            const resolved = await statusMsg;
            await resolved.edit(`Voice hub created successfully.\nHub: ${hub}\nDashboard: ${dash}`);
        } catch (err) {
            console.error('Failed to create voice hub:', err);
            const resolved = await statusMsg;
            await resolved.edit('Failed to create voice hub due to missing permissions or API error.');
        }
    }
};