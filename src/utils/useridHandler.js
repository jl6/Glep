const { EmbedBuilder } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

async function checkUserIdLookup(msg) {
    if (!msg.guild || msg.author.bot) return false;

    const row = db.prepare('SELECT channel_id FROM userid_channels WHERE guild_id = ?').get(msg.guild.id);
    if (!row || row.channel_id !== msg.channel.id) return false;

    const ids = msg.content.match(/\d{17,19}/g);
    if (!ids || !ids.length) return false;

    for (const uid of ids) {
        try {
            const u = await msg.client.users.fetch(uid, { force: true });
            const ts = Math.floor(u.createdTimestamp / 1000);

            const msInDay = 1000 * 60 * 60 * 24;
            const createdDaysAgo = Math.floor((Date.now() - u.createdTimestamp) / msInDay);
            const createdYearsAgo = (createdDaysAgo / 365.25).toFixed(1);

            const embed = new EmbedBuilder()
                .setTitle(u.username)
                .setThumbnail(u.displayAvatarURL({ size: 256 }))
                .setColor(u.hexAccentColor || 0x2b2d31)
                .addFields(
                    { name: 'Username', value: u.username, inline: true },
                    { name: 'Display Name', value: u.globalName || 'None', inline: true },
                    { name: 'ID', value: u.id, inline: true },
                    { name: 'Created', value: `<t:${ts}:F>\n${createdDaysAgo} days ago (${createdYearsAgo} years ago)`, inline: false },
                    { name: 'Type', value: u.bot ? 'Bot' : 'User', inline: true }
                )
                .setTimestamp();

            const banner = u.bannerURL({ size: 512 });
            if (banner) embed.setImage(banner);

            await msg.channel.send({ embeds: [embed] });
        } catch (err) {
            if (err.code === 10013) {
                await msg.channel.send('User not found.');
            } else {
                await msg.channel.send('Failed to fetch user data.');
            }
        }
    }

    return true;
}

module.exports = { checkUserIdLookup };