(async () => {
  try {
    const db = require('../src/services/database');
    const raidCmd = require('../src/commands/raidmode');
    const messageEvent = require('../src/events/messageCreate');

    await db.initialize();
    const guildId = 'test-guild';

    const channel = {
      name: 'general',
      isTextBased: () => true,
      permissionOverwrites: {
        edit: async (role, opts) => {
          channel.lastEdit = { role, opts };
        }
      },
      send: async (o) => {
        channel.lastSend = o;
      }
    };

    const channelsCache = {
      filter: (fn) => {
        const arr = [];
        if (fn(channel)) arr.push(['1', channel]);
        return new Map(arr);
      },
      find: (fn) => {
        if (fn(channel)) return channel;
        return null;
      }
    };

    const guild = {
      id: guildId,
      channels: { cache: channelsCache },
      roles: {
        everyone: { id: 'everyone' },
        cache: { find: (fn) => { const role = { name: 'cmds', id: 'cmdsrole' }; return fn(role) ? role : null; } }
      },
      members: { me: { roles: { highest: { position: 2 } } } }
    };

    const interaction = {
      member: { permissions: { has: () => true }, roles: { cache: new Map() } },
      guild,
      user: { id: 'exec', tag: 'exec#0001' },
      options: { getUser: () => null, getString: () => null },
      reply: async (msg) => { console.log('interaction.reply ->', msg); }
    };

    console.log('Toggling raid mode ON');
    await raidCmd.execute(interaction);
    const settings1 = await db.getGuildSettings(guildId);
    console.log('DB raidMode after ON:', settings1.raidMode);

    // Simulate a normal message by non-staff user while raid mode is active
    const message = {
      guild,
      author: { id: 'user1', bot: false, tag: 'user1#0001', send: async () => {} },
      member: { permissions: { has: () => false }, roles: { cache: new Map() }, guild },
      channel: channel,
      content: 'hello everyone',
      mentions: { roles: new Map(), users: new Map() },
      delete: async () => { message.deleted = true; }
    };

    const automod = require('../src/services/automod');
    // Ensure raid mode is active for the test
    await automod.applyRaidMode(guild, true);
    console.log('Triggering message event while raid mode active');
    await messageEvent.execute(message);

    const warnings = await db.getWarnings(guildId, message.author.id);
    console.log('Warnings for user after auto-mod trigger:', warnings.length);

    console.log('Toggling raid mode OFF');
    await raidCmd.execute(interaction);
    const settings2 = await db.getGuildSettings(guildId);
    console.log('DB raidMode after OFF:', settings2.raidMode);

    process.exit(0);
  } catch (err) {
    console.error('Test script error:', err);
    process.exit(2);
  }
})();
