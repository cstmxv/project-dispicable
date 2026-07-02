const db = require('../services/database');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      return interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Command execution error:', error);
      await interaction.reply({ content: 'There was an error while executing this command.', ephemeral: true });
    }
  }
};
