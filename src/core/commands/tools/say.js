const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'say',
    description: 'Repeats text or sends an embed.',
    usage:'your messge | embed then your message',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        if (!args.length) return msg.reply('Missing message content.');

        let ch = msg.channel;
        let isEmbed = false;

        const firstArg = args[0]?.replace(/[<#>]/g, '');
        const maybeCh = msg.guild.channels.cache.get(firstArg);
        if (maybeCh) {
            ch = maybeCh;
            args.shift();
        }

        if (args[0]?.toLowerCase() === 'embed') {
            isEmbed = true;
            args.shift();
        }

        if (!maybeCh) {
            const nextArg = args[0]?.replace(/[<#>]/g, '');
            const maybeCh2 = msg.guild.channels.cache.get(nextArg);
            if (maybeCh2) {
                ch = maybeCh2;
                args.shift();
            }
        }

        const text = args.join(' ');
        if (!text) return msg.reply('Missing message content.');
        if (!ch.isTextBased()) return msg.reply('Invalid target channel.');

        const reqs = [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel];
        if (isEmbed) reqs.push(PermissionFlagsBits.EmbedLinks);

        if (!ch.permissionsFor(msg.client.user)?.has(reqs)) {
            return msg.reply('Missing permissions in target channel.');
        }

        msg.delete().catch(() => {});

        if (isEmbed) {
            const embed = new EmbedBuilder()
                .setDescription(text)
                .setColor('Random');
            await ch.send({ embeds: [embed] }).catch(() => msg.reply('Failed to send message.'));
        } else {
            await ch.send({ content: text }).catch(() => msg.reply('Failed to send message.'));
        }
    }
};