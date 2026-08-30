const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'name',
    description: 'Checks name availability',
    usage: '[name]',
    selfClean: 15000,

    async execute(msg, args) {
        if (!args.length) {
            const usageEmbed = new EmbedBuilder()
                .setDescription('Provide a character name to check.')
                .setColor(0xfee75c);
            return msg.reply({ embeds: [usageEmbed] });
        }

        const serviceId = process.env.CENSUS_SERVICE_ID;
        if (!serviceId) return msg.reply('Census service identifier not configured.');

        const query = args.join(' ').trim();
        const encoded = encodeURIComponent(query);
        const status = await msg.reply(`Looking up ${query}...`);

        const url = `https://census.daybreakgames.com/s:${serviceId}/json/get/dcuo:v1/character?name=${encoded}&world_id=2&c:case=false&c:limit=50`;

        try {
            const res = await axios.get(url, {
                timeout: 10000,
                headers: { 'User-Agent': 'DiscordBotStats/1.0' }
            });

            const data = res.data;
            if (data?.error || data?.errorMessage) {
                await status.delete().catch(() => {});
                return msg.reply(`API Error: ${data.error || data.errorMessage}`);
            }

            const list = data?.character_list;
            await status.delete().catch(() => {});

            if (!list || !list.length) {
                const embed = new EmbedBuilder()
                    .setDescription(`${query} is available.`)
                    .setColor(0x57f287);
                return msg.reply({ embeds: [embed] });
            }

            const exact = list.find(c => c.name && c.name.toLowerCase() === query.toLowerCase());
            const deleted = exact && (exact.deleted === '1' || exact.deleted === true);

            if (!exact || deleted) {
                const embed = new EmbedBuilder()
                    .setDescription(`${query} is available.`)
                    .setColor(0x57f287);
                return msg.reply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setDescription(`${exact.name} is taken.`)
                .setColor(0xed4245);
            return msg.reply({ embeds: [embed] });

        } catch (err) {
            console.error('Name check error:', err.message);
            await status.delete().catch(() => {});
            return msg.reply(`Connection error: ${err.message}`);
        }
    }
};