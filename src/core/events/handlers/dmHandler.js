const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const path = require('path');
const { initializeDmaModSession } = require(path.join(process.cwd(), 'src/utils/dmaMod'));

module.exports = {
    name: 'messageCreate',
    async execute(msg, client) {
        if (msg.author.bot || msg.guild) return;

        if (!client.activeDmaMod) client.activeDmaMod = new Map();
        if (!client.activeDmaThreads) client.activeDmaThreads = new Map();

        const uid = msg.author.id;
        const activeCh = client.activeDmaMod.get(uid);

        if (activeCh) {
            const ch = await client.channels.fetch(activeCh).catch(() => null);
            if (ch?.isTextBased()) {
                let text = msg.content;
                if (msg.attachments.size > 0) {
                    const links = msg.attachments.map(a => a.url).join('\n');
                    text += `\n${links}`;
                }
                await ch.send(`**${msg.author.tag}**: ${text}`);
                return;
            } else {
                client.activeDmaMod.delete(uid);
                client.activeDmaThreads.delete(activeCh);
            }
        }

        const mutual = [];
        for (const [gid, guild] of client.guilds.cache) {
            const member = await guild.members.fetch(uid).catch(() => null);
            if (member) mutual.push(guild);
        }

        if (mutual.length === 0) {
            return msg.reply('No shared servers found.');
        }

        if (mutual.length === 1) {
            return initializeDmaModSession(msg, mutual[0], client);
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId('dmamod_select_guild')
            .setPlaceholder('Select a server')
            .addOptions(
                mutual.map(g => ({
                    label: g.name.substring(0, 100),
                    value: g.id
                }))
            );

        const row = new ActionRowBuilder().addComponents(menu);

        client.pendingDmaModContent = client.pendingDmaModContent || new Map();
        client.pendingDmaModContent.set(uid, {
            content: msg.content,
            attachments: msg.attachments.map(a => a.url)
        });

        await msg.reply({
            content: 'Select a server to contact staff:',
            components: [row]
        });
    }
};