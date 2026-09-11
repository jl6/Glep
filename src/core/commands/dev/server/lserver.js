const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lserver',
    description: 'Leaves a server specified by its ID.',
    usage: '[server_id]',
    devOnly: true,
    
    async execute(msg, args, client, db) {
        const id = args[0];
        if (!id) {
            return await msg.reply('Usage: lserver <server_id>');
        }

        try {
            const guild = client.guilds.cache.get(id) || await client.guilds.fetch(id).catch(() => null);

            if (!guild) {
                return await msg.reply('Server not found.');
            }

            const name = guild.name;
            await guild.leave();

            const embed = new EmbedBuilder()
                .setTitle('Left Server')
                .setColor(0x2f3136)
                .addFields(
                    { name: 'Name', value: name, inline: true },
                    { name: 'ID', value: `\`${id}\``, inline: true }
                )
                .setTimestamp();

            await msg.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            await msg.reply('Failed to leave the server.');
        }
    }
};