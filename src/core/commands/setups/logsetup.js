const path = require('path');
const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require(path.join(process.cwd(), 'database', 'logs.js'));

const buildEmbed = (conf) => {
    return new EmbedBuilder()
        .setTitle('Logging Configuration')
        .addFields(
            { name: 'Status', value: conf.single_channel_id || conf.kick_channel_id ? 'ENABLED' : 'DISABLED', inline: false },
            { name: 'Mode', value: conf.separated ? 'Separated Channels' : 'Single Channel', inline: true },
            { name: 'Kick', value: conf.kick_logs ? 'ON' : 'OFF', inline: true },
            { name: 'Ban', value: conf.ban_logs ? 'ON' : 'OFF', inline: true },
            { name: 'Unban', value: conf.unban_logs ? 'ON' : 'OFF', inline: true },
            { name: 'Warn', value: conf.warn_logs ? 'ON' : 'OFF', inline: true },
            { name: 'Unwarn', value: conf.unwarn_logs ? 'ON' : 'OFF', inline: true },
            { name: 'Nickname', value: conf.nickname_logs ? 'ON' : 'OFF', inline: true },
            { name: 'Username', value: conf.username_logs ? 'ON' : 'OFF', inline: true },
            { name: 'Shield', value: conf.shield_logs ? 'ON' : 'OFF', inline: true }
        )
        .setColor(0x2b2d31);
};

