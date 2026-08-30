const os = require('node:os');
const si = require('systeminformation');
const { EmbedBuilder, version } = require('discord.js');

module.exports = {
    name: 'gstats',
    description: 'Displays host system metrics and bot statistics.',
    selfClean: 9000,
    devOnly: true,
    
    async execute(msg, args, client, db) {
        const loading = await msg.reply('Fetching system stats...');

        try {
            const [cpu, mem, disk, currentLoad] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.fsSize(),
                si.currentLoad()
            ]);

            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor(uptime / 3600) % 24;
            const minutes = Math.floor(uptime / 60) % 60;

            const activeDisk = disk.find(d => d.mount === '/') || disk[0];
            const memPct = (mem.active / mem.total) * 100;

            const embed = new EmbedBuilder()
                .setTitle('System Statistics')
                .setColor(0x2f3136)
                .addFields(
                    { 
                        name: 'Bot Status', 
                        value: `Latency: ${client.ws.ping}ms\nUptime: ${days}d ${hours}h ${minutes}m\nServers: ${client.guilds.cache.size}`, 
                        inline: true 
                    },
                    { 
                        name: 'CPU', 
                        value: `Model: ${cpu.manufacturer} ${cpu.brand}\nCores: ${cpu.cores}\nLoad: ${currentLoad.currentLoad.toFixed(1)}%`, 
                        inline: true 
                    },
                    { 
                        name: 'Memory', 
                        value: `Used: ${(mem.active / 1024 / 1024 / 1024).toFixed(2)} GB / ${(mem.total / 1024 / 1024 / 1024).toFixed(2)} GB (${memPct.toFixed(1)}%)`, 
                        inline: false 
                    },
                    { 
                        name: 'Storage & Environment', 
                        value: `Disk Space: ${(activeDisk.used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(activeDisk.size / 1024 / 1024 / 1024).toFixed(2)} GB\nNode: ${process.version}\nDiscord.js: v${version}\nOS: ${os.platform()} (${os.arch()})`, 
                        inline: false 
                    }
                )
                .setTimestamp();

            await loading.edit({ content: null, embeds: [embed] });
        } catch (err) {
            console.error(err);
            await loading.edit('Failed to load system stats.');
        }
    }
};