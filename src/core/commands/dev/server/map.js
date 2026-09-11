const { EmbedBuilder, PermissionFlagsBits, AttachmentBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: 'map',
    description: 'Generates a text layout of server channels.',
    usage: '[server_id]',
    devOnly: true,
    
    async execute(msg, args, client, db) {
        let guild = msg.guild;
        let isDev = false;

        if (args[0]) {
            guild = client.guilds.cache.get(args[0]) || await client.guilds.fetch(args[0]).catch(() => null);
            if (!guild) {
                return await msg.reply('Server not found.');
            }
            isDev = true;
        } else {
            if (!msg.guild) {
                return await msg.reply('This command must be used in a server or with a server ID.');
            }
            if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return await msg.reply('Missing permissions: Manage Channels required.');
            }
        }

        try {
            const channels = await guild.channels.fetch();
            const categories = channels.filter(c => c?.type === ChannelType.GuildCategory).sort((a, b) => a.position - b.position);
            const uncategorized = channels.filter(c => c && !c.parentId && c.type !== ChannelType.GuildCategory).sort((a, b) => a.position - b.position);

            let mapText = `LAYOUT: ${guild.name}\n`;
            mapText += `ID: ${guild.id}\n`;
            mapText += `${'='.repeat(40)}\n\n`;

            const getTypeName = (type) => {
                switch (type) {
                    case ChannelType.GuildText: return '[Text] ';
                    case ChannelType.GuildVoice: return '[Voice] ';
                    case ChannelType.GuildAnnouncement: return '[Announcement] ';
                    case ChannelType.GuildForum: return '[Forum] ';
                    case ChannelType.GuildStageVoice: return '[Stage] ';
                    default: return '[Channel] ';
                }
            };

            uncategorized.forEach(ch => {
                mapText += `${getTypeName(ch.type)}${ch.name}\n`;
            });

            if (uncategorized.size > 0 && categories.size > 0) mapText += '\n';

            categories.forEach(cat => {
                mapText += `[Category] ${cat.name}\n`;
                const children = channels.filter(c => c?.parentId === cat.id).sort((a, b) => a.position - b.position);
                let index = 0;

                children.forEach(ch => {
                    const isLast = index === children.size - 1;
                    const prefix = isLast ? '└── ' : '├── ';
                    mapText += `${prefix}${getTypeName(ch.type)}${ch.name}\n`;
                    index++;
                });

                mapText += '\n';
            });

            if (mapText.length > 3900) {
                const buffer = Buffer.from(mapText, 'utf-8');
                const file = new AttachmentBuilder(buffer, { name: `map_${guild.id}.txt` });
                return await msg.reply({
                    content: `Server layout for **${guild.name}** is too large for an embed. Attached file generated:`,
                    files: [file]
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`Server Layout: ${guild.name}`)
                .setDescription(`\`\`\`text\n${mapText}\n\`\`\``)
                .setColor(0x2f3136)
                .setTimestamp();

            await msg.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            await msg.reply('Failed to generate server map.');
        }
    }
};