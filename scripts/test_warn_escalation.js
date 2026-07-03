const db = require('../src/services/database');
const moderation = require('../src/services/moderation');

async function run() {
  await db.initialize();

  // Mock guild and member behavior
  const guild = {
    id: 'test-guild',
    members: {
      fetch: async (id) => ({
        user: { id, tag: 'escalate#0001' },
        roles: { add: async () => {} },
        kick: async () => {},
        ban: async () => {}
      })
    },
    roles: { cache: { find: () => null }, create: async () => ({ id: 'r1', name: 'Muted' }) },
    channels: { cache: { find: () => null } }
  };

  const targetId = 'user-escalate';
  // Clear old warnings
  await db.clearWarnings(guild.id, targetId);

  // Add warnings to trigger escalation to mute at 3
  for (let i = 1; i <= 3; i++) {
    await db.addWarning(guild.id, targetId, `test warning ${i}`, 'test');
  }

  const warnings = await db.getWarnings(guild.id, targetId);
  console.log('Warnings count before escalate:', warnings.length);

  await moderation.checkAndEscalateWarnings(guild, targetId, warnings.length, db, { id: 'system', tag: 'system#0000' });

  const logs = await db.all('SELECT * FROM moderation_logs WHERE guild_id = ?', [guild.id]);
  console.log('Moderation logs:', logs.map(l => ({ action: l.action, target_id: l.target_id, metadata: l.metadata })));
}

run().catch(err => console.error(err));
