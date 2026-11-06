#!/usr/bin/env node
/**
 * Blocks a heal that weakens a test under tests/**.
 *
 * afterFileEdit matchers are applied to the tool name ("Write"), not the
 * path. This script re-checks file_path so only tests/** are gated.
 *
 * Exit 0 — allow
 * Exit 2 — block: fewer expect( than before, or an expect( was commented out
 * Other non-zero — fail closed (hooks.json failClosed: true)
 */
import fs from 'node:fs';

function finish(code, message) {
  const body =
    code === 2
      ? { permission: 'deny', user_message: message, agent_message: message }
      : { permission: 'allow', user_message: message };
  process.stdout.write(`${JSON.stringify(body)}\n`);
  process.exit(code);
}

function countExpect(text) {
  return text.match(/expect\(/g)?.length ?? 0;
}

/** Count expect( that sit in a line or block comment, and expect( that do not. */
function scanExpect(source) {
  let i = 0;
  let active = 0;
  let commented = 0;
  const n = source.length;

  while (i < n) {
    const c = source[i];

    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      i += 1;
      while (i < n) {
        if (source[i] === '\\') {
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (c === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < n && source[i] !== '\n') {
        if (source.startsWith('expect(', i)) {
          commented += 1;
          i += 7;
          continue;
        }
        i += 1;
      }
      continue;
    }

    if (c === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source.startsWith('expect(', i)) {
          commented += 1;
          i += 7;
          continue;
        }
        i += 1;
      }
      if (i < n) i += 2;
      continue;
    }

    if (source.startsWith('expect(', i)) {
      active += 1;
      i += 7;
      continue;
    }

    i += 1;
  }

  return { active, commented };
}

function isTestsPath(filePath) {
  return /(?:^|\/)tests\/.+/.test(filePath.replace(/\\/g, '/'));
}

function reconstructBefore(after, edits) {
  if (!Array.isArray(edits) || edits.length === 0) return null;
  let before = after;
  for (let i = edits.length - 1; i >= 0; i -= 1) {
    const edit = edits[i];
    if (!edit || typeof edit.old_string !== 'string' || typeof edit.new_string !== 'string') {
      return null;
    }
    if (edit.new_string === '') return null;
    const at = before.indexOf(edit.new_string);
    if (at === -1) return null;
    if (before.indexOf(edit.new_string, at + edit.new_string.length) !== -1) return null;
    before = before.slice(0, at) + edit.old_string + before.slice(at + edit.new_string.length);
  }
  return before;
}

function fromHunks(edits) {
  if (!Array.isArray(edits) || edits.length === 0) return null;
  let before = '';
  let after = '';
  for (const edit of edits) {
    if (!edit || typeof edit.old_string !== 'string' || typeof edit.new_string !== 'string') {
      return null;
    }
    before += edit.old_string;
    after += edit.new_string;
  }
  return { before, after };
}

function weakeningReasons(before, after) {
  const reasons = [];
  const beforeCount = countExpect(before);
  const afterCount = countExpect(after);
  if (afterCount < beforeCount) {
    reasons.push(`fewer expect( occurrences than before (${beforeCount} -> ${afterCount})`);
  }

  const beforeScan = scanExpect(before);
  const afterScan = scanExpect(after);
  if (afterScan.commented > beforeScan.commented && afterScan.active < beforeScan.active) {
    reasons.push(
      `an expect( was commented out (active ${beforeScan.active} -> ${afterScan.active})`,
    );
  }

  return reasons;
}

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8');
} catch (err) {
  finish(1, `block-weakened-assertion: failed to read stdin (${err.message})`);
}

let payload;
try {
  payload = JSON.parse(raw);
} catch (err) {
  finish(1, `block-weakened-assertion: invalid hook input JSON (${err.message})`);
}

const filePath = typeof payload.file_path === 'string' ? payload.file_path : '';
if (!filePath) {
  finish(1, 'block-weakened-assertion: hook input missing file_path');
}

if (!isTestsPath(filePath)) {
  finish(0, `block-weakened-assertion: ALLOW (outside tests/**) ${filePath}`);
}

let disk = '';
try {
  disk = fs.readFileSync(filePath, 'utf8');
} catch (err) {
  finish(1, `block-weakened-assertion: could not read ${filePath} (${err.message})`);
}

const edits = Array.isArray(payload.edits) ? payload.edits : [];
const reconstructed = reconstructBefore(disk, edits);
const pair = reconstructed != null ? { before: reconstructed, after: disk } : fromHunks(edits);

if (!pair) {
  finish(0, `block-weakened-assertion: ALLOW (no before image) ${filePath}`);
}

const reasons = weakeningReasons(pair.before, pair.after);
if (reasons.length > 0) {
  finish(
    2,
    `block-weakened-assertion: BLOCK ${filePath}: ${reasons.join('; ')}. Refuse. Stop and raise the conflict.`,
  );
}

finish(0, `block-weakened-assertion: ALLOW ${filePath}`);
