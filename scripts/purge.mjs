/**
 * Wrapper for manual bulk-delete Playwright test.
 *
 *   npm run purge              dry run (list count, delete nothing)
 *   npm run purge -- 10        delete first 10 programs
 *   npm run purge -- all       delete all programs
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const countArg = process.argv[2];
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (countArg && !/^\d+$/.test(countArg) && !/^all$/i.test(countArg)) {
  console.error(`Invalid count "${countArg}". Use a number or "all".`);
  console.error('Example: npm run purge -- 10');
  process.exit(1);
}

const env = { ...process.env };
if (countArg) {
  env.CONFIRM_BULK_DELETE = '1';
  env.BULK_DELETE_COUNT = countArg;
  console.log(`[purge] Will delete: ${countArg === 'all' ? 'ALL programs' : `first ${countArg} program(s)`}`);
} else {
  console.log('[purge] Dry run (no count passed). Pass a number after -- to delete.');
  console.log('  npm run purge -- 10');
}

const result = spawnSync(
  'npx',
  ['playwright', 'test', '-c', 'playwright.manual.config.ts'],
  {
    stdio: 'inherit',
    env,
    shell: true,
    cwd: projectRoot,
  },
);

process.exit(result.status ?? 1);
