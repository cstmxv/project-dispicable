(async () => {
  try {
    const db = require('../src/services/database');
    const muteCmd = require('../src/commands/mute');
    const automod = require('../src/services/automod');

    await db.initialize();
    const guildId = 'test-guild-mute';

    const muteRole = { name: 'Muted', id: 'mutedRole' };
    const rolesCache = new Map();
    rolesCache.set(muteRole.id, muteRole);

    const channelObj = { name: 'bot-use', isTextBased: () => true, send: async () => {} };
    const channelsCache = {
      find: (fn) => {
        return fn(channelObj) ? channelObj : null;
      }
    };

    const guild = {
      id: guildId,
      roles: { cache: { find: (fn) => fn(muteRole) ? muteRole : null } },
      channels: { cache: channelsCache }
    };

    let memberHasRole = false;
    const member = {
      id: 'user-mute',
      user: { id: 'user-mute', tag: 'usermut#0001' },
      roles: {
        cache: new Map(),
        add: async (r) => { memberHasRole = true; },
        remove: async (r) => { memberHasRole = false; }
      },
      guild
    };

    const interaction = {
      member: { permissions: { has: () => true }, roles: { cache: new Map() }, guild },
      guild,
      user: { id: 'exec', tag: 'exec#0001' },
      options: {
        getUser: () => ({ id: member.id, tag: member.user.tag }),
        getInteger: () => 0.02 // 0.02 minutes = 1.2 seconds
      },
      reply: async (msg) => { console.log('interaction.reply ->', msg); }
    };

    // Mock fetch to return our member
    guild.members = { fetch: async (id) => member };

    console.log('Running mute command (short duration)');
    await muteCmd.execute(interaction);

    // Check logs
    const logs = await db.all('SELECT * FROM moderation_logs WHERE guild_id = ?', [guildId]);
    console.log('Moderation logs count:', logs.length);

    // Wait 2 seconds to allow unmute timeout
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Member has muted role after timeout?', memberHasRole);

    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(2);
  }
})();
