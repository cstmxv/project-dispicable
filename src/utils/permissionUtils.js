const { PermissionFlagsBits } = require('discord.js');

function getCmdsRole(guild) {
  return guild.roles.cache.find(role => role.name.toLowerCase() === 'cmds');
}

function memberHasCmds(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions?.has(PermissionFlagsBits.ModerateMembers)) return true;

  const cmdsRole = getCmdsRole(member.guild);
  return cmdsRole ? member.roles.cache.has(cmdsRole.id) : false;
}

module.exports = {
  getCmdsRole,
  memberHasCmds
};
