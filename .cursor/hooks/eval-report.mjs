/**
 * Regenerates eval-report.md after an agent or subagent finishes.
 * Always exits 0. A measurement failure must not block the session.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = path.join(root, 'scripts', 'eval-report.mjs');

try {
  fs.readFileSync(0);
} catch {
  // stdin is optional
}

const result = spawnSync(process.execPath, [script], {
  cwd: root,
  stdio: ['ignore', 'inherit', 'inherit'],
});

if (result.status !== 0) {
  console.error(`eval-report hook: generator exited ${result.status ?? 'null'}`);
}

process.stdout.write('{}\n');
process.exit(0);
