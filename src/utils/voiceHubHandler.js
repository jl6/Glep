const Database = require('better-sqlite3');
const path = require('path');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

async function cleanupHub(guild) {
    const row = db.prepare('SELECT * FROM guild_voice_hubs WHERE guild_id = ?').get(guild.id);
    if (!row) return false;

    if (row.category_id) {
        const cat = await guild.channels.fetch(row.category_id).catch(() => null);
        if (cat) {
            const children = guild.channels.cache.filter(c => c.parentId === cat.id);
            for (const [id, child] of children) {
                await child.delete().catch(() => {});
                db.prepare('DELETE FROM temp_voice_channels WHERE channel_id = ?').run(id);
            }
            await cat.delete().catch(() => {});
        }
    }

    if (row.hub_channel_id) {
        const hub = await guild.channels.fetch(row.hub_channel_id).catch(() => null);
        if (hub) await hub.delete().catch(() => {});
    }

    if (row.dashboard_channel_id) {
        const dash = await guild.channels.fetch(row.dashboard_channel_id).catch(() => null);
        if (dash) await dash.delete().catch(() => {});
    }

    db.prepare('DELETE FROM guild_voice_hubs WHERE guild_id = ?').run(guild.id);
    return true;
}

async function handleVoiceHubInteraction(i) {
    if (!i.isButton()) return false;

    if (i.customId === 'vhub_disable') {
        await cleanupHub(i.guild);
        await i.update({
            content: 'Voice hub disabled.',
            embeds: [],
            components: []
        });
        return true;
    }

    if (i.customId !== 'room_lock' && i.customId !== 'room_unlock') return false;

    const member = i.member;
    const chan = member?.voice?.channel;

    if (!chan) {
        await i.reply({ content: 'Join your voice channel first.', flags: [MessageFlags.Ephemeral] });
        return true;
    }

    const temp = db.prepare('SELECT * FROM temp_voice_channels WHERE channel_id = ?').get(chan.id);
    if (!temp || temp.owner_id !== member.id) {
        await i.reply({ content: 'You do not own this voice channel.', flags: [MessageFlags.Ephemeral] });
        return true;
    }

    if (i.customId === 'room_lock') {
        await chan.permissionOverwrites.edit(i.guild.roles.everyone, {
            [PermissionFlagsBits.Connect]: false
        });
        await i.reply({ content: 'Channel locked.', flags: [MessageFlags.Ephemeral] });
        return true;
    }

    if (i.customId === 'room_unlock') {
        await chan.permissionOverwrites.edit(i.guild.roles.everyone, {
            [PermissionFlagsBits.Connect]: null
        });
        await i.reply({ content: 'Channel unlocked.', flags: [MessageFlags.Ephemeral] });
        return true;
    }

    return false;
}

module.exports = { handleVoiceHubInteraction };