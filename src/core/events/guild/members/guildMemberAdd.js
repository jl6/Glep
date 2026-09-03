const { AttachmentBuilder } = require('discord.js');
const path = require('path');
const db = require(path.join(process.cwd(), 'database', 'welcomedb'));
const { generateCard } = require(path.join(process.cwd(), 'src', 'utils', 'welcomecardHandler'));

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const conf = db.get(member.guild.id);
        if (!conf || !conf.channel_id) return;

        const ch = member.guild.channels.cache.get(conf.channel_id);
        if (!ch) return;

        const formatMsg = (str) => str.replace('{user}', `<@${member.id}>`).replace('{server}', member.guild.name);

        if (conf.type === 'image') {
            const buf = await generateCard(member, 'Welcome');
            const file = new AttachmentBuilder(buf, { name: 'welcome.png' });
            const text = formatMsg(conf.welcome_msg || 'Welcome {user} to {server}!');
            await ch.send({ content: text, files: [file] }).catch(() => {});
        } else {
            const text = formatMsg(conf.welcome_msg || 'Welcome {user} to {server}!');
            await ch.send({ content: text }).catch(() => {});
        }

        if (conf.dm_welcome) {
            const dmText = formatMsg(conf.dm_welcome);
            await member.send({ content: dmText }).catch(() => {});
        }
    }
};