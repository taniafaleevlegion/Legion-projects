# Didaxis Playwright tests

End-to-end tests for Didaxis. `playwright.config.ts` loads `.env` and signs in once in the setup project, then reuses `playwright/.auth/user.json`.

## Install

Node 20 or newer (CI uses 20).

```bash
npm ci
npx playwright install
```

Local runs use Chromium and WebKit. CI installs Chromium only.

## Configure

```bash
cp .env.example .env
```

Fill in the **Run tests** values in `.env`. The file is gitignored.

| Variable | Role |
|----------|------|
| `DIDAXIS_URL` | Base URL |
| `DIDAXIS_EMAIL` | Login for the saved session |
| `DIDAXIS_PASSWORD` | Password for that account |
| `DIDAXIS_API_TOKEN` | Bearer token that deletes programs a test creates |
| `DIDAXIS_ALT_EMAIL` | Optional second account for permission probes |
| `DIDAXIS_ALT_PASSWORD` | Optional password for that account |

## Run tests

```bash
npx playwright test
```

`npm test` is the same command. The HTML report is written when `CI` is set; locally the reporter is the list reporter.

## Run a tagged slice

Each test carries exactly one tag: `@smoke`, `@sanity`, `@regression`, `@api`, `@e2e`, or `@destructive`.

```bash
npm run test:smoke
npm run test:sanity
npm run test:regression
npm run test:api
npm run test:e2e
npm run test:destructive
```

`test:destructive` passes `--workers=1`. It is the only slice that may change locale, roles, flags, or settings, and the default `npm test` skips that tag. A test that only creates and deletes its own program stays on `@smoke`, `@sanity`, `@regression`, `@api`, or `@e2e`.

## CI

`.github/workflows/e2e.yml` uses the `DIDAXIS_*` secrets and Chromium.

| Event | Suite |
|---|---|
| Pull request | `npm run test:smoke` |
| Push to `main` | `npm run test:sanity` |
| Actions → Run workflow | `npm test` — every default-suite test (regression), still skipping `@destructive` |

`eval-report.md` is the reliability report. `npm run eval-report` rebuilds it from CI annotations, pull requests, and local agent transcripts. The test-generation workflow rebuilds it when that job finishes. A local agent or subagent rebuilds it from the `stop` and `subagentStop` hooks.

`eval-report.md` is the reliability report. `npm run eval-report` rebuilds it from CI annotations, pull requests, and local agent transcripts. The test-generation workflow rebuilds it when that job finishes. A local agent or subagent rebuilds it from the `stop` and `subagentStop` hooks.

`@api` includes `tests/manual/bulk-delete-programs.spec.ts`, which `testIgnore` still keeps out of these scripts. Run that file with `npm run test:manual:bulk-delete`.

## Agents and skills

Open this repo in Cursor. Project rules, skills, and agents live under `.cursor/` and apply when you work in the repo.

- **Rules:** `qa-orchestration.mdc` routes a ticket, a red run, or a backlog pass. `constitution.mdc` is the always-on test standard. `playwright-conventions.mdc` has the examples.
- **Agents:** `test-writer` (plan to spec), `triage` (red run to bug or test issue), `bug-reporter` (confirmed defect to Jira).
- **Skills:** `.cursor/skills/` — ticket to Gherkin, coverage exploration, locator self-heal, page objects, API cleanup, accessibility, programs API edges, CI triage, and Jira bug reports.
- **Playwright MCP:** `.cursor/mcp.json`.

The **Agent / CI setup** variables in `.env.example` are not read by `npx playwright test`. The weekday job in `.github/workflows/test-generation.yml` passes `CURSOR_API_KEY`, `ATLASSIAN_API_TOKEN`, `ATLASSIAN_BASE_URL`, and `ATLASSIAN_EMAIL` from GitHub Actions secrets into a headless `agent -p` run. Locally, put those MCP tokens in Cursor settings.
