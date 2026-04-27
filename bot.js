const http = require('http');
http.createServer((req, res) => res.end('Bot is running!')).listen(process.env.PORT || 8080);
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1449775322580123648';
const GUILD_ID = '1497925433251856484';

let startTime = Date.now();
const warnings = new Map(); // In-memory storage for warnings
const moderationLogs = []; // Store all moderation actions
const helpCommandUsed = new Set(); // Track which guilds have used help command
const guildMemberCounts = new Map(); // Track member milestones
const raidMode = new Set(); // Guilds in raid mode
const bannedContent = [
  // Racial slurs and hate speech (filtered list)
  /n[i1]gg[a3]r|n[i1]gg[a3]h|n[i1]gg3r/gi,
  /f[a4]gg[o0]t|f[a4]gg1t/gi,
  /wh[i1]tey|cracker|honk[e3]y/gi,
  /sand n|towel head|camel jockey/gi,
  // NSFW keywords
  /\bp[o0rn]|xxx|sex tape|nudes|horny|onlyfans/gi,
  /b[o0]obs|ass|tits|c[o0]ck|pussy/gi
];



// Function to get bot-use channel
async function getBotUseChannel(guild) {
  return guild.channels.cache.find(channel => channel.name === 'bot-use');
}

// Function to log moderation action
function logModerationAction(action) {
  moderationLogs.push({
    ...action,
    timestamp: new Date()
  });
}

// Function to send DM to user
async function sendModerationDM(user, title, reason, duration = null) {
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle(title)
      .addFields(
        { name: 'Reason', value: reason || 'No reason provided', inline: false }
      );
    if (duration) {
      dmEmbed.addFields({ name: 'Duration', value: duration, inline: false });
    }
    dmEmbed.setColor(0xff0000);
    await user.send({ embeds: [dmEmbed] });
  } catch (error) {
    console.log(`Could not DM ${user.tag}: ${error.message}`);
  }
}

const commands = [
  // Moderation Commands
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Remove a user from the server.')
    .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for kicking').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user permanently.')
    .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for banning').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Temporarily mute a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to mute').setRequired(true))
    .addIntegerOption(option => option.setName('time').setDescription('Mute duration in minutes').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove mute role from a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Record a warning for a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check the number of warnings a user has.')
    .addUserOption(option => option.setName('user').setDescription('The user to check').setRequired(true)),

  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete the last X messages in a channel.')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Change a member’s nickname.')
    .addUserOption(option => option.setName('user').setDescription('The user to nickname').setRequired(true))
    .addStringOption(option => option.setName('nickname').setDescription('New nickname').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  new SlashCommandBuilder()
    .setName('roleadd')
    .setDescription('Assign a role to a member.')
    .addUserOption(option => option.setName('user').setDescription('The user to assign role').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('The role to assign').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName('roleremove')
    .setDescription('Remove a role from a member.')
    .addUserOption(option => option.setName('user').setDescription('The user to remove role from').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('The role to remove').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel (no sending messages).')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to lock').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel.')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to unlock').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode duration in a channel.')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to set slowmode').setRequired(true))
    .addIntegerOption(option => option.setName('time').setDescription('Slowmode time in seconds').setRequired(true).setMinValue(0).setMaxValue(21600))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement message to a channel.')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to announce in').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('The announcement message').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
    .addIntegerOption(option => option.setName('hours').setDescription('Ban duration in hours').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear all warnings for a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to clear warnings for').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server.')
    .addUserOption(option => option.setName('user').setDescription('The user to unban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for unbanning').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('View moderation logs.')
    .addIntegerOption(option => option.setName('limit').setDescription('Number of logs to show (default 10)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('raidmode')
    .setDescription('Toggle raid mode - locks all channels.'),

  new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Kick user and delete their last 7 days of messages.')
    .addUserOption(option => option.setName('user').setDescription('The user to softban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for softban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName('infractions')
    .setDescription('View all infractions (warnings, mutes, kicks, bans) on a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to check').setRequired(true)),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all available moderation commands for cmds role.'),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands.map(cmd => cmd.toJSON()) },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

// Message content filter
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  
  let foundBanned = false;
  let bannedType = '';
  
  for (const regex of bannedContent) {
    if (regex.test(message.content)) {
      foundBanned = true;
      bannedType = message.content.match(/nig|fagg|sand|porn|xxx|nud|horny/) ? 'Hate Speech/Slur' : 'NSFW Content';
      break;
    }
  }
  
  if (foundBanned) {
    try {
      await message.delete();
        const modsChannel = message.guild.channels.cache.find(c => c.name === 'bot-use');
      if (modsChannel) {
        const reportEmbed = new EmbedBuilder()
          .setTitle('⚠️ Content Filter Alert')
          .addFields(
            { name: 'Type', value: bannedType, inline: true },
            { name: 'User', value: message.author.tag, inline: true },
            { name: 'Channel', value: message.channel.name, inline: true },
            { name: 'Message', value: message.content.substring(0, 100), inline: false }
          )
          .setColor(0xff0000);
        await modsChannel.send({ embeds: [reportEmbed] });
      }
    } catch (err) {
      console.error(`Could not delete message: ${err}`);
    }
  }

  // Auto-delete non-command messages in lap-times channel
  if (message.channel.name === 'lap-times' && !message.content.startsWith('/')) {
    try {
      await message.delete();
    } catch (err) {
      console.error(`Could not delete message from lap-times: ${err}`);
    }
  }
});

// Member milestone tracking
client.on('guildMemberAdd', async member => {
  const guild = member.guild;
  const memberCount = guild.memberCount;
  
  if (memberCount % 50 === 0 || memberCount % 100 === 0) {
    const announceChannel = guild.channels.cache.find(c => c.name === 'announcements' || c.name === 'general');
    if (announceChannel && announceChannel.isTextBased()) {
      const milestoneEmbed = new EmbedBuilder()
        .setTitle('🎉 Milestone Reached!')
        .setDescription(`Welcome to our ${memberCount}th member!`)
        .setColor(0x00ff00);
      await announceChannel.send({ embeds: [milestoneEmbed] });
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const member = interaction.member;
  const guild = interaction.guild;

  const cmdsRole = guild.roles.cache.find(role => role.name.toLowerCase() === 'cmds');
  if (!cmdsRole || !member.roles.cache.has(cmdsRole.id)) {
    return interaction.reply({ content: 'You need the cmds role to use this bot.', ephemeral: true });
  }

  if (['kick', 'ban', 'mute', 'unmute', 'tempban', 'unban', 'softban'].includes(commandName)) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember && targetMember.roles.highest.position >= member.roles.highest.position) {
      return interaction.reply({ content: 'You cannot perform actions on users with equal or higher roles.', ephemeral: true });
    }
  }

  try {
    switch (commandName) {
      case 'kick': {
        const kickUser = interaction.options.getUser('user');
        const kickReason = interaction.options.getString('reason') || 'No reason provided';
        const kickMember = await guild.members.fetch(kickUser.id);
        await kickMember.kick(kickReason);
        await sendModerationDM(kickUser, 'You have been kicked', kickReason);
        logModerationAction({ action: 'kick', executor: interaction.user.tag, target: kickUser.tag, reason: kickReason });
        await interaction.reply({ content: `Kicked ${kickUser.tag} for: ${kickReason}`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Kick Command Used**\nUser: ${interaction.user.tag}\nTarget: ${kickUser.tag}\nReason: ${kickReason}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'ban': {
        const banUser = interaction.options.getUser('user');
        const banReason = interaction.options.getString('reason') || 'No reason provided';
        await guild.members.ban(banUser, { reason: banReason });
        await sendModerationDM(banUser, 'You have been banned', banReason);
        logModerationAction({ action: 'ban', executor: interaction.user.tag, target: banUser.tag, reason: banReason });
        await interaction.reply({ content: `Banned ${banUser.tag} for: ${banReason}`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Ban Command Used**\nUser: ${interaction.user.tag}\nTarget: ${banUser.tag}\nReason: ${banReason}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'mute': {
        const muteUser = interaction.options.getUser('user');
        const muteTime = interaction.options.getInteger('time');
        const muteMember = await guild.members.fetch(muteUser.id);
        const muteRole = guild.roles.cache.find(role => role.name === 'Muted');
        if (!muteRole) return interaction.reply('Muted role not found. Please create a role named "Muted".');
        await muteMember.roles.add(muteRole);
        await sendModerationDM(muteUser, 'You have been muted', 'Check channel for reason', `${muteTime} minutes`);
        logModerationAction({ action: 'mute', executor: interaction.user.tag, target: muteUser.tag, duration: `${muteTime} minutes` });
        setTimeout(async () => {
          await muteMember.roles.remove(muteRole);
        }, muteTime * 60000);
        await interaction.reply({ content: `Muted ${muteUser.tag} for ${muteTime} minutes.`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Mute Command Used**\nUser: ${interaction.user.tag}\nTarget: ${muteUser.tag}\nDuration: ${muteTime} minutes\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'unmute': {
        const unmuteUser = interaction.options.getUser('user');
        const unmuteMember = await guild.members.fetch(unmuteUser.id);
        const unmuteRole = guild.roles.cache.find(role => role.name === 'Muted');
        if (!unmuteRole) return interaction.reply('Muted role not found.');
        await unmuteMember.roles.remove(unmuteRole);
        await interaction.reply({ content: `Unmuted ${unmuteUser.tag}.`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Unmute Command Used**\nUser: ${interaction.user.tag}\nTarget: ${unmuteUser.tag}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'warn': {
        const warnUser = interaction.options.getUser('user');
        const warnReason = interaction.options.getString('reason') || 'No reason provided';
        const userWarnings = warnings.get(warnUser.id) || [];
        userWarnings.push({ reason: warnReason, date: new Date() });
        warnings.set(warnUser.id, userWarnings);
        const warnCount = userWarnings.length;
        
        await sendModerationDM(warnUser, 'You have been warned', warnReason);
        logModerationAction({ action: 'warn', executor: interaction.user.tag, target: warnUser.tag, reason: warnReason, warningCount: warnCount });
        
        let autoAction = '';
        // Auto-actions for warn limits
        if (warnCount === 3) {
          try {
            const warnMember = await guild.members.fetch(warnUser.id);
            await warnMember.kick('Auto-kicked: 3 warnings reached');
            autoAction = '\n⚠️ **Auto-Action: User kicked (3 warnings)**';
            logModerationAction({ action: 'kick', executor: 'Auto-System', target: warnUser.tag, reason: '3 warnings auto-kick' });
          } catch (err) {
            autoAction = '\n❌ Could not auto-kick user';
          }
        } else if (warnCount === 5) {
          try {
            await guild.members.ban(warnUser, { reason: 'Auto-banned: 5 warnings reached' });
            autoAction = '\n⚠️ **Auto-Action: User banned (5 warnings)**';
            logModerationAction({ action: 'ban', executor: 'Auto-System', target: warnUser.tag, reason: '5 warnings auto-ban' });
          } catch (err) {
            autoAction = '\n❌ Could not auto-ban user';
          }
        }
        
        await interaction.reply({ content: `Warned ${warnUser.tag} for: ${warnReason} (Total warnings: ${warnCount})${autoAction}`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Warn Command Used**\nUser: ${interaction.user.tag}\nTarget: ${warnUser.tag}\nReason: ${warnReason}\nTotal Warnings: ${warnCount}${autoAction}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'warnings': {
        const warningsUser = interaction.options.getUser('user');
        const userWarns = warnings.get(warningsUser.id) || [];
        const embed = new EmbedBuilder()
          .setTitle(`Warnings for ${warningsUser.tag}`)
          .setDescription(userWarns.length ? userWarns.map((w, i) => `${i+1}. ${w.reason} (${w.date.toDateString()})`).join('\n') : 'No warnings.')
          .setColor(0xff0000);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Warnings Command Used**\nUser: ${interaction.user.tag}\nTarget: ${warningsUser.tag}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'purge': {
        const amount = interaction.options.getInteger('amount');
        await interaction.channel.bulkDelete(amount);
        await interaction.reply({ content: `Deleted ${amount} messages.`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Purge Command Used**\nUser: ${interaction.user.tag}\nChannel: ${interaction.channel.name}\nAmount: ${amount}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'nick': {
        const nickUser = interaction.options.getUser('user');
        const nickname = interaction.options.getString('nickname');
        const nickMember = await guild.members.fetch(nickUser.id);
        await nickMember.setNickname(nickname);
        await interaction.reply({ content: `Changed ${nickUser.tag}'s nickname to ${nickname}.`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Nick Command Used**\nUser: ${interaction.user.tag}\nTarget: ${nickUser.tag}\nNew Nickname: ${nickname}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'roleadd': {
        const roleAddUser = interaction.options.getUser('user');
        const roleAdd = interaction.options.getRole('role');
        const roleAddMember = await guild.members.fetch(roleAddUser.id);
        await roleAddMember.roles.add(roleAdd);
        await interaction.reply({ content: `Added role ${roleAdd.name} to ${roleAddUser.tag}.`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Roleadd Command Used**\nUser: ${interaction.user.tag}\nTarget: ${roleAddUser.tag}\nRole: ${roleAdd.name}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'roleremove': {
        const roleRemoveUser = interaction.options.getUser('user');
        const roleRemove = interaction.options.getRole('role');
        const roleRemoveMember = await guild.members.fetch(roleRemoveUser.id);
        await roleRemoveMember.roles.remove(roleRemove);
        await interaction.reply({ content: `Removed role ${roleRemove.name} from ${roleRemoveUser.tag}.`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Roleremove Command Used**\nUser: ${interaction.user.tag}\nTarget: ${roleRemoveUser.tag}\nRole: ${roleRemove.name}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'lock': {
        const lockChannel = interaction.options.getChannel('channel');
        await lockChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        await interaction.reply({ content: `Locked ${lockChannel.name}.`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Lock Command Used**\nUser: ${interaction.user.tag}\nChannel: ${lockChannel.name}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'unlock': {
        const unlockChannel = interaction.options.getChannel('channel');
        await unlockChannel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
        await interaction.reply({ content: `Unlocked ${unlockChannel.name}.`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Unlock Command Used**\nUser: ${interaction.user.tag}\nChannel: ${unlockChannel.name}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'slowmode': {
        const slowChannel = interaction.options.getChannel('channel');
        const slowTime = interaction.options.getInteger('time');
        await slowChannel.setRateLimitPerUser(slowTime);
        await interaction.reply({ content: `Set slowmode in ${slowChannel.name} to ${slowTime} seconds.`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Slowmode Command Used**\nUser: ${interaction.user.tag}\nChannel: ${slowChannel.name}\nTime: ${slowTime} seconds\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'announce': {
        const announceChannel = interaction.options.getChannel('channel');
        const announceMessage = interaction.options.getString('message');
        await announceChannel.send(announceMessage);
        await interaction.reply({ content: 'Announcement sent.', ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Announce Command Used**\nUser: ${interaction.user.tag}\nChannel: ${announceChannel.name}\nMessage: ${announceMessage}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'tempban': {
        const tempbanUser = interaction.options.getUser('user');
        const tempbanHours = interaction.options.getInteger('hours');
        const tempbanReason = interaction.options.getString('reason') || 'No reason provided';
        await guild.members.ban(tempbanUser, { reason: tempbanReason });
        await sendModerationDM(tempbanUser, 'You have been temporarily banned', tempbanReason, `${tempbanHours} hours`);
        logModerationAction({ action: 'tempban', executor: interaction.user.tag, target: tempbanUser.tag, duration: `${tempbanHours} hours`, reason: tempbanReason });
        await interaction.reply({ content: `Temporarily banned ${tempbanUser.tag} for ${tempbanHours} hours. Reason: ${tempbanReason}`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Tempban Command Used**\nUser: ${interaction.user.tag}\nTarget: ${tempbanUser.tag}\nDuration: ${tempbanHours} hours\nReason: ${tempbanReason}\nTimestamp: ${new Date().toISOString()}`);
        }
        setTimeout(async () => {
          try {
            await guild.bans.remove(tempbanUser.id, 'Temporary ban expired');
          } catch (err) {
            console.error(`Failed to unban ${tempbanUser.tag}: ${err}`);
          }
        }, tempbanHours * 3600000);
        break;
      }

      case 'clearwarnings': {
        const clearUser = interaction.options.getUser('user');
        const clearedCount = warnings.get(clearUser.id)?.length || 0;
        warnings.delete(clearUser.id);
        logModerationAction({ action: 'clearwarnings', executor: interaction.user.tag, target: clearUser.tag, clearedCount: clearedCount });
        await interaction.reply({ content: `Cleared all ${clearedCount} warnings for ${clearUser.tag}.`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Clearwarnings Command Used**\nUser: ${interaction.user.tag}\nTarget: ${clearUser.tag}\nCleared Warnings: ${clearedCount}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'unban': {
        const unbanUser = interaction.options.getUser('user');
        const unbanReason = interaction.options.getString('reason') || 'No reason provided';
        await guild.bans.remove(unbanUser.id, unbanReason);
        logModerationAction({ action: 'unban', executor: interaction.user.tag, target: unbanUser.tag, reason: unbanReason });
        await interaction.reply({ content: `Unbanned ${unbanUser.tag}. Reason: ${unbanReason}`, ephemeral: true });
        const botUseChannel = await getBotUseChannel(guild);
        if (botUseChannel) {
          await botUseChannel.send(`**Unban Command Used**\nUser: ${interaction.user.tag}\nTarget: ${unbanUser.tag}\nReason: ${unbanReason}\nTimestamp: ${new Date().toISOString()}`);
        }
        break;
      }

      case 'logs':
        const logLimit = interaction.options.getInteger('limit') || 10;
        const recentLogs = moderationLogs.slice(-logLimit);
        if (recentLogs.length === 0) {
          return interaction.reply({ content: 'No moderation logs found.', ephemeral: true });
        }
        const logsEmbed = new EmbedBuilder()
          .setTitle(`Last ${recentLogs.length} Moderation Actions`)
          .setColor(0x0000ff);
        recentLogs.forEach((log, index) => {
          const logText = `**${log.action.toUpperCase()}** by ${log.executor} on ${log.target}${log.reason ? ` - Reason: ${log.reason}` : ''}${log.duration ? ` - Duration: ${log.duration}` : ''}${log.warningCount ? ` - Warnings: ${log.warningCount}` : ''}${log.clearedCount !== undefined ? ` - Cleared: ${log.clearedCount}` : ''}`;
          logsEmbed.addFields({ name: `#${recentLogs.length - index}`, value: logText, inline: false });
        });
        await interaction.reply({ embeds: [logsEmbed], ephemeral: true });
        break;





















      case 'help':
        if (helpCommandUsed.has(guild.id)) {
          return interaction.reply({ content: 'This command has already been used in this server! The help message is pinned above.', ephemeral: true });
        }
        
        helpCommandUsed.add(guild.id);
        
        const helpEmbed = new EmbedBuilder()
          .setTitle('🔧 Racing Nation Bot - Moderation Commands')
          .setDescription('Available moderation commands for users with the cmds role.')
          .addFields(
            { name: '🛡️ MODERATION', value: '`/kick` - Remove user\n`/ban` - Ban user\n`/unban` - Unban user\n`/tempban` - Temp ban (hours)\n`/mute` - Timeout user\n`/unmute` - Remove timeout\n`/warn` - Warn user\n`/warnings` - Check warnings\n`/clearwarnings` - Clear all warnings\n`/purge` - Delete messages\n`/nick` - Change nickname\n`/roleadd` - Add role\n`/roleremove` - Remove role\n`/lock` - Lock channel\n`/unlock` - Unlock channel\n`/slowmode` - Set slowmode\n`/announce` - Send announcement\n`/logs` - View moderation logs\n`/softban` - Softban user\n`/infractions` - View user infractions\n`/raidmode` - Toggle raid mode', inline: false }
          )
          .setFooter({ text: 'This command can only be used once per server.' })
          .setColor(0xff6600);
        
        const msg = await interaction.reply({ embeds: [helpEmbed] });
        await msg.pin();
        break;

      case 'raidmode':
        const isRaidMode = raidMode.has(guild.id);
        if (isRaidMode) {
          raidMode.delete(guild.id);
          // Unlock all channels
          const channels = guild.channels.cache.filter(ch => ch.isTextBased());
          for (const [, channel] of channels) {
            try {
              await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            } catch (err) {
              console.error(`Could not unlock ${channel.name}`);
            }
          }
          await interaction.reply({ content: '🟢 **Raid mode DISABLED** - All channels unlocked.', ephemeral: false });
          logModerationAction({ action: 'raidmode-disable', executor: interaction.user.tag, target: 'Guild', reason: 'Raid mode disabled' });
          const botUseChannel = await getBotUseChannel(guild);
          if (botUseChannel) {
            await botUseChannel.send(`**Raidmode Disabled**\nUser: ${interaction.user.tag}\nTimestamp: ${new Date().toISOString()}`);
          }
        } else {
          raidMode.add(guild.id);
          // Lock all channels
          const channels = guild.channels.cache.filter(ch => ch.isTextBased());
          for (const [, channel] of channels) {
            try {
              await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            } catch (err) {
              console.error(`Could not lock ${channel.name}`);
            }
          }
          await interaction.reply({ content: '🔴 **RAID MODE ACTIVATED** - All channels locked. Use `/raidmode` to disable.', ephemeral: false });
          logModerationAction({ action: 'raidmode-enable', executor: interaction.user.tag, target: 'Guild', reason: 'Raid mode activated' });
          const botUseChannel = await getBotUseChannel(guild);
          if (botUseChannel) {
            await botUseChannel.send(`**Raidmode Enabled**\nUser: ${interaction.user.tag}\nTimestamp: ${new Date().toISOString()}`);
          }
        }
        break;

      case 'softban':
        const softbanUser = interaction.options.getUser('user');
        const softbanReason = interaction.options.getString('reason') || 'No reason provided';
        try {
          const softbanMember = await guild.members.fetch(softbanUser.id);
          // Delete 7 days of messages
          const messages = await interaction.channel.messages.fetch({ limit: 100 });
          const userMessages = messages.filter(m => m.author.id === softbanUser.id && (Date.now() - m.createdTimestamp) < 7 * 24 * 60 * 60 * 1000);
          for (const [, msg] of userMessages) {
            try {
              await msg.delete();
            } catch (err) {
              console.error(`Could not delete message: ${err}`);
            }
          }
          // Kick user
          await softbanMember.kick(softbanReason);
          await sendModerationDM(softbanUser, 'You have been softbanned', softbanReason);
          logModerationAction({ action: 'softban', executor: interaction.user.tag, target: softbanUser.tag, reason: softbanReason });
          await interaction.reply({ content: `✅ Softbanned ${softbanUser.tag} and deleted last 7 days of messages. Reason: ${softbanReason}`, ephemeral: true });
          const botUseChannel = await getBotUseChannel(guild);
          if (botUseChannel) {
            await botUseChannel.send(`**Softban Command Used**\nUser: ${interaction.user.tag}\nTarget: ${softbanUser.tag}\nReason: ${softbanReason}\nTimestamp: ${new Date().toISOString()}`);
          }
        } catch (err) {
          await interaction.reply({ content: `❌ Failed to softban user: ${err.message}`, ephemeral: true });
        }
        break;

      case 'infractions':
        const infractionUser = interaction.options.getUser('user');
        const userInfractions = moderationLogs.filter(log => log.target === infractionUser.tag);
        
        if (userInfractions.length === 0) {
          return interaction.reply({ content: `No infractions found for ${infractionUser.tag}.`, ephemeral: true });
        }
        
        const infractionEmbed = new EmbedBuilder()
          .setTitle(`📋 Infractions for ${infractionUser.tag}`)
          .setColor(0xff0000);
        
        userInfractions.forEach((infr, index) => {
          const infrText = `**${infr.action.toUpperCase()}** by ${infr.executor}\nReason: ${infr.reason || 'N/A'}\nDate: ${infr.timestamp.toDateString()}`;
          infractionEmbed.addFields({ name: `#${index + 1}`, value: infrText, inline: false });
        });
        
        infractionEmbed.setFooter({ text: `Total infractions: ${userInfractions.length}` });
        await interaction.reply({ embeds: [infractionEmbed], ephemeral: true });
        break;

      default:
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
  }
});

client.on('messageCreate', message => {
    if (message.channel.name === 'partners' && !message.author.bot) {
        message.delete();
    }
});

client.login(TOKEN);
