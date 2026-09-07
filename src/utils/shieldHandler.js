const Database = require('better-sqlite3');
const path = require('path');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendLog } = require('../utils/logHandler');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

const spamMap = new Map();
const imageMap = new Map();
const linkRegex = /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/i;

async function checkShield(msg) {
    if (!msg.member || !msg.guild) return false;

    if (msg.member.permissions.has(PermissionFlagsBits.ManageGuild) || msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return false;
    }

    const row = db.prepare('SELECT * FROM guild_shield WHERE guild_id = ?').get(msg.guild.id);
    if (!row) return false;

    const now = Date.now();
    const uid = msg.author.id;

    if (row.antilinks && linkRegex.test(msg.content)) {
        if (msg.deletable) await msg.delete().catch(() => {});
        
        const embed = new EmbedBuilder()
            .setTitle('Shield Violation: Anti-Link')
            .setDescription(`**User:** <@${msg.author.id}>\n**Channel:** <#${msg.channel.id}>\n**Content:** ${msg.content.slice(0, 200)}`)
            .setColor(0x2b2d31)
            .setTimestamp();
        await sendLog(msg.guild, 'shield', embed);

        return true;
    }

    if (row.antispam) {
        if (!spamMap.has(uid)) spamMap.set(uid, []);
        const stamps = spamMap.get(uid);
        stamps.push(now);

        const recent = stamps.filter(t => now - t < 2000);
        spamMap.set(uid, recent);

        if (recent.length > 3) {
            if (msg.deletable) await msg.delete().catch(() => {});
            
            const embed = new EmbedBuilder()
                .setTitle('Shield Violation: Anti-Spam')
                .setDescription(`**User:** <@${msg.author.id}>\n**Channel:** <#${msg.channel.id}>`)
                .setColor(0x2b2d31)
                .setTimestamp();
            await sendLog(msg.guild, 'shield', embed);

            return true;
        }
    }

    if (row.antiimages) {
        const hasImg = msg.attachments.some(a => a.contentType?.startsWith('image/'));
        if (hasImg) {
            if (!imageMap.has(uid)) imageMap.set(uid, []);
            const stamps = imageMap.get(uid);
            stamps.push(now);

            const recent = stamps.filter(t => now - t < 2000);
            imageMap.set(uid, recent);

            if (recent.length > 3) {
                if (msg.deletable) await msg.delete().catch(() => {});
                
                const embed = new EmbedBuilder()
                    .setTitle('Shield Violation: Anti-Image Spam')
                    .setDescription(`**User:** <@${msg.author.id}>\n**Channel:** <#${msg.channel.id}>`)
                    .setColor(0x2b2d31)
                    .setTimestamp();
                await sendLog(msg.guild, 'shield', embed);

                return true;
            }
        }
    }

    return false;
}

module.exports = { checkShield };