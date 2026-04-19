// Runner: execute all 5 Arolsen queries sequentially with a polite gap.
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const queries = [
  { slug: 'a4-harris-elizabeth',  args: ['--surname', 'Harris', '--forename', 'Elizabeth', '--keyword', 'Biberach'] },
  { slug: 'a4-harris-no-kw',      args: ['--surname', 'Harris', '--forename', 'Elizabeth'] },
  { slug: 'a4-greene-elizabeth',  args: ['--surname', 'Greene', '--forename', 'Elizabeth', '--keyword', 'Channel Islands'] },
  { slug: 'a4-bower-harris',      args: ['--surname', 'Bower Harris'] },
  { slug: 'a4-channel-islands',   args: ['--keyword', 'Channel Islands', '--year-from', '1942', '--year-to', '1945'] },
];

const SCRIPT = join('tools', 'research', 'arolsen.mjs');
const GAP_MS = 35_000;

function run(q) {
  return new Promise((resolve) => {
    const args = ['--slug', q.slug, ...q.args, '--headed', 'false', '--hold', '0'];
    console.log(`\n========== ${q.slug} ==========`);
    console.log(`> node ${SCRIPT} ${args.join(' ')}`);
    const t0 = Date.now();
    const proc = spawn(process.execPath, [SCRIPT, ...args], { stdio: 'inherit' });
    proc.on('exit', (code) => {
      console.log(`<<< ${q.slug} exited ${code} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      resolve(code);
    });
  });
}

(async () => {
  const results = [];
  for (let i = 0; i < queries.length; i++) {
    const code = await run(queries[i]);
    results.push({ slug: queries[i].slug, code });
    if (i < queries.length - 1) {
      console.log(`\n--- waiting ${GAP_MS / 1000}s before next query ---`);
      await new Promise(r => setTimeout(r, GAP_MS));
    }
  }
  console.log('\n=== ALL DONE ===');
  results.forEach(r => console.log(`${r.slug}: exit ${r.code}`));
})();
