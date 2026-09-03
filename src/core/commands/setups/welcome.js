// src/core/commands/setups/welcome.js
const path = require('path');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require(path.join(process.cwd(), 'database', 'welcomedb'));

module.exports = {
    name: 'welcome',
    description: 'Configure welcome and leave settings',
    execute: async (msg, args, client) => {
        if (!msg.member.permissions.has(PermissionFlagsBits.ManageGuild)) return msg.reply('Missing permissions: Manage Guild required.');

        const rows = () => [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('wel_ch').setLabel('Channel').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('wel_type').setLabel('Type').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('wel_wipe').setLabel('Wipe').setStyle(ButtonStyle.Danger)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('wel_w_msg').setLabel('Welcome Msg').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('wel_l_msg').setLabel('Leave Msg').setStyle(ButtonStyle.Success)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('wel_dm_w').setLabel('DM Welcome').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('wel_dm_l').setLabel('DM Leave').setStyle(ButtonStyle.Secondary)
            )
        ];

        const text = () => {
            const conf = db.get(msg.guild.id) || {};
            return `Settings:\nChannel: <#${conf.channel_id || 'None'}>\nType: ${conf.type || 'image'}\nWelcome: ${conf.welcome_msg || 'Default'}\nLeave: ${conf.leave_msg || 'Default'}\nDM Welcome: ${conf.dm_welcome || 'None'}\nDM Leave: ${conf.dm_leave || 'None'}`;
        };

        const reply = await msg.reply({ content: text(), components: rows() });
        const filter = i => i.user.id === msg.author.id;
        const collector = reply.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            const conf = db.get(msg.guild.id) || {};

            if (i.customId === 'wel_wipe') {
                db.remove(msg.guild.id);
                return i.update({ content: 'Settings wiped.', components: [] });
            }

            if (i.customId === 'wel_type') {
                const next = (conf.type || 'image') === 'image' ? 'text' : 'image';
                db.set({ guild_id: msg.guild.id, type: next });
                return i.update({ content: text(), components: rows() });
            }

            if (i.customId === 'wel_ch') {
                await i.reply({ content: 'Mention target channel.', flags: 64 });
                const collected = await msg.channel.awaitMessages({ filter: m => m.author.id === msg.author.id && m.mentions.channels.size, max: 1, time: 30000 }).catch(() => null);
                if (!collected || !collected.size) return i.followUp({ content: 'Timed out or invalid channel.', flags: 64 });
                
                const ch = collected.first().mentions.channels.first();
                db.set({ guild_id: msg.guild.id, channel_id: ch.id });
                await i.followUp({ content: `Channel set to <#${ch.id}>`, flags: 64 });
                return reply.edit({ content: text(), components: rows() }).catch(() => {});
            }

            const map = {
                wel_w_msg: { id: 'm_w', field: 'welcome_msg', label: 'Welcome Msg' },
                wel_l_msg: { id: 'm_l', field: 'leave_msg', label: 'Leave Msg' },
                wel_dm_w: { id: 'm_dw', field: 'dm_welcome', label: 'DM Welcome' },
                wel_dm_l: { id: 'm_dl', field: 'dm_leave', label: 'DM Leave' }
            };

            const target = map[i.customId];
            if (!target) return;

            const modal = new ModalBuilder().setCustomId(target.id).setTitle(target.label);
            const input = new TextInputBuilder()
                .setCustomId('val')
                .setLabel('Content (none to clear)')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(conf[target.field] || '')
                .setRequired(false);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await i.showModal(modal);

            const sub = await i.awaitModalSubmit({ filter: s => s.customId === target.id && s.user.id === msg.author.id, time: 45000 }).catch(() => null);
            if (!sub) return;

            let val = sub.fields.getTextInputValue('val');
            if (!val || val.toLowerCase() === 'none') val = null;

            db.set({ guild_id: msg.guild.id, [target.field]: val });
            await sub.reply({ content: 'Updated.', flags: 64 });
            await reply.edit({ content: text(), components: rows() }).catch(() => {});
        });
    }
};