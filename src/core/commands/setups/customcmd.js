const { PermissionFlagsBits } = require('discord.js');
const path = require('path');
const db = require(path.resolve(__dirname, '../../../../database/db'));

module.exports = {
    name: 'customcmd',
    description: 'Manage custom text commands for the server.',
    usage: 'add|remove|list [name] [response]',
    category: 'setups',
    cleanup: false,
    userPermissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.SendMessages],

    async execute(msg, args, client) {
        const action = args[0]?.toLowerCase();
        const dbKey = `custom_cmds_${msg.guild.id}`;
        let cmds = db.get(dbKey) || {};

        if (!action || !['add', 'remove', 'list'].includes(action)) {
            return msg.reply('Usage: _customcmd add <name> <response> | remove <name> | list');
        }

        if (action === 'add') {
            const name = args[1]?.toLowerCase().replace(/[^a-z0-9]/g, '');
            const text = args.slice(2).join(' ');

            if (!name || !text) {
                return msg.reply('Provide a valid alphanumeric command name and response text.');
            }

            if (client.commands.has(name)) {
                return msg.reply(`_${name} is a built-in command and cannot be overwritten.`);
            }

            cmds[name] = text;
            db.set(dbKey, cmds);
            return msg.reply(`Created custom trigger _${name}.`);
        }

        if (action === 'remove') {
            const name = args[1]?.toLowerCase();

            if (!name || !cmds[name]) {
                return msg.reply(`Custom command _${name || ''} does not exist.`);
            }

            delete cmds[name];
            db.set(dbKey, cmds);
            return msg.reply(`Removed custom command trigger _${name}.`);
        }

        if (action === 'list') {
            const keys = Object.keys(cmds);

            if (keys.length === 0) {
                return msg.reply('No custom triggers saved for this server.');
            }

            const list = keys.map(n => `- _${n}`).join('\n');
            return msg.reply(`Custom Commands:\n${list}`);
        }
    }
};