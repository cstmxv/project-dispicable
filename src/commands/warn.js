const { SlashCommandBuilder } = require('discord.js');
const db = require('../services/database');
const { memberHasCmds } = require('../utils/permissionUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user.')
    .addUserOption(option => option.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the warning').setRequired(false)),
  async execute(interaction) {
    if (!memberHasCmds(interaction.member)) {
      return interaction.reply({ content: 'You need the cmds role to use this command.', ephemeral: true });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await db.addWarning(interaction.guild.id, target.id, reason, 'command');
    const warnings = await db.getWarnings(interaction.guild.id, target.id);
    await db.logAction({
      guildId: interaction.guild.id,
      action: 'warn',
      targetId: target.id,
      targetTag: target.tag,
      executorId: interaction.user.id,
      executorTag: interaction.user.tag,
      reason,
      metadata: { warningCount: warnings.length }
    });

    try {
      await target.send(`You have been warned in **${interaction.guild.name}** for: ${reason}`);
    } catch (error) {
      // Ignore DM failures.
    }

    await interaction.reply({ content: `Warned ${target.tag}. This is warning #${warnings.length}.`, ephemeral: true });
  }
};