const buildRows = (conf) => {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('toggle_logs')
            .setLabel(conf.single_channel_id || conf.kick_channel_id ? 'Disable' : 'Enable')
            .setStyle(conf.single_channel_id || conf.kick_channel_id ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('toggle_mode')
            .setLabel(conf.separated ? 'Use Single Channel' : 'Use Separated Channels')
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('toggle_kick').setLabel(`Kick: ${conf.kick_logs ? 'ON' : 'OFF'}`).setStyle(conf.kick_logs ? ButtonStyle.Secondary : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('toggle_ban').setLabel(`Ban: ${conf.ban_logs ? 'ON' : 'OFF'}`).setStyle(conf.ban_logs ? ButtonStyle.Secondary : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('toggle_unban').setLabel(`Unban: ${conf.unban_logs ? 'ON' : 'OFF'}`).setStyle(conf.unban_logs ? ButtonStyle.Secondary : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('toggle_warn').setLabel(`Warn: ${conf.warn_logs ? 'ON' : 'OFF'}`).setStyle(conf.warn_logs ? ButtonStyle.Secondary : ButtonStyle.Danger)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('toggle_unwarn').setLabel(`Unwarn: ${conf.unwarn_logs ? 'ON' : 'OFF'}`).setStyle(conf.unwarn_logs ? ButtonStyle.Secondary : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('toggle_nickname').setLabel(`Nick: ${conf.nickname_logs ? 'ON' : 'OFF'}`).setStyle(conf.nickname_logs ? ButtonStyle.Secondary : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('toggle_username').setLabel(`User: ${conf.username_logs ? 'ON' : 'OFF'}`).setStyle(conf.username_logs ? ButtonStyle.Secondary : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('toggle_shield').setLabel(`Shield: ${conf.shield_logs ? 'ON' : 'OFF'}`).setStyle(conf.shield_logs ? ButtonStyle.Secondary : ButtonStyle.Danger)
    );

    return [row1, row2, row3];
};

module.exports = {
    name: 'logsetup',
    description: 'Configure audit and security logging channels',
    usage: '',
    async execute(msg, args) {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return msg.reply('Missing permissions.');
        }

        let conf = db.prepare('SELECT * FROM guild_logs WHERE guild_id = ?').get(msg.guild.id);
        if (!conf) {
            db.prepare('INSERT INTO guild_logs (guild_id) VALUES (?)').run(msg.guild.id);
            conf = db.prepare('SELECT * FROM guild_logs WHERE guild_id = ?').get(msg.guild.id);
        }

        const res = await msg.reply({
            embeds: [buildEmbed(conf)],
            components: buildRows(conf)
        });

        const collector = res.createMessageComponentCollector({
            filter: i => i.user.id === msg.author.id,
            time: 60000
        });

        collector.on('collect', async i => {
            conf = db.prepare('SELECT * FROM guild_logs WHERE guild_id = ?').get(msg.guild.id);

            const cleanupChannels = async (deleteCategory = false) => {
                const ids = [
                    conf.single_channel_id, conf.kick_channel_id, conf.ban_channel_id,
                    conf.unban_channel_id, conf.warn_channel_id, conf.unwarn_channel_id,
                    conf.nickname_channel_id, conf.username_channel_id, conf.shield_channel_id
                ];
                for (const id of ids) {
                    if (!id) continue;
                    const ch = msg.guild.channels.cache.get(id);
                    if (ch) await ch.delete().catch(() => {});
                }

                if (deleteCategory && conf.category_id) {
                    const cat = msg.guild.channels.cache.get(conf.category_id);
                    if (cat) await cat.delete().catch(() => {});
                }
            };

            const getOrCreateCategory = async () => {
                let cat = conf.category_id ? msg.guild.channels.cache.get(conf.category_id) : null;
                if (!cat) {
                    cat = await msg.guild.channels.create({
                        name: 'Logs',
                        type: 4,
                        permissionOverwrites: [{ id: msg.guild.id, deny: [PermissionFlagsBits.ViewChannel] }]
                    }).catch(() => null);
                }
                return cat;
            };

            if (i.customId === 'toggle_logs') {
                const active = conf.single_channel_id || conf.kick_channel_id;
                if (active) {
                    await cleanupChannels(true);
                    db.prepare(`
                        UPDATE guild_logs SET category_id = NULL, single_channel_id = NULL, 
                        kick_channel_id = NULL, ban_channel_id = NULL, unban_channel_id = NULL, 
                        warn_channel_id = NULL, unwarn_channel_id = NULL, nickname_channel_id = NULL, 
                        username_channel_id = NULL, shield_channel_id = NULL WHERE guild_id = ?
                    `).run(msg.guild.id);
                } else {
                    const cat = await getOrCreateCategory();

                    if (conf.separated) {
                        const kc = await msg.guild.channels.create({ name: 'kick-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const bc = await msg.guild.channels.create({ name: 'ban-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const ubc = await msg.guild.channels.create({ name: 'unban-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const wc = await msg.guild.channels.create({ name: 'warn-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const uwc = await msg.guild.channels.create({ name: 'unwarn-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const nc = await msg.guild.channels.create({ name: 'nickname-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const usc = await msg.guild.channels.create({ name: 'username-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const sc = await msg.guild.channels.create({ name: 'shield-logs', type: 0, parent: cat?.id }).catch(() => null);

                        db.prepare(`
                            UPDATE guild_logs SET category_id = ?, kick_channel_id = ?, ban_channel_id = ?, 
                            unban_channel_id = ?, warn_channel_id = ?, unwarn_channel_id = ?, 
                            nickname_channel_id = ?, username_channel_id = ?, shield_channel_id = ? WHERE guild_id = ?
                        `).run(cat?.id, kc?.id, bc?.id, ubc?.id, wc?.id, uwc?.id, nc?.id, usc?.id, sc?.id, msg.guild.id);
                    } else {
                        const singleCh = await msg.guild.channels.create({ name: 'server-logs', type: 0, parent: cat?.id }).catch(() => null);
                        db.prepare('UPDATE guild_logs SET category_id = ?, single_channel_id = ? WHERE guild_id = ?').run(cat?.id, singleCh?.id, msg.guild.id);
                    }
                }
            } else if (i.customId === 'toggle_mode') {
                const nextSep = conf.separated ? 0 : 1;
                db.prepare('UPDATE guild_logs SET separated = ? WHERE guild_id = ?').run(nextSep, msg.guild.id);
                const active = conf.single_channel_id || conf.kick_channel_id;
                
                if (active) {
                    await cleanupChannels(false);
                    const cat = await getOrCreateCategory();

                    if (nextSep) {
                        const kc = await msg.guild.channels.create({ name: 'kick-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const bc = await msg.guild.channels.create({ name: 'ban-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const ubc = await msg.guild.channels.create({ name: 'unban-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const wc = await msg.guild.channels.create({ name: 'warn-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const uwc = await msg.guild.channels.create({ name: 'unwarn-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const nc = await msg.guild.channels.create({ name: 'nickname-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const usc = await msg.guild.channels.create({ name: 'username-logs', type: 0, parent: cat?.id }).catch(() => null);
                        const sc = await msg.guild.channels.create({ name: 'shield-logs', type: 0, parent: cat?.id }).catch(() => null);

                        db.prepare(`
                            UPDATE guild_logs SET category_id = ?, single_channel_id = NULL, kick_channel_id = ?, 
                            ban_channel_id = ?, unban_channel_id = ?, warn_channel_id = ?, unwarn_channel_id = ?, 
                            nickname_channel_id = ?, username_channel_id = ?, shield_channel_id = ? WHERE guild_id = ?
                        `).run(cat?.id, kc?.id, bc?.id, ubc?.id, wc?.id, uwc?.id, nc?.id, usc?.id, sc?.id, msg.guild.id);
                    } else {
                        const singleCh = await msg.guild.channels.create({ name: 'server-logs', type: 0, parent: cat?.id }).catch(() => null);
                        db.prepare(`
                            UPDATE guild_logs SET category_id = ?, single_channel_id = ?, kick_channel_id = NULL, 
                            ban_channel_id = NULL, unban_channel_id = NULL, warn_channel_id = NULL, 
                            unwarn_channel_id = NULL, nickname_channel_id = NULL, username_channel_id = NULL, 
                            shield_channel_id = NULL WHERE guild_id = ?
                        `).run(cat?.id, singleCh?.id, msg.guild.id);
                    }
                }
            } else if (i.customId === 'toggle_kick') {
                db.prepare('UPDATE guild_logs SET kick_logs = ? WHERE guild_id = ?').run(conf.kick_logs ? 0 : 1, msg.guild.id);
            } else if (i.customId === 'toggle_ban') {
                db.prepare('UPDATE guild_logs SET ban_logs = ? WHERE guild_id = ?').run(conf.ban_logs ? 0 : 1, msg.guild.id);
            } else if (i.customId === 'toggle_unban') {
                db.prepare('UPDATE guild_logs SET unban_logs = ? WHERE guild_id = ?').run(conf.unban_logs ? 0 : 1, msg.guild.id);
            } else if (i.customId === 'toggle_warn') {
                db.prepare('UPDATE guild_logs SET warn_logs = ? WHERE guild_id = ?').run(conf.warn_logs ? 0 : 1, msg.guild.id);
            } else if (i.customId === 'toggle_unwarn') {
                db.prepare('UPDATE guild_logs SET unwarn_logs = ? WHERE guild_id = ?').run(conf.unwarn_logs ? 0 : 1, msg.guild.id);
            } else if (i.customId === 'toggle_nickname') {
                db.prepare('UPDATE guild_logs SET nickname_logs = ? WHERE guild_id = ?').run(conf.nickname_logs ? 0 : 1, msg.guild.id);
            } else if (i.customId === 'toggle_username') {
                db.prepare('UPDATE guild_logs SET username_logs = ? WHERE guild_id = ?').run(conf.username_logs ? 0 : 1, msg.guild.id);
            } else if (i.customId === 'toggle_shield') {
                db.prepare('UPDATE guild_logs SET shield_logs = ? WHERE guild_id = ?').run(conf.shield_logs ? 0 : 1, msg.guild.id);
            }

            conf = db.prepare('SELECT * FROM guild_logs WHERE guild_id = ?').get(msg.guild.id);
            await i.update({
                embeds: [buildEmbed(conf)],
                components: buildRows(conf)
            });
        });

        collector.on('end', () => res.edit({ components: [] }).catch(() => {}));
    }
};