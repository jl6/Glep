module.exports = {
    name: 'ping',
    description: 'Replies with latency info.',
    selfClean: 9000,
    devOnly: true,
    async execute(msg) {
        const start = await msg.reply('Pinging...');
        const rtt = start.createdTimestamp - msg.createdTimestamp;
        const api = Math.round(msg.client.ws.ping);

        const res = await start.edit(`Latency: ${rtt}ms | API: ${api}ms`);

        if (this.selfClean) {
            setTimeout(() => res.delete().catch(() => {}), this.selfClean);
        }
    }
};