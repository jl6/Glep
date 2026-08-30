const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'clone',
    description: 'Duplicates the current channel.',
    selfClean: 9000,
    
    async execute(msg, args, client, db) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return msg.reply('Missing permissions: Manage Channels required.');
        }

        const ch = msg.channel;

        try {
            const cloneCh = await ch.clone({
                reason: `Cloned by ${msg.author.tag}`
            });

            if (ch.parent) {
                await cloneCh.setParent(ch.parent, { lockPermissions: false });
            }

            await cloneCh.setPosition(ch.position);

            const embed = new EmbedBuilder()
                .setTitle('Channel Cloned')
                .setDescription('This channel has been duplicated with original permissions and settings.')
                .setColor(0x2f3136)
                .addFields(
                    { name: 'Original', value: `<#${ch.id}>`, inline: true },
                    { name: 'Clone', value: `${cloneCh}`, inline: true }
                )
                .setTimestamp();

            await cloneCh.send({ embeds: [embed] });
            await msg.reply(`Channel cloned: ${cloneCh}`);
        } catch (err) {
            console.error(err);
            await msg.reply('Failed to clone channel.');
        }
    }
};