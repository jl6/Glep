const Database = require('better-sqlite3');
const path = require('path');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

async function checkSelfBot(msg) {
    if (!msg.member || !msg.guild) return false;

    const row = db.prepare('SELECT * FROM guild_selfbots WHERE guild_id = ?').get(msg.guild.id);
    if (!row?.enabled || !row?.channel_id || msg.channel.id !== row.channel_id) return false;

    if (msg.member.permissions.has(PermissionFlagsBits.ManageGuild) || msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return false;
    }

    try {
        if (msg.deletable) await msg.delete().catch(() => {});
        await msg.guild.members.ban(msg.author.id, { reason: 'Triggered selfbot trap.' });

        const count = row.ban_count + 1;
        db.prepare('UPDATE guild_selfbots SET ban_count = ? WHERE guild_id = ?').run(count, msg.guild.id);

        const ch = msg.guild.channels.cache.get(row.channel_id);
        if (ch && row.message_id) {
            const trap = await ch.messages.fetch(row.message_id).catch(() => null);
            if (trap) {
                const embed = new EmbedBuilder()
                    .setTitle('Self Bot Trap Active')
                    .setDescription('Non-staff messages here will trigger an automated ban.')
                    .addFields({ name: 'Total Bans', value: String(count), inline: false })
                    .setColor(0xcc3333);

                await trap.edit({ embeds: [embed] }).catch(() => {});
            }
        }
    } catch (err) {
        console.error('Failed to execute selfbot ban:', err);
    }

    return true;
}

module.exports = { checkSelfBot };