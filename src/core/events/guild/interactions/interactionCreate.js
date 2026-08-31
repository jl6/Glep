const path = require('path');
const { initializeDmaModSession, handleToggleOn, handleToggleOff, handleCloseChannel } = require(path.join(process.cwd(), 'src/utils/dmaMod'));
const { handleVoiceHubInteraction } = require(path.join(process.cwd(), 'src/utils/voiceHubHandler'));
const { handleAutoroleButton, handleAutoroleSetup } = require(path.join(process.cwd(), 'src/utils/selfroleHandler'));

module.exports = {
    name: 'interactionCreate',
    async execute(i, client) {
        client.activeDmaMod ??= new Map();
        client.activeDmaThreads ??= new Map();

        if (i.isButton()) {
            if (i.customId === 'dmamod_toggle_on') return handleToggleOn(i);
            if (i.customId === 'dmamod_toggle_off') return handleToggleOff(i);
            if (i.customId === 'dmamod_close_channel') return handleCloseChannel(i, client);
            if (await handleVoiceHubInteraction(i)) return;
            if (await handleAutoroleButton(i)) return;
        }

        if (i.isRoleSelectMenu() && i.customId === 'autorole_setup_select') {
            if (await handleAutoroleSetup(i)) return;
        }

        if (i.isModalSubmit() && i.customId === 'autorole_modal_submit') {
            if (await handleAutoroleSetup(i)) return;
        }

        if (i.isStringSelectMenu() && i.customId === 'dmamod_select_guild') {
            const guild = client.guilds.cache.get(i.values[0]);
            if (!guild) return i.update({ content: 'Server not found.', components: [] });
            await initializeDmaModSession(i, guild, client);
        }
    }
};