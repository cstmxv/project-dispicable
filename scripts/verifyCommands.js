const fs = require('fs');
const path = require('path');
const commandsPath = path.join(__dirname, '..', 'src', 'commands');
const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
let ok = true;
console.log(`Found ${files.length} command files`);
for (const f of files) {
  const full = path.join(commandsPath, f);
  try {
    const cmd = require(full);
    const hasData = !!cmd.data;
    const hasExecute = typeof cmd.execute === 'function';
    if (!hasData || !hasExecute) {
      console.error(`❌ ${f}: missing data or execute (data:${!!hasData}, execute:${hasExecute})`);
      ok = false;
    } else {
      console.log(`✅ ${f}: ok`);
    }
  } catch (err) {
    console.error(`❌ ${f}: error requiring file - ${err.message}`);
    ok = false;
  }
}
if (!ok) process.exit(2);
console.log('\nAll commands passed basic verification');
