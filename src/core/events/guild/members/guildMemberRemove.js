const path = require('path');
const db = require(path.join(process.cwd(), 'database', 'welcomedb'));

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        const conf = db.get(member.guild.id);
        if (!conf || !conf.channel_id) return;

        const ch = member.guild.channels.cache.get(conf.channel_id);
        if (!ch) return;

        const formatMsg = (str) => str.replace('{user}', member.user.tag).replace('{server}', member.guild.name);
        const text = formatMsg(conf.leave_msg || '{user} has left the server.');
        await ch.send({ content: text }).catch(() => {});

        if (conf.dm_leave) {
            const dmText = formatMsg(conf.dm_leave);
            await member.send({ content: dmText }).catch(() => {});
        }
    }
};