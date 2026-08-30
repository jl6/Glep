module.exports = {
    name: 'messageCreate',
    async execute(msg, client) {
        if (msg.author.bot || msg.channel.isThread() || !msg.guild) return;
        if (!client.activeDmaThreads) return;

        const uid = client.activeDmaThreads.get(msg.channel.id);
        if (!uid) return;

        const user = await client.users.fetch(uid).catch(() => null);
        if (!user) return;

        let out = `Staff (${msg.author.username}): ${msg.content}`;
        if (msg.attachments.size > 0) {
            const files = msg.attachments.map(a => a.url).join('\n');
            out += `\n${files}`;
        }

        await user.send(out).catch(() => {
            msg.channel.send('Failed to send message to user. DMs might be closed.').catch(() => {});
        });
    }
};