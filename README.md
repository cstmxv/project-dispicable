# Racing Nation Bot

A Discord bot for the Racing Nation community with moderation and utility commands.

## Features

- **Moderation Commands**: Kick, ban, mute, warn, purge, role management, channel controls
- **Utility Commands**: Ping, uptime, server info, user info, avatar, invite, vote, etc.
- **Role-based Access**: Commands require 'cmds' role

## Setup

1. **Create a Discord Bot Application**:
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to the "Bot" section and create a bot
   - Copy the bot token

2. **Get Server and Bot IDs**:
   - Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
   - Right-click your server → Copy ID (this is GUILD_ID)
   - Right-click your bot → Copy ID (this is CLIENT_ID)

3. **Invite the Bot to Your Server**:
   - Go to OAuth2 → URL Generator
   - Select scopes: `bot` and `applications.commands`
   - Select permissions: Send Messages, Use Slash Commands, Kick Members, Ban Members, Manage Roles, Manage Channels, etc.
   - Use the generated URL to invite the bot

4. **Configure the Bot**:
   - Install dependencies: `npm install`
   - Edit `.env` file with your actual credentials:
     ```
     DISCORD_TOKEN=your_actual_bot_token
     GUILD_ID=your_server_id
     CLIENT_ID=your_bot_client_id
     ```
   - Create a role named 'cmds' in your server
   - Create a channel named 'bot-use' for moderation logs
   - Run the bot: `npm start`

## Commands

The bot registers 35 slash commands automatically on startup.

### Moderation (requires 'cmds' role)
- `/kick`, `/ban`, `/mute`, `/unmute`, `/warn`, `/warnings`, `/clearwarnings`
- `/purge`, `/nick`, `/roleadd`, `/roleremove`
- `/lock`, `/unlock`, `/slowmode`, `/announce`
- `/tempban`, `/unban`, `/softban`

### Utility
- `/ping`, `/uptime`, `/botinfo`, `/serverinfo`
- `/userinfo`, `/roles`, `/avatar`, `/channelinfo`
- `/invite`, `/randommember`, `/countroles`, `/vote`, `/say`, `/serverbanner`
- `/calculator`, `/remindme`, `/poll`, `/weather`, `/translate`, `/qr`, `/shorten`, `/define`
- `/purge`, `/nick`, `/roleadd`, `/roleremove`
- `/lock`, `/unlock`, `/slowmode`, `/announce`
- `/tempban`, `/unban`, `/softban`

### Utility
- `/ping`, `/uptime`, `/botinfo`, `/serverinfo`
- `/userinfo`, `/roles`, `/avatar`, `/channelinfo`
- `/invite`, `/randommember`, `/countroles`, `/vote`, `/say`, `/serverbanner`
- `/calculator`, `/remindme`, `/poll`, `/weather`, `/translate`, `/qr`, `/shorten`, `/define`
>>>>>>> 0d36ade (Fix bot deployment issues: add missing intents, improve bot-use channel logging, update README with setup instructions)
