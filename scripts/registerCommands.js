require('dotenv').config();
const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');

async function register() {
  const commands = [];
  const commandsPath = path.join(__dirname, '..', 'src', 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const cmd = require(path.join(commandsPath, file));
    if (cmd.data) commands.push(cmd.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log(`Registering ${commands.length} commands to guild ${process.env.GUILD_ID}...`);
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log('Commands registered successfully.');
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exit(1);
  }
}

register();
