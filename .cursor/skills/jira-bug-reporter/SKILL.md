---
name: jira-bug-reporter
description: Analyzes Playwright test failures, identifies root cause, and creates detailed Jira bug tickets. Use when a test fails and needs investigation and bug reporting.
---

# Jira Bug Reporter (Playwright failures)

Turn a failed Playwright run into a linked Jira **Bug** with reproduction steps, expected vs actual behavior, evidence attachments, and pointers to the failing test and relevant source.

## When to use

- A Playwright test failed locally or in CI and the user wants a Jira bug.
- The user pastes failure output, mentions `test-results/`, `playwright-report/`, or a trace/screenshot path.
- A scenario from `features/<TICKET>.feature` failed during automation.

## Before creating a bug

1. **Confirm intent** — If the user did not ask to file in Jira, summarize findings and ask whether to create the bug.
2. **Search for duplicates** — Use `searchJiraIssuesUsingJql` with error text, test title, and component keywords (same idea as the triage-issue skill). If a strong duplicate exists, offer to comment on it instead of creating a new bug.
3. **Resolve the source ticket** — The bug must link to the original story/task:
   - Ticket key in the test file name (e.g. `tests/ds1-create-program.spec.ts` → `DS-1`).
   - Ticket key in the feature file (`features/DS-1.feature`).
   - `@DS-1` or similar annotation in the spec.
   - User-provided key or Jira URL.
   If ambiguous, ask once; do not guess the wrong project key.

## Step 1: Investigate the failure

Gather evidence from the repo and the latest test run:

| Source | What to extract |
|--------|-----------------|
| Terminal / CI log | Assertion message, timeout, locator, stack trace, project (browser) |
| Failing spec | File path, `test()` title, line from stack trace |
| `test-results/` | Newest folder for the failed test; `*.png` screenshots, `trace.zip`, `video.webm` |
| `playwright-report/` | HTML report path for local reproduction |
| App under test | URL from `baseURL`, env, or steps in the spec |

**Root cause** — State one clear sentence: product defect vs test bug vs environment/data. If uncertain, say what is known and what needs manual confirmation.

**Steps to reproduce** — Numbered steps a human can follow without running Playwright: starting URL/state, actions, data used. Derive from the spec and failure context; do not paste raw Playwright locator code unless it helps QA.

## Step 2: Draft the bug content

### Summary (title)

Format: `[<area>] <short symptom> — <test or ticket context>`

Examples:

- `[Programs] Create program button stays disabled — DS-1 / ds1-create-program`
- `[TodoMVC] Filter "Active" shows completed items — todomvc.spec.ts`

Keep under ~120 characters; no stack traces in the title.

### Description (Jira body)

Use this markdown template in `createJiraIssue` (`contentFormat`: `markdown`):

```markdown
## Root cause
<one paragraph>

## Steps to reproduce
1. ...
2. ...
3. ...

## Expected result
<what should happen — tie to AC or spec assertion>

## Actual result
<what happened — include assertion/error text in a fenced block if helpful>

## Environment
- Browser/project: <e.g. chromium from Playwright>
- Base URL: <if known>
- Branch/commit: <if known>
- CI run: <link or run id if provided>

## Test & code references
- Failed test: `<repo-relative path>` — `<test title>`
- Feature/scenario: `<features/TICKET.feature>` (if applicable)
- Related source: `<paths to app or page objects implicated by investigation>`

## Playwright artifacts
- Screenshot: `<path under test-results/>`
- Trace: `<path or "on retry only">`
- Report: `playwright-report/index.html` (local)

## Linked work
Source ticket: <ORIGINAL-KEY> (link created after bug is filed)
```

Fill every section; use `N/A` only when truly unavailable.

## Step 3: Create the Jira bug

### Atlassian MCP

1. Read tool schemas before calling (Atlassian MCP / `plugin-atlassian-atlassian`).
2. Resolve `cloudId` once via `getAccessibleAtlassianResources` (or site hostname from a Jira URL).
3. **Project key** — Same project as the source ticket (prefix of `DS-1` → `DS`), unless the user specifies otherwise.
4. **Create issue** — `createJiraIssue`:
   - `issueType`: `Bug`
   - `summary`: title from Step 2
   - `description`: body from Step 2
   - `labels`: include `playwright`, `automated-test` when appropriate
5. **Link to source ticket** — `executeWrite` with `createJiraIssueLink`:
   - `linkType`: `Relates` (if unavailable, call `listJiraIssueLinkTypes` and pick the closest non-hierarchy link)
   - Link the new bug to the original ticket (e.g. bug `DS-42` **Relates** to story `DS-1`). Use inward/outward keys so the relationship reads correctly in Jira; add a one-line `comment` if helpful.

Do **not** create a second bug if creation succeeded but linking failed — link in a follow-up call using the returned bug key.

## Step 4: Attach evidence

Attach screenshots and other files from disk (trace zip, video, HTML snippet exports if any).

Use `executeWrite` → `uploadAttachmentToJiraIssue` (two phases):

1. **Phase 1** — Pass `cloudId`, `issueIdOrKey` (new bug key), `filePath` (absolute or repo-relative from project root). Run the returned `uploadCommand` in the shell from the directory the command expects.
2. **Phase 2** — Pass the same keys plus `fileId` from phase 1 to attach to the issue.

Priority attachments:

1. Failure screenshot (`test-results/**/test-failed-*.png` or similar)
2. Optional: trace zip, video, second screenshot (e.g. full page)

If no screenshot exists, note that in the description and attach the Playwright HTML report folder’s index or ask the user to re-run with `npx playwright test <file> --trace on`.

Optionally add a short comment via `addOrEditJiraIssueComment` listing attachment filenames and the failed test command (e.g. `npx playwright test tests/ds1-create-program.spec.ts`).

## Step 5: Report back to the user

Return:

- New bug key and browse URL if available
- Link type and source ticket key
- List of attached files
- One-line root cause
- Suggested next action (fix product vs fix test vs re-run with env)

## Project conventions (Legion-projects)

- Tests live under `tests/`; many map to Jira keys (`ds1-*.spec.ts` → `DS-1`).
- Gherkin sources: `features/<TICKET>.feature` (see `jira-ticket-to-gherkin` skill).
- Playwright config: `playwright.config.ts` — `testDir: ./tests`, HTML reporter, trace on first retry.

## Quality checklist

- [ ] Bug is type **Bug**, not Task/Story
- [ ] Linked to the **original** ticket (not only mentioned in text)
- [ ] Title, steps, expected, and actual are all filled in
- [ ] At least one screenshot attached when one exists on disk
- [ ] Failed test path and title documented
- [ ] Duplicate search performed or user chose to skip
- [ ] Root cause stated plainly
