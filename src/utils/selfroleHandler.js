const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database/data.db');
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS selfroles (
        guild_id TEXT,
        message_id TEXT,
        roles TEXT
    )
`);

const pendingSetups = new Map();

async function handleAutoroleButton(interaction) {
  const customId = interaction.customId;
  if (!customId.startsWith('autorole_toggle:')) return false;

  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  const roleId = customId.split(':')[1];
  const role = interaction.guild.roles.cache.get(roleId);

  if (!role) {
    await interaction.editReply('The requested role no longer exists on this server.');
    return true;
  }

  if (role.position >= interaction.guild.members.me.roles.highest.position) {
    await interaction.editReply('Cannot assign role due to role hierarchy.');
    return true;
  }

  const member = interaction.member;
  try {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await interaction.editReply(`Revoked role: ${role.name}`);
    } else {
      await member.roles.add(roleId);
      await interaction.editReply(`Granted role: ${role.name}`);
    }
  } catch (error) {
    console.error('Failed to modify member role:', error);
    await interaction.editReply('Error modifying member role.');
  }

  return true;
}

async function handleAutoroleSetup(interaction) {
  const customId = interaction.customId;

  if (customId === 'autorole_setup_select') {
    const selectedRoleIds = interaction.values;
    if (!selectedRoleIds || selectedRoleIds.length === 0) {
      await interaction.reply({
        content: 'No valid roles selected.',
        flags: [MessageFlags.Ephemeral]
      });
      return true;
    }

    pendingSetups.set(interaction.user.id, {
      roleIds: selectedRoleIds,
      setupMessageId: interaction.message?.id
    });

    const modal = new ModalBuilder()
      .setCustomId('autorole_modal_submit')
      .setTitle('Configure Role Panel');

    const messageInput = new TextInputBuilder()
      .setCustomId('panel_message')
      .setLabel('Custom Message / Header')
      .setStyle(TextInputStyle.Paragraph)
      .setValue('Click a button below to toggle your role.')
      .setRequired(true);

    const emojiInput = new TextInputBuilder()
      .setCustomId('panel_emojis')
      .setLabel('Role Emojis (Optional)')
      .setPlaceholder('e.g. 📢, 🎮')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(messageInput),
      new ActionRowBuilder().addComponents(emojiInput)
    );

    await interaction.showModal(modal);
    return true;
  }

  if (customId === 'autorole_modal_submit') {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const setupData = pendingSetups.get(interaction.user.id);
    if (!setupData || !setupData.roleIds) {
      await interaction.editReply('Session expired or setup state lost.');
      return true;
    }

    const customMessage = interaction.fields.getTextInputValue('panel_message');
    const rawEmojis = interaction.fields.getTextInputValue('panel_emojis');

    const emojiRegex = /(<a?:[a-zA-Z0-9_]+:\d{17,19}>|\p{Extended_Pictographic})/gu;
    const extractedEmojis = rawEmojis ? (rawEmojis.match(emojiRegex) || []) : [];

    const selectedRoleIds = setupData.roleIds;
    const allButtons = [];

    for (let i = 0; i < selectedRoleIds.length; i++) {
      const roleId = selectedRoleIds[i];
      const role = interaction.guild.roles.cache.get(roleId);

      if (!role) continue;
      if (role.id === interaction.guildId) continue;
      if (role.managed) continue;

      const button = new ButtonBuilder()
        .setCustomId(`autorole_toggle:${roleId}`)
        .setLabel(role.name)
        .setStyle(ButtonStyle.Secondary);

      const assignedEmoji = extractedEmojis[allButtons.length];
      if (assignedEmoji) {
        try {
          button.setEmoji(assignedEmoji);
        } catch (err) {
          console.warn(`Invalid emoji for ${role.name}:`, assignedEmoji);
        }
      }

      allButtons.push(button);
    }

    if (allButtons.length === 0) {
      await interaction.editReply('All selected roles were filtered out.');
      pendingSetups.delete(interaction.user.id);
      return true;
    }

    const rows = [];
    for (let i = 0; i < allButtons.length; i += 5) {
      const chunk = allButtons.slice(i, i + 5);
      rows.push(new ActionRowBuilder().addComponents(chunk));
    }

    const sentMsg = await interaction.channel.send({
      content: customMessage,
      components: rows
    });

    try {
      const validIds = allButtons.map(b => b.data.custom_id.split(':')[1]);
      const stmt = db.prepare('INSERT INTO selfroles (guild_id, message_id, roles) VALUES (?, ?, ?)');
      stmt.run(interaction.guild.id, sentMsg.id, JSON.stringify(validIds));
    } catch (err) {
      console.error('Failed to save selfrole station:', err.message);
    }

    if (setupData.setupMessageId) {
      const setupMsg = await interaction.channel.messages.fetch(setupData.setupMessageId).catch(() => null);
      if (setupMsg && setupMsg.deletable) {
        await setupMsg.delete().catch(() => null);
      }
    }

    await interaction.editReply(`Self role station created successfully with ${allButtons.length} role(s).`);
    pendingSetups.delete(interaction.user.id);
    return true;
  }

  return false;
}

module.exports = { handleAutoroleButton, handleAutoroleSetup };