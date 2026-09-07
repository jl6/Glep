const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { sendLog } = require(path.join(process.cwd(), 'src', 'utils', 'logHandler.js'));

module.exports = (client) => {
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        if (oldMember.nickname !== newMember.nickname) {
            const embed = new EmbedBuilder()
                .setTitle('Nickname Changed')
                .setDescription(`User: <@${newMember.id}>\nBefore: ${oldMember.nickname || 'None'}\nAfter: ${newMember.nickname || 'None'}`)
                .setColor(0x2b2d31)
                .setTimestamp();
            await sendLog(newMember.guild, 'nickname', embed);
        }
    });

    client.on('userUpdate', async (oldUser, newUser) => {
        if (oldUser.username === newUser.username) return;
        for (const [_, guild] of client.guilds.cache) {
            const member = await guild.members.fetch(newUser.id).catch(() => null);
            if (!member) continue;

            const embed = new EmbedBuilder()
                .setTitle('Username Changed')
                .setDescription(`User: <@${newUser.id}>\nBefore: ${oldUser.username}\nAfter: ${newUser.username}`)
                .setColor(0x2b2d31)
                .setTimestamp();
            await sendLog(guild, 'username', embed);
        }
    });

    client.on('guildBanAdd', async ban => {
        const embed = new EmbedBuilder()
            .setTitle('Member Banned')
            .setDescription(`User: <@${ban.user.id}> (${ban.user.tag})`)
            .setColor(0x2b2d31)
            .setTimestamp();
        await sendLog(ban.guild, 'ban', embed);
    });

    client.on('guildBanRemove', async ban => {
        const embed = new EmbedBuilder()
            .setTitle('Member Unbanned')
            .setDescription(`User: <@${ban.user.id}> (${ban.user.tag})`)
            .setColor(0x2b2d31)
            .setTimestamp();
        await sendLog(ban.guild, 'unban', embed);
    });
};