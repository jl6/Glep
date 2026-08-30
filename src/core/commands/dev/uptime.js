module.exports = {
    name: 'uptime',
    description: 'Shows bot uptime.',
    selfClean: 9000,
    
    async execute(msg, args, client, db) {
        const sec = Math.floor(client.uptime / 1000);
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;

        await msg.reply(`${d}d ${h}h ${m}m ${s}s`);
    }
};