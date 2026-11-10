/**
 * Reliability report for the Playwright suite.
 * Cursor has no telemetry for these numbers. This script measures them from
 * GitHub Actions annotations, pull request history, and local agent transcripts.
 *
 * Usage: node scripts/eval-report.mjs
 * Writes eval-report.md at the repo root.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'eval-report.md');
const RUN_WINDOW = 10;
const WORKFLOWS = ['E2E Tests', 'Playwright Tests'];

function gh(args) {
  return execFileSync('gh', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  });
}

function ghJson(args) {
  return JSON.parse(gh(args));
}

function repoSlug() {
  const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (!match) throw new Error(`Cannot read GitHub repo from origin: ${remote}`);
  return `${match[1]}/${match[2]}`;
}

function parseSummary(message) {
  const count = (label) => {
    const match = message.match(new RegExp(`^\\s*(\\d+) ${label}\\b`, 'm'));
    return match ? Number(match[1]) : 0;
  };
  const flakyNames = [];
  let inFlaky = false;
  for (const line of message.split('\n')) {
    if (/^\s*\d+ flaky\s*$/.test(line)) {
      inFlaky = true;
      continue;
    }
    if (inFlaky && /^\s*\d+ (failed|flaky|skipped|passed|did not run)\b/.test(line)) {
      inFlaky = false;
    }
    if (inFlaky && line.trim().startsWith('[')) flakyNames.push(line.trim());
  }
  const hasSummary = /^\s*\d+ (failed|flaky|skipped|passed)\b/m.test(message);
  return {
    hasSummary,
    failed: count('failed'),
    flaky: count('flaky'),
    skipped: count('skipped'),
    passed: count('passed'),
    flakyNames,
  };
}

function measureFlakes(slug) {
  const runs = ghJson([
    'run',
    'list',
    '--repo',
    slug,
    '--limit',
    '40',
    '--json',
    'databaseId,name,conclusion,status,createdAt,url,headBranch,event,displayTitle',
  ]);
  const selected = runs
    .filter(
      (run) =>
        WORKFLOWS.includes(run.name) &&
        run.status === 'completed' &&
        (run.conclusion === 'success' || run.conclusion === 'failure'),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RUN_WINDOW);

  const measured = [];
  const unmeasured = [];
  for (const run of selected) {
    const view = ghJson(['run', 'view', String(run.databaseId), '--repo', slug, '--json', 'jobs']);
    const job = (view.jobs || []).find((item) => item.name === 'test') || (view.jobs || [])[0];
    if (!job) {
      unmeasured.push({ ...run, reason: 'no job' });
      continue;
    }
    const annotations = ghJson([
      'api',
      `repos/${slug}/check-runs/${job.databaseId}/annotations`,
      '--paginate',
    ]);
    const summary = (Array.isArray(annotations) ? annotations : []).find(
      (item) => item.title === '🎭 Playwright Run Summary',
    );
    if (!summary) {
      unmeasured.push({ ...run, reason: 'no Playwright summary annotation' });
      continue;
    }
    const parsed = parseSummary(summary.message || '');
    if (!parsed.hasSummary) {
      unmeasured.push({ ...run, reason: 'summary annotation had no counts' });
      continue;
    }
    measured.push({ ...run, ...parsed });
  }

  const flaky = measured.reduce((sum, run) => sum + run.flaky, 0);
  const executed = measured.reduce((sum, run) => sum + run.passed + run.failed + run.flaky, 0);
  const names = [];
  for (const run of measured) {
    for (const name of run.flakyNames) {
      names.push({ run: run.databaseId, url: run.url, name });
    }
  }
  return { window: RUN_WINDOW, selected: selected.length, measured, unmeasured, flaky, executed, names };
}

function isHealText(value) {
  const subject = (value || '').split('\n')[0];
  return /^(self-heal|heal)\b|locator drift|drifted locator/i.test(subject);
}

function expectCount(source) {
  return [...source.matchAll(/expect\s*\(/g)].length;
}

function measureHeals(slug) {
  const pulls = ghJson([
    'pr',
    'list',
    '--repo',
    slug,
    '--state',
    'all',
    '--limit',
    '100',
    '--json',
    'number,title,body,url,state',
  ]);
  const commits = ghJson([
    'api',
    `repos/${slug}/commits?per_page=100`,
    '--jq',
    '[.[] | {sha: .sha, message: .commit.message}]',
  ]);
  const healPulls = pulls.filter((pr) => isHealText(`${pr.title}\n${pr.body}`));
  const healCommits = commits.filter((commit) => isHealText(commit.message));
  let masked = 0;
  let clean = 0;
  const rows = [];
  for (const pr of healPulls) {
    const diff = gh(['pr', 'diff', String(pr.number), '--repo', slug]);
    const specHunks = diff.split(/^diff --git /m).filter((hunk) => /\/tests\/.*\.spec\.ts/.test(hunk.split('\n')[0] || ''));
    let removedExpects = 0;
    for (const hunk of specHunks) {
      const added = [];
      const removed = [];
      for (const line of hunk.split('\n')) {
        if (line.startsWith('+') && !line.startsWith('+++')) added.push(line.slice(1));
        if (line.startsWith('-') && !line.startsWith('---')) removed.push(line.slice(1));
      }
      removedExpects += Math.max(0, expectCount(removed.join('\n')) - expectCount(added.join('\n')));
    }
    const maskedHere = removedExpects > 0;
    if (maskedHere) masked += 1;
    else clean += 1;
    rows.push({ url: pr.url, title: pr.title, masked: maskedHere, removedExpects });
  }
  return {
    total: healPulls.length,
    clean,
    masked,
    rows,
    commitHits: healCommits.map((commit) => ({
      sha: commit.sha.slice(0, 7),
      message: commit.message.split('\n')[0],
    })),
  };
}

function scenarioTitles(feature) {
  return [...feature.matchAll(/^\s*Scenario(?: Outline)?:\s*(.+)\s*$/gm)].map((match) => match[1].trim());
}

function testTitles(spec) {
  return [...spec.matchAll(/test(?:\.(?:fixme|skip|only))?\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map(
    (match) => match[2],
  );
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scenarioMapped(scenario, titles) {
  const needle = normalize(scenario);
  if (needle.length < 12) return false;
  return titles.some((title) => normalize(title).includes(needle));
}

function conformanceProblems(spec) {
  const problems = [];
  if (!spec.includes('expect(')) problems.push('no expect(');
  if (/page\.waitForTimeout\s*\(/.test(spec)) problems.push('waitForTimeout');
  if (/(?:locator|frameLocator)\s*\(\s*(['"`])\s*(?:xpath=|\/\/)/i.test(spec)) problems.push('XPath');
  if (/\bany\b/.test(spec) && /:\s*any\b|as\s+any\b/.test(spec)) problems.push('any type');
  const locatorRe = /page\.locator\s*\(\s*(['"`])([\s\S]*?)\1/g;
  for (const match of spec.matchAll(locatorRe)) {
    if (/[.#]|\/\//.test(match[2])) problems.push('CSS or XPath locator');
  }
  return [...new Set(problems)];
}

function fileAt(slug, ref, filePath) {
  const encoded = filePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  const payload = ghJson(['api', `repos/${slug}/contents/${encoded}?ref=${encodeURIComponent(ref)}`]);
  return Buffer.from(payload.content, 'base64').toString('utf8');
}

function firstSuiteConclusion(slug, number) {
  const commits = ghJson(['api', `repos/${slug}/pulls/${number}/commits?per_page=100`]);
  const runs = [];
  for (const commit of commits) {
    const payload = ghJson(['api', `repos/${slug}/commits/${commit.sha}/check-runs?per_page=100`]);
    for (const check of payload.check_runs || []) {
      if (!WORKFLOWS.includes(check.name) && check.name !== 'test') continue;
      if (!check.started_at) continue;
      runs.push({ name: check.name, conclusion: check.conclusion, started_at: check.started_at });
    }
  }
  runs.sort((a, b) => a.started_at.localeCompare(b.started_at));
  return runs[0] || null;
}

function measureGeneration(slug) {
  const pulls = ghJson([
    'pr',
    'list',
    '--repo',
    slug,
    '--state',
    'all',
    '--limit',
    '100',
    '--json',
    'number,title,headRefName,url,files',
  ]);
  const generated = pulls.filter(
    (pr) =>
      pr.headRefName.startsWith('cursor/') &&
      (pr.files || []).some((file) => /^tests\/.+\.spec\.ts$/.test(file.path)),
  );
  const rows = [];
  for (const pr of generated) {
    const specPaths = pr.files.filter((file) => /^tests\/.+\.spec\.ts$/.test(file.path)).map((file) => file.path);
    const featurePaths = pr.files.filter((file) => /^features\/.+\.feature$/.test(file.path)).map((file) => file.path);
    const specs = specPaths.map((filePath) => fileAt(slug, pr.headRefName, filePath));
    const problems = [...new Set(specs.flatMap(conformanceProblems))];
    let mapped = false;
    let scenarioCount = 0;
    let mappedCount = 0;
    const titles = specs.flatMap(testTitles);
    if (featurePaths.length === 0) {
      mapped = false;
    } else {
      const scenarios = featurePaths.flatMap((filePath) => scenarioTitles(fileAt(slug, pr.headRefName, filePath)));
      scenarioCount = scenarios.length;
      mappedCount = scenarios.filter((scenario) => scenarioMapped(scenario, titles)).length;
      mapped = scenarioCount > 0 && mappedCount === scenarioCount;
    }
    const first = firstSuiteConclusion(slug, pr.number);
    const green = first?.conclusion === 'success';
    const conforming = problems.length === 0;
    const pass = green && conforming && mapped;
    rows.push({
      number: pr.number,
      title: pr.title,
      url: pr.url,
      green,
      first: first ? `${first.name} ${first.conclusion}` : 'no suite check',
      conforming,
      problems,
      mapped,
      scenarioCount,
      mappedCount,
      pass,
    });
  }
  const passed = rows.filter((row) => row.pass).length;
  return { total: rows.length, passed, rows };
}

function transcriptFiles() {
  const projects = path.join(os.homedir(), '.cursor', 'projects');
  if (!fs.existsSync(projects)) return [];
  const files = [];
  for (const entry of fs.readdirSync(projects, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/legion-projects/i.test(entry.name)) continue;
    const dir = path.join(projects, entry.name, 'agent-transcripts');
    if (!fs.existsSync(dir)) continue;
    const walk = (current) => {
      for (const child of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, child.name);
        if (child.isDirectory()) walk(full);
        else if (child.name.endsWith('.jsonl')) files.push(full);
      }
    };
    walk(dir);
  }
  return files;
}

function measureAskVsGuess() {
  const files = transcriptFiles();
  if (files.length === 0) return { available: false, asks: null, guesses: null, askSamples: [], guessSamples: [] };
  let asks = 0;
  let guesses = 0;
  const askSamples = [];
  const guessSamples = [];
  const guessRe = /\b(I(?:'|’)ll assume|I assumed|I(?:'|’)m assuming|best guess|I invented)\b/i;
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\n/).filter(Boolean);
    for (const line of lines) {
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      const content = event.message?.content;
      if (!Array.isArray(content) || event.role !== 'assistant') continue;
      for (const block of content) {
        if (block.type === 'tool_use' && block.name === 'AskQuestion') {
          const questions = block.input?.questions;
          const count = Array.isArray(questions) ? questions.length : 1;
          asks += count;
          if (askSamples.length < 5 && Array.isArray(questions)) {
            askSamples.push(questions.map((question) => question.prompt).filter(Boolean).join(' '));
          }
        }
        if (block.type === 'text' && guessRe.test(block.text || '')) {
          guesses += 1;
          if (guessSamples.length < 5) {
            const match = (block.text || '').match(guessRe);
            guessSamples.push(match ? match[0] : 'guess');
          }
        }
      }
    }
  }
  return { available: true, files: files.length, asks, guesses, askSamples, guessSamples };
}

function carriedAsk(previous) {
  const match = previous.match(/<!-- ask-vs-guess: asks=(\d+) guesses=(\d+) measured=([^ ]+) -->/);
  if (!match) return null;
  return { asks: Number(match[1]), guesses: Number(match[2]), measured: match[3] };
}

function pct(part, whole) {
  if (whole === 0) return 'n/a';
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function riskAndAction(flake, heals, generation, ask) {
  if (heals.masked > 0) {
    return {
      risk: `${heals.masked} heal(s) removed assertions. A green re-run after that can hide a real product bug.`,
      action: 'Stop merging repairs. Open the masked diff, restore the assertion, and file the product bug if the behavior is wrong.',
    };
  }
  if (generation.total > 0 && generation.passed < generation.total) {
    return {
      risk: `Generated specs are not clearing the first pull request. ${generation.passed} of ${generation.total} were green, conforming, and mapped to acceptance criteria.`,
      action: 'Do not open the next generated PR until that spec’s first CI run is green, the spec still has its expects, and every Gherkin scenario title appears in a test title.',
    };
  }
  if (flake.flaky > 0) {
    return {
      risk: `${flake.flaky} test result(s) passed only on retry in the last ${flake.measured.length} measured CI runs.`,
      action: 'Treat the flaky test as a failure. Reproduce it without retries before calling the suite stable.',
    };
  }
  if (ask.available && ask.guesses > ask.asks) {
    return {
      risk: 'Session review shows more invented values than questions asked.',
      action: 'When a feature value is not in the ticket or on the live page, ask for it before writing it into a spec.',
    };
  }
  return {
    risk: 'No masked heal, no flake in the measured window, and every evaluated generated PR cleared the gate.',
    action: 'Keep this report on the test-generation workflow and the local agent stop hook, and read the next red generation PR against the same three checks.',
  };
}

function bullet(lines) {
  if (lines.length === 0) return '- None in the measured set.';
  return lines.map((line) => `- ${line}`).join('\n');
}

function render(data) {
  const { generatedAt, slug, flake, heals, generation, ask } = data;
  const { risk, action } = riskAndAction(flake, heals, generation, ask);
  const askLine = ask.available
    ? `${ask.asks} asked, ${ask.guesses} guessed (${ask.files} transcript files).`
    : `${ask.asks} asked, ${ask.guesses} guessed. Carried forward from the session review at ${ask.measured}. This machine has no Cursor transcripts, so it was not remeasured.`;

  return `# Reliability report

Generated ${generatedAt}. Repo \`${slug}\`. Cursor has no built-in telemetry for these numbers. Each section says where the number came from.

## Flake rate

**${flake.flaky} / ${flake.executed} executed tests (${pct(flake.flaky, flake.executed)})** passed only on retry.

Measured from the Playwright summary annotation on the last ${flake.window} completed E2E or Playwright workflow runs (${flake.measured.length} had a summary, ${flake.unmeasured.length} did not and are excluded). A flaky row in that summary is a test that failed and then passed on retry. Skipped tests are not in the denominator.

${bullet(flake.names.map((item) => `${item.name} ([run ${item.run}](${item.url}))`))}

${flake.unmeasured.length === 0 ? '' : `Runs with no summary annotation: ${flake.unmeasured.map((run) => run.databaseId).join(', ')}.\n`}
What it tells us: a retry pass is an unstable test, not a stable one.

## Heal success rate

**${heals.clean} / ${heals.total}** drift repairs healed cleanly. **Masked regressions: ${heals.masked}.** That count must be 0. ${heals.total === 0 ? 'No drift-repair pull request was found, so the rate has no sample.' : ''}

Measured from pull requests and the subjects of the latest 100 commits on \`${slug}\`. A repair subject starts with "heal" or "self-heal", or it names locator drift. Clean means the spec diff did not remove an \`expect(\`. A removed \`expect(\` counts as a masked regression. ${
    heals.commitHits.length === 0
      ? 'No heal commit messages were found outside those PRs.'
      : `Commit messages also matched: ${heals.commitHits.map((commit) => `${commit.sha} ${commit.message}`).join('; ')}.`
  }

${bullet(heals.rows.map((row) => `${row.title} — ${row.masked ? `masked, ${row.removedExpects} expect( removed` : 'assertions kept'} (${row.url})`))}

What it tells us: a heal that deletes an assertion can turn a product bug into a green suite.

## Generation-gate pass rate

**${generation.passed} / ${generation.total} (${pct(generation.passed, generation.total)})** generated specs were green, conforming, and mapped to acceptance criteria on the first pull request.

Measured from open and merged PRs whose branch starts with \`cursor/\` and that add a file under \`tests/\`. Green is the earliest E2E or Playwright check on that PR. Conforming means the spec still has \`expect(\` and does not add \`waitForTimeout\`, an XPath or CSS \`page.locator\`, or an \`any\` type. Mapped means every \`Scenario\` title in the PR’s feature file appears in a test title.

${bullet(
  generation.rows.map(
    (row) =>
      `#${row.number} ${row.title}: ${row.pass ? 'pass' : 'fail'} — first check ${row.first}; conforming ${row.conforming ? 'yes' : `no (${row.problems.join(', ')})`}; scenarios ${row.mappedCount}/${row.scenarioCount}. ${row.url}`,
  ),
)}

What it tells us: a generated PR that fails this gate ships a spec the suite cannot trust.

## Ask-vs-guess

**${askLine}**

<!-- ask-vs-guess: asks=${ask.asks ?? 'na'} guesses=${ask.guesses ?? 'na'} measured=${ask.measured} -->

Measured by reading local Cursor agent transcripts for this repo. An ask is one question on an \`AskQuestion\` tool call. A guess is an assistant sentence that says it assumed, is assuming, used a best guess, or invented a value. Tool placeholders named "placeholder" are not counted. ${
    ask.available ? 'This run read the transcripts on this machine.' : 'Transcripts were not on this machine.'
  }

${ask.available && ask.askSamples.length > 0 ? `Asks included: ${ask.askSamples.map((sample) => sample.replace(/\s+/g, ' ').slice(0, 160)).join(' | ')}\n` : ''}${
    ask.available && ask.guessSamples.length > 0 ? `Guess phrases: ${ask.guessSamples.join(', ')}\n` : ''
  }
What it tells us: an invented value becomes an assertion nobody confirmed.

## Top reliability risk

${risk}

## Next action

${action}
`;
}

function main() {
  const slug = repoSlug();
  const previous = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  const flake = measureFlakes(slug);
  const heals = measureHeals(slug);
  const generation = measureGeneration(slug);
  const session = measureAskVsGuess();
  const now = new Date().toISOString();
  let ask;
  if (session.available) {
    ask = { ...session, measured: now };
  } else {
    const prior = carriedAsk(previous);
    ask = prior
      ? { available: false, ...prior }
      : {
          available: false,
          asks: 0,
          guesses: 0,
          measured: 'never',
        };
  }
  const markdown = render({ generatedAt: now, slug, flake, heals, generation, ask });
  fs.writeFileSync(outFile, markdown);
  console.log(`Wrote ${outFile}`);
}

main();
