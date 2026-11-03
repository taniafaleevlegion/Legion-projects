#!/usr/bin/env node
/**
 * Generation gate for agent edits under tests/**.
 *
 * afterFileEdit matchers are applied to the tool name ("Write"), not the
 * path. This script re-checks the edited file_path so only tests/** are gated.
 *
 * Exit 0 — allow
 * Exit 2 — block: no expect(, or page.locator using '.', '#', or '//'
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

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8');
} catch (err) {
  finish(1, `generation-gate: failed to read stdin (${err.message})`);
}

let payload;
try {
  payload = JSON.parse(raw);
} catch (err) {
  finish(1, `generation-gate: invalid hook input JSON (${err.message})`);
}

const filePath = typeof payload.file_path === 'string' ? payload.file_path : '';
if (!filePath) {
  finish(1, 'generation-gate: hook input missing file_path');
}

const normalized = filePath.replace(/\\/g, '/');
if (!/(?:^|\/)tests\/.+/.test(normalized)) {
  finish(0, `generation-gate: ALLOW (outside tests/**) ${filePath}`);
}

let content;
try {
  content = fs.readFileSync(filePath, 'utf8');
} catch (err) {
  finish(1, `generation-gate: could not read ${filePath} (${err.message})`);
}

const problems = [];

if (!content.includes('expect(')) {
  problems.push('spec contains no expect( (a test that asserts nothing)');
}

const locatorRe = /page\.locator\s*\(\s*(['"`])([\s\S]*?)\1/g;
for (const match of content.matchAll(locatorRe)) {
  const selector = match[2];
  if (selector.includes('.') || selector.includes('#') || selector.includes('//')) {
    const quote = match[1];
    const shown = selector.length > 80 ? `${selector.slice(0, 77)}...` : selector;
    problems.push(`CSS or XPath locator: page.locator(${quote}${shown}${quote})`);
  }
}

if (problems.length > 0) {
  finish(2, `generation-gate: BLOCK ${filePath}: ${problems.join('; ')}`);
}

finish(0, `generation-gate: ALLOW ${filePath}`);
