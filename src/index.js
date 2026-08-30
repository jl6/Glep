require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.Reaction,
        Partials.GuildMember
    ]
});

client.commands = new Collection();
client.prefix = process.env.PREFIX || '!';

const cmdDir = path.join(__dirname, 'core', 'commands');
const loadCommands = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            loadCommands(fullPath);
        } else if (entry.name.endsWith('.js')) {
            const cmd = require(fullPath);
            if (!cmd.name || !cmd.execute) continue;
            
            if (!cmd.category) {
                const rel = path.relative(cmdDir, fullPath);
                cmd.category = rel.split(path.sep)[0];
            }
            
            client.commands.set(cmd.name, cmd);
        }
    }
};

if (fs.existsSync(cmdDir)) loadCommands(cmdDir);

const evtDir = path.join(__dirname, 'core', 'events');
const loadEvents = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            loadEvents(fullPath);
        } else if (entry.name.endsWith('.js')) {
            const evt = require(fullPath);
            if (!evt.name || !evt.execute) continue;
            
            if (evt.once) {
                client.once(evt.name, (...args) => evt.execute(...args, client));
            } else {
                client.on(evt.name, (...args) => evt.execute(...args, client));
            }
        }
    }
};

if (fs.existsSync(evtDir)) loadEvents(evtDir);

client.login(process.env.TOKEN);