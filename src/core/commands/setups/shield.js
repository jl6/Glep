const path = require('path');
const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('better-sqlite3');

const db = new Database(path.join(process.cwd(), 'database', 'data.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_shield (
        guild_id TEXT PRIMARY KEY,
        antilinks INTEGER DEFAULT 0,
        antispam INTEGER DEFAULT 0,
        antiimages INTEGER DEFAULT 0
    );
`);

const buildEmbed = (shieldData, logData) => {
    const shieldLogStatus = logData ? (logData.shield_logs ? 'ENABLED' : 'DISABLED') : 'DISABLED (No Setup)';

    return new EmbedBuilder()
        .setTitle('Shield Configuration')
        .addFields(
            { name: 'Anti Links', value: shieldData.antilinks ? 'ENABLED' : 'DISABLED', inline: true },
            { name: 'Anti Spam', value: shieldData.antispam ? 'ENABLED' : 'DISABLED', inline: true },
            { name: 'Anti Images', value: shieldData.antiimages ? 'ENABLED' : 'DISABLED', inline: true },
            { name: 'Shield Logs', value: shieldLogStatus, inline: false }
        )
        .setColor(0x2b2d31);
};

const buildRow = (data) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('toggle_antilinks')
            .setLabel(`Anti-Links: ${data.antilinks ? 'ON' : 'OFF'}`)
            .setStyle(data.antilinks ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('toggle_antispam')
            .setLabel(`Anti-Spam: ${data.antispam ? 'ON' : 'OFF'}`)
            .setStyle(data.antispam ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('toggle_antiimages')
            .setLabel(`Anti-Images: ${data.antiimages ? 'ON' : 'OFF'}`)
            .setStyle(data.antiimages ? ButtonStyle.Danger : ButtonStyle.Success)
    );
};

module.exports = {
    name: 'aspam',
    description: 'Configure server security filters',
    usage: '',

    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return msg.reply('Missing permissions.');
        }

        let row = db.prepare('SELECT * FROM guild_shield WHERE guild_id = ?').get(msg.guild.id);
        if (!row) {
            db.prepare('INSERT INTO guild_shield (guild_id, antilinks, antispam, antiimages) VALUES (?, 0, 0, 0)').run(msg.guild.id);
            row = { guild_id: msg.guild.id, antilinks: 0, antispam: 0, antiimages: 0 };
        }

        let logConf = db.prepare('SELECT shield_logs FROM guild_logs WHERE guild_id = ?').get(msg.guild.id);

        const res = await msg.reply({
            embeds: [buildEmbed(row, logConf)],
            components: [buildRow(row)]
        });

        const collector = res.createMessageComponentCollector({
            filter: i => i.user.id === msg.author.id,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.customId === 'toggle_antilinks') {
                row.antilinks = row.antilinks ? 0 : 1;
                db.prepare('UPDATE guild_shield SET antilinks = ? WHERE guild_id = ?').run(row.antilinks, msg.guild.id);
            } else if (i.customId === 'toggle_antispam') {
                row.antispam = row.antispam ? 0 : 1;
                db.prepare('UPDATE guild_shield SET antispam = ? WHERE guild_id = ?').run(row.antispam, msg.guild.id);
            } else if (i.customId === 'toggle_antiimages') {
                row.antiimages = row.antiimages ? 0 : 1;
                db.prepare('UPDATE guild_shield SET antiimages = ? WHERE guild_id = ?').run(row.antiimages, msg.guild.id);
            }

            logConf = db.prepare('SELECT shield_logs FROM guild_logs WHERE guild_id = ?').get(msg.guild.id);

            await i.update({
                embeds: [buildEmbed(row, logConf)],
                components: [buildRow(row)]
            });
        });

        collector.on('end', () => res.edit({ components: [] }).catch(() => {}));
    }
};