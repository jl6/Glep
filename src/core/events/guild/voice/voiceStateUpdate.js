const Database = require('better-sqlite3');
const path = require('path');
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const guildId = newState.guild.id;
        const config = db.prepare('SELECT * FROM guild_voice_hubs WHERE guild_id = ?').get(guildId);
        if (!config) return;

        if (newState.channelId === config.hub_channel_id && oldState.channelId !== config.hub_channel_id) {
            const member = newState.member;
            const category = newState.guild.channels.cache.get(config.category_id);

            try {
                const tempChannel = await newState.guild.channels.create({
                    name: `Room: ${member.user.username}`,
                    type: ChannelType.GuildVoice,
                    parent: category?.id,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers]
                        }
                    ]
                });

                await member.voice.setChannel(tempChannel);

                db.prepare('INSERT INTO temp_voice_channels (channel_id, owner_id, guild_id) VALUES (?, ?, ?)').run(
                    tempChannel.id,
                    member.id,
                    guildId
                );
            } catch (err) {
                console.error('Failed to create temp voice room:', err);
            }
        }

        if (oldState.channelId && oldState.channelId !== config.hub_channel_id) {
            const tempRow = db.prepare('SELECT * FROM temp_voice_channels WHERE channel_id = ?').get(oldState.channelId);
            if (tempRow) {
                const channel = oldState.guild.channels.cache.get(oldState.channelId);
                if (channel && channel.members.size === 0) {
                    await channel.delete().catch(() => {});
                    db.prepare('DELETE FROM temp_voice_channels WHERE channel_id = ?').run(oldState.channelId);
                }
            }
        }
    }
};