const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

function escapeCensusRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const GENDER_MAP = {
    '0': 'Male',
    '1': 'Female'
};

const MOVEMENT_MAP = {
    '3317': 'Super-Speed',
    '3313': 'Flight / Skimming',
    '3527': 'Acrobatics'
};

const PERSONALITY_MAP = {
    '457293': 'Flirty',
    '389435': 'Serious',
    '457292': 'Comical',
    '457294': 'Powerful',
    '457291': 'Primal',
    'flirty': 'Flirty',
    'serious': 'Serious',
    'comical': 'Comical',
    'powerful': 'Powerful',
    'primal': 'Primal'
};

const POWER_MAP = {
    '175798': 'Gadgets',
    '2325': 'Electric',
    '74779': 'Nature',
    '1992462': 'Rage',
    '2324': 'Ice',
    '1810455': 'Quantum',
    '7019': 'Mental',
    '2666': 'Fire',
    '2636096': 'Munitions',
    '197247': 'Sorcery',
    '2784': 'Earth',
    '1932154': 'Celestial',
    '2667': 'Light',
    '3050978': 'Water',
    '6902': 'Atomic'
};

const TITLE_MAP = {};

function getFactionAndOriginDetails(originId, alignmentId) {
    const oStr = String(originId);
    const aStr = String(alignmentId);

    let faction = aStr === '2330' ? 'Hero' : (aStr === '2331' ? 'Villain' : 'Unknown');
    let origin = 'Unknown';
    let mentor = 'Unknown';

    if (aStr === '2330') {
        if (oStr === '21783') { origin = 'Meta'; mentor = 'Superman'; }
        else if (oStr === '21784') { origin = 'Tech'; mentor = 'Batman'; }
        else if (oStr === '21785') { origin = 'Magic'; mentor = 'Wonder Woman'; }
    } else if (aStr === '2331') {
        if (oStr === '21783') { origin = 'Meta'; mentor = 'Lex Luthor'; }
        else if (oStr === '21784') { origin = 'Tech'; mentor = 'Joker'; }
        else if (oStr === '21785') { origin = 'Magic'; mentor = 'Circe'; }
    }

    return { faction, origin, mentor };
}

module.exports = {
    name: 'character',
    description: 'Look up DCUO character details',
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
                return msg.reply(`Player not found: ${query}.`);
            }

            const char = data.character_list[0];
            let league = 'None (Unlinked)';

            if (char.character_id) {
                try {
                    const rosterUrl = `https://census.daybreakgames.com/s:${serviceId}/json/get/dcuo:v1/guild_roster?character_id=${char.character_id}&c:sort=guild_id:-1&c:limit=1`;
                    const rosterRes = await axios.get(rosterUrl, { timeout: 4000 });
                    const roster = rosterRes.data?.guild_roster_list?.[0];

                    if (roster?.guild_id) {
                        const guildUrl = `https://census.daybreakgames.com/s:${serviceId}/json/get/dcuo:v1/guild?guild_id=${roster.guild_id}`;
                        const guildRes = await axios.get(guildUrl, { timeout: 4000 });
                        const guild = guildRes.data?.guild_list?.[0];

                        league = guild?.name || guild?.guild_name || `ID: ${roster.guild_id}`;
                    }
                } catch (err) {
                    console.error('League lookup error:', err.message);
                }
            }

            const name = char.name || query;
            const charId = char.character_id ? char.character_id : 'N/A';
            const cr = char.combat_rating || '0';
            const pvpCr = char.pvp_combat_rating || '0';
            const level = char.level || '0';
            const sp = char.skill_points || '0';
            const hash = char.hash || 'N/A';
            
            const titleId = char.title_id ? String(char.title_id) : null;
            const title = titleId ? (TITLE_MAP[titleId] || `ID: ${titleId}`) : 'None';

            const details = getFactionAndOriginDetails(char.origin_id, char.alignment_id);
            const gender = GENDER_MAP[String(char.gender_id)] || 'N/A';
            const movement = MOVEMENT_MAP[String(char.movement_mode_id)] || 'N/A';
            
            const rawPersonality = char.personality_id != null ? String(char.personality_id).toLowerCase().trim() : '';
            const personality = PERSONALITY_MAP[rawPersonality] || (char.personality_id ? `Unknown (${char.personality_id})` : 'N/A');

            const rawPower = char.power_id || char.power || char.power_type_id;
            const power = rawPower ? (POWER_MAP[String(rawPower)] || `Unknown (${rawPower})`) : 'N/A';

            const embed = new EmbedBuilder()
                .setTitle('Player Info')
                .setDescription(
                    `Title: ${title}\n` +
                    `Name: ${name}\n` +
                    `Level: ${level}\n` +
                    `Combat Rating: ${cr}\n` +
                    `Skill Points: ${sp}\n` +
                    `PvP Combat Rating: ${pvpCr}\n` +
                    `League: ${league}\n\n` +
                    `Faction: ${details.faction}\n` +
                    `Origin: ${details.origin}\n` +
                    `Mentor: ${details.mentor}\n` +
                    `Power: ${power}\n` +
                    `Movement: ${movement}\n\n` +
                    `Personality: ${personality}\n` +
                    `Gender: ${gender}\n\n` +
                    `ID: ${charId}\n` +
                    `Hash: ${hash}`
                )
                .setColor(0x2b2d31);

            if (char.character_id) {
                embed.setThumbnail(`https://census.daybreakgames.com/files/dcuo/images/character/paperdoll/${char.character_id}`);
            }

            await status.delete().catch(() => {});
            return msg.reply({ embeds: [embed] });

        } catch (err) {
            console.error('Character lookup error:', err.message);
            await status.delete().catch(() => {});
            return msg.reply(`Connection error: ${err.message}`);
        }
    }
};