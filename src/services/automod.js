const { EmbedBuilder } = require('discord.js');
const db = require('./database');
const autoModCooldown = new Map();

function cooldownKey(guildId, userId, reason) {
  return `${guildId}:${userId}:${reason}`;
}

async function triggerAutoMod(message, reason) {
  const key = cooldownKey(message.guild.id, message.author.id, reason);
  const now = Date.now();
  const last = autoModCooldown.get(key) || 0;
  if (now - last < 60000) {
    return;
  }

  autoModCooldown.set(key, now);

  try {
    await message.delete();
  } catch (error) {
    console.error('AutoMod failed to delete message:', error);
  }

  await db.addWarning(message.guild.id, message.author.id, reason, 'auto-mod');

  try {
    await message.author.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Auto-moderation notice')
          .setDescription(`Your message was removed because: ${reason}`)
          .setColor(0xff9900)
      ]
    });
  } catch (error) {
    // Ignore DM failures
  }
}

async function applyRaidMode(guild, enabled) {
  const textChannels = guild.channels.cache.filter(ch => ch.isTextBased());
  for (const [, channel] of textChannels) {
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, enabled ? { SendMessages: false } : { SendMessages: null });
    } catch (error) {
      console.error(`Could not update permissions for ${channel.name}:`, error);
    }
  }

  await db.setRaidMode(guild.id, enabled);
}

module.exports = { triggerAutoMod, applyRaidMode };
