module.exports = {
    name: 'channelDelete',
    async execute(ch, client) {
        if (!client.activeDmaThreads) return;

        const uid = client.activeDmaThreads.get(ch.id);
        if (!uid) return;

        client.activeDmaMod.delete(uid);
        client.activeDmaThreads.delete(ch.id);

        const user = await client.users.fetch(uid).catch(() => null);
        if (user) {
            await user.send('Support session ended by staff.').catch(() => {});
        }
    }
};