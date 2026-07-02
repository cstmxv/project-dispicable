const { EmbedBuilder } = require('discord.js');

function getBotUseChannel(guild) {
  return guild.channels.cache.find(ch => ['bot-use', 'mod-logs', 'moderation', 'logs'].includes(ch.name.toLowerCase()) && ch.isTextBased()) || null;
}

async function sendModerationDM(user, title, reason) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0xff0000)
    .addFields({ name: 'Reason', value: reason || 'No reason provided' });

  try {
    await user.send({ embeds: [embed] });
  } catch (error) {
    // ignore DM failures
  }
}

async function logModerationAction(guild, action, logService, details) {
  const botUseChannel = getBotUseChannel(guild);
  await logService.logAction({
    guildId: guild.id,
    action,
    targetId: details.targetId,
    targetTag: details.targetTag,
    executorId: details.executorId,
    executorTag: details.executorTag,
    reason: details.reason,
    metadata: details.metadata || {}
  });

  if (!botUseChannel) return;

  const embed = new EmbedBuilder()
    .setTitle('Moderation Action')
    .setDescription(details.description)
    .setColor(0xff0000)
    .setTimestamp();

  await botUseChannel.send({ embeds: [embed] }).catch(() => null);
}

module.exports = {
  getBotUseChannel,
  sendModerationDM,
  logModerationAction
};
