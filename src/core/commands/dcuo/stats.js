const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

function escapeCensusRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatStatValue(value) {
    if (value === null || value === undefined) return '0';
    return String(value);
}

module.exports = {
    name: 'stats',
    description: 'Displays character stats',
    usage: '[name]',
    selfClean: 15000,

    async execute(msg, args) {
        if (!args.length) return msg.reply('Provide a character name.');

        const query = args.join(' ').trim();
        const encoded = encodeURIComponent(query);
        const escaped = encodeURIComponent(escapeCensusRegex(query));

        const serviceId = process.env.CENSUS_SERVICE_ID;
        if (!serviceId) return msg.reply('Census service identifier not configured.');

        const status = await msg.reply(`Looking up ${query}...`);

        const endpoints = [
            `https://census.daybreakgames.com/s:${serviceId}/json/get/dcuo:v1/character?name=${encoded}&c:case=false`,
            `https://census.daybreakgames.com/s:${serviceId}/json/get/dcuo:v1/character?name=^${escaped}&c:case=false`
        ];

        try {
            let data = null;

            for (const url of endpoints) {
                const res = await axios.get(url, {
                    timeout: 10000,
                    headers: { 'User-Agent': 'DiscordBotStats/1.0' }
                });

                if (res.data?.character_list?.length > 0 || res.data?.error || res.data?.errorMessage) {
                    data = res.data;
                    break;
                }
            }

            if (data?.error || data?.errorMessage) {
                await status.delete().catch(() => {});
                return msg.reply(`API Error: ${data.error || data.errorMessage}`);
            }

            if (!data?.character_list?.length) {
                await status.delete().catch(() => {});
                return msg.reply(`No record found for ${query}.`);
            }

            const char = data.character_list[0];
            const name = char.name || query;

            const hp = formatStatValue(char.current_health);
            const power = formatStatValue(char.current_power);
            const might = formatStatValue(char.might);
            const precision = formatStatValue(char.precision);
            const defense = formatStatValue(char.defense);
            const toughness = formatStatValue(char.toughness);
            const restoration = formatStatValue(char.restoration);
            const vitalization = formatStatValue(char.vitalization);
            const dominance = formatStatValue(char.dominance);

            const embed = new EmbedBuilder()
                .setTitle(name)
                .setDescription(
                    `Stats\n` +
                    `Health: ${hp}\nPower: ${power}\n` +
                    `Might: ${might}\nPrecision: ${precision}\n` +
                    `Restoration: ${restoration}\nVitalization: ${vitalization}\n` +
                    `Dominance: ${dominance}\n` +
                    `Defense: ${defense}\nToughness: ${toughness}`
                )
                .setColor(0x2b2d31);

            if (char.character_id) {
                embed.setThumbnail(`https://census.daybreakgames.com/files/dcuo/images/character/paperdoll/${char.character_id}`);
            }

            await status.delete().catch(() => {});
            return msg.reply({ embeds: [embed] });
        } catch (err) {
            console.error('Stats error:', err.message);
            await status.delete().catch(() => {});
            return msg.reply(`Connection error: ${err.message}`);
        }
    }
};