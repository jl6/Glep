const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

function escapeCensusRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CATEGORIES = {
    IDENTITY: { title: 'Character Identity & Account', color: 0x5865f2 },
    PROGRESSION: { title: 'Progression & Combat Rating', color: 0xfee75c },
    ATTRIBUTES: { title: 'Combat Attributes & Stats', color: 0xed4245 },
    BUILD: { title: 'Character Build & Archetype', color: 0xeb459e },
    SYSTEM: { title: 'System Metadata', color: 0x4f545c }
};

const FIELD_MAP = {
    name: { title: 'Character Name', category: 'IDENTITY', inline: true },
    character_id: { title: 'Character ID', category: 'IDENTITY', inline: true },
    database_id: { title: 'Database ID', category: 'IDENTITY', inline: true },
    deleted: { title: 'Account Status', category: 'IDENTITY', inline: true },
    world_id: { title: 'Server / World ID', category: 'IDENTITY', inline: true },

    level: { title: 'Level', category: 'PROGRESSION', inline: true },
    combat_rating: { title: 'Combat Rating', category: 'PROGRESSION', inline: true },
    pvp_combat_rating: { title: 'PvP Combat Rating', category: 'PROGRESSION', inline: true },
    skill_points: { title: 'Skill Points', category: 'PROGRESSION', inline: true },
    max_feats: { title: 'Feats Unlocked', category: 'PROGRESSION', inline: true },

    current_health: { title: 'Current Health', category: 'ATTRIBUTES', inline: true },
    max_health: { title: 'Max Health', category: 'ATTRIBUTES', inline: true },
    current_power: { title: 'Current Power', category: 'ATTRIBUTES', inline: true },
    max_power: { title: 'Max Power', category: 'ATTRIBUTES', inline: true },
    might: { title: 'Might', category: 'ATTRIBUTES', inline: true },
    precision: { title: 'Precision', category: 'ATTRIBUTES', inline: true },
    defense: { title: 'Defense', category: 'ATTRIBUTES', inline: true },
    toughness: { title: 'Toughness', category: 'ATTRIBUTES', inline: true },
    restoration: { title: 'Restoration', category: 'ATTRIBUTES', inline: true },
    vitalization: { title: 'Vitalization', category: 'ATTRIBUTES', inline: true },
    dominance: { title: 'Dominance', category: 'ATTRIBUTES', inline: true },

    alignment_id: { title: 'Alignment', category: 'BUILD', inline: true },
    gender_id: { title: 'Gender ID', category: 'BUILD', inline: true },
    movement_mode_id: { title: 'Movement Mode ID', category: 'BUILD', inline: true },
    origin_id: { title: 'Origin ID', category: 'BUILD', inline: true },
    power_source_id: { title: 'Power Source ID', category: 'BUILD', inline: true },
    power_type_id: { title: 'Power Type ID', category: 'BUILD', inline: true },
    personality_id: { title: 'Personality ID', category: 'BUILD', inline: true },
    title_id: { title: 'Active Title ID', category: 'BUILD', inline: true }
};

function formatFieldValue(val) {
    if (val === null || val === undefined) return '`null`';
    if (typeof val === 'boolean') return val ? '`True`' : '`False`';
    if (typeof val === 'object') return `\`\`\`json\n${JSON.stringify(val, null, 2)}\n\`\`\``;
    return `\`${String(val)}\``;
}

function buildOrganizedDataEmbeds(dataObj, charName) {
    const total = Object.keys(dataObj).length;
    const grouped = { IDENTITY: [], PROGRESSION: [], ATTRIBUTES: [], BUILD: [], SYSTEM: [] };

    for (const [key, val] of Object.entries(dataObj)) {
        const meta = FIELD_MAP[key];
        const catKey = meta ? meta.category : 'SYSTEM';

        let label = meta ? meta.title : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        grouped[catKey].push({
            name: label,
            value: formatFieldValue(val),
            inline: meta ? meta.inline : true
        });
    }

    const embeds = [];

    for (const [catKey, fields] of Object.entries(grouped)) {
        if (!fields.length) continue;

        const config = CATEGORIES[catKey];

        for (let i = 0; i < fields.length; i += 25) {
            const batch = fields.slice(i, i + 25);
            const embed = new EmbedBuilder()
                .setTitle(i === 0 ? config.title : `${config.title} (Cont.)`)
                .setColor(config.color)
                .addFields(batch);

            if (embeds.length === 0) {
                embed.setDescription(`Raw database dump for ${charName} (${total} fields)`);
            }

            embeds.push(embed);
        }
    }

    const totalEmbeds = embeds.length;
    embeds.forEach((emb, idx) => {
        emb.setFooter({ text: `Section ${idx + 1} of ${totalEmbeds} | Fields: ${total}` }).setTimestamp();
    });

    return embeds;
}

module.exports = {
    name: 'raw',
    description: 'Raw JSON data for character',
    usage: '[name]',
    selfClean: 15000,

    async execute(msg, args) {
        if (!args.length) return msg.reply('Provide a character name.');

        const serviceId = process.env.CENSUS_SERVICE_ID;
        if (!serviceId) return msg.reply('Census service identifier not configured.');

        const query = args.join(' ').trim();
        const encoded = encodeURIComponent(query);
        const escaped = encodeURIComponent(escapeCensusRegex(query));

        const status = await msg.reply(`Looking up ${query}...`);

        const endpoints = [
            `https://census.daybreakgames.com/s:${serviceId}/json/get/dcuo:v1/character?name=${encoded}&c:case=false`,
            `https://census.daybreakgames.com/s:${serviceId}/json/get/dcuo:v1/character?name=^${escaped}&c:case=false`
        ];

        try {
            let rawData = null;

            for (const url of endpoints) {
                const res = await axios.get(url, {
                    timeout: 10000,
                    headers: { 'User-Agent': 'DiscordBotStats/1.0' }
                });

                if (res.data?.character_list?.length > 0 || res.data?.error || res.data?.errorMessage) {
                    rawData = res.data;
                    break;
                }
            }

            if (rawData?.error || rawData?.errorMessage) {
                await status.delete().catch(() => {});
                return msg.reply(`API Error: ${rawData.error || rawData.errorMessage}`);
            }

            if (!rawData?.character_list?.length) {
                await status.delete().catch(() => {});
                return msg.reply(`No record found for ${query}.`);
            }

            const char = rawData.character_list[0];
            const name = char.name || query;
            const embeds = buildOrganizedDataEmbeds(char, name);

            await status.delete().catch(() => {});

            for (let i = 0; i < embeds.length; i += 10) {
                await msg.reply({ embeds: embeds.slice(i, i + 10) });
            }
        } catch (err) {
            console.error('Raw scan error:', err.message);
            await status.delete().catch(() => {});
            return msg.reply(`Connection error: ${err.message}`);
        }
    }
};