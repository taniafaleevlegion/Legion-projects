#!/usr/bin/env node
/**
 * Constitution gate for agent edits under tests/** and pages/**.
 *
 * afterFileEdit matchers are applied to the tool name ("Write"), not the
 * path. This script re-checks file_path so only tests/** and pages/** are gated.
 * It blocks an edit that introduces a WON'T violation. A violation already
 * in the file, and left unchanged, is not an introduction.
 *
 * Exit 0 — allow
 * Exit 2 — block: new page.waitForTimeout, XPath locator, `any` type,
 *   hardcoded credential, tag on test.describe(), or a removed/weakened expect(
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

function isGatedPath(filePath) {
  return /(?:^|\/)(?:tests|pages)\/.+/.test(filePath.replace(/\\/g, '/'));
}

/**
 * Copy source, blanking comments and, when asked, string literals.
 * Strings are always walked so a `//` inside a locator is not treated as a comment.
 * Length stays the same.
 */
function mask(source, { strings, comments }) {
  let out = '';
  let i = 0;
  const n = source.length;

  while (i < n) {
    const c = source[i];

    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      const blank = strings;
      out += blank ? ' ' : c;
      i += 1;
      while (i < n) {
        if (source[i] === '\\') {
          out += blank ? '  ' : source.slice(i, i + 2);
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          out += blank ? ' ' : c;
          i += 1;
          break;
        }
        out += blank ? (source[i] === '\n' ? '\n' : ' ') : source[i];
        i += 1;
      }
      continue;
    }

    if (comments && c === '/' && source[i + 1] === '/') {
      out += '  ';
      i += 2;
      while (i < n && source[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      continue;
    }

    if (comments && c === '/' && source[i + 1] === '*') {
      out += '  ';
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      if (i < n) {
        out += '  ';
        i += 2;
      }
      continue;
    }

    out += c;
    i += 1;
  }

  return out;
}

function count(re, text) {
  return [...text.matchAll(re)].length;
}

/** Count expect( that sit in a comment, and expect( that do not. */
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

function countAny(codeOnly) {
  const patterns = [
    /:\s*any\b/g,
    /\bas\s+any\b/g,
    /<any\b/g,
    /\bany\s*\[\]/g,
    /,\s*any\s*[,>]/g,
  ];
  return patterns.reduce((sum, re) => sum + count(re, codeOnly), 0);
}

function countCredentials(source) {
  const assign =
    /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|DIDAXIS_PASSWORD)\b\s*[:=]\s*(['"`])([^'"`\n]+)\1/gi;
  let n = count(assign, source);

  const fill = /\.fill\s*\(\s*(['"`])([^'"`\n]+)\1/g;
  for (const match of source.matchAll(fill)) {
    const back = source.slice(Math.max(0, match.index - 200), match.index);
    const stmt = back.split(';').pop() ?? '';
    if (/(?:passwordField|\bPassword\b)/.test(stmt)) n += 1;
  }
  return n;
}

function describeHasTag(code, openParen) {
  let depth = 0;
  for (let i = openParen; i < code.length; i += 1) {
    const c = code[i];
    if (c === '(') {
      depth += 1;
      continue;
    }
    if (c === ')') {
      depth -= 1;
      if (depth === 0) return false;
      continue;
    }
    if (depth !== 1) continue;
    if (c === '=' && code[i + 1] === '>') return false;
    if (code.startsWith('function', i) && !/\w/.test(code[i - 1] ?? '')) return false;
    if (code.startsWith('tag', i) && !/\w/.test(code[i - 1] ?? '') && !/\w/.test(code[i + 3] ?? '')) {
      if (/^\s*:/.test(code.slice(i + 3, i + 20))) return true;
    }
  }
  return false;
}

function countDescribeTags(codeOnly) {
  const re = /test\.describe(?:\.(?:only|skip|fixme))?\s*\(/g;
  let n = 0;
  for (const match of codeOnly.matchAll(re)) {
    const openParen = match.index + match[0].length - 1;
    if (describeHasTag(codeOnly, openParen)) n += 1;
  }
  return n;
}

function analyze(source) {
  const codeOnly = mask(source, { strings: true, comments: true });
  const commentsOff = mask(source, { strings: false, comments: true });
  const expects = scanExpect(source);
  return {
    waitForTimeout: count(/page\.waitForTimeout\s*\(/g, codeOnly),
    xpath: count(/(?:locator|frameLocator)\s*\(\s*(['"`])\s*(?:xpath=|\/\/)/gi, commentsOff),
    anyType: countAny(codeOnly),
    credential: countCredentials(commentsOff),
    describeTag: countDescribeTags(codeOnly),
    expectRaw: count(/expect\(/g, source),
    expectActive: expects.active,
    expectCommented: expects.commented,
  };
}

function introductions(before, after) {
  const reasons = [];
  const labels = [
    ['waitForTimeout', 'page.waitForTimeout'],
    ['xpath', 'an XPath locator'],
    ['anyType', 'the any type'],
    ['credential', 'a hardcoded credential'],
    ['describeTag', 'a tag on test.describe()'],
  ];
  for (const [key, label] of labels) {
    if (after[key] > before[key]) {
      reasons.push(`introduced ${label} (${before[key]} -> ${after[key]})`);
    }
  }
  if (after.expectRaw < before.expectRaw) {
    reasons.push(`removed or weakened expect( (${before.expectRaw} -> ${after.expectRaw})`);
  }
  if (after.expectCommented > before.expectCommented && after.expectActive < before.expectActive) {
    reasons.push(
      `an expect( was commented out (active ${before.expectActive} -> ${after.expectActive})`,
    );
  }
  return reasons;
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

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8');
} catch (err) {
  finish(1, `block-wont: failed to read stdin (${err.message})`);
}

let payload;
try {
  payload = JSON.parse(raw);
} catch (err) {
  finish(1, `block-wont: invalid hook input JSON (${err.message})`);
}

const filePath = typeof payload.file_path === 'string' ? payload.file_path : '';
if (!filePath) {
  finish(1, 'block-wont: hook input missing file_path');
}

if (!isGatedPath(filePath)) {
  finish(0, `block-wont: ALLOW (outside tests/** and pages/**) ${filePath}`);
}

let disk = '';
try {
  disk = fs.readFileSync(filePath, 'utf8');
} catch (err) {
  finish(1, `block-wont: could not read ${filePath} (${err.message})`);
}

const edits = Array.isArray(payload.edits) ? payload.edits : [];
const reconstructed = reconstructBefore(disk, edits);
const pair = reconstructed != null ? { before: reconstructed, after: disk } : fromHunks(edits);

if (!pair) {
  finish(0, `block-wont: ALLOW (no before image) ${filePath}`);
}

const reasons = introductions(analyze(pair.before), analyze(pair.after));
if (reasons.length > 0) {
  finish(2, `block-wont: BLOCK ${filePath}: ${reasons.join('; ')}. Refuse. Stop and raise the conflict.`);
}

finish(0, `block-wont: ALLOW ${filePath}`);
