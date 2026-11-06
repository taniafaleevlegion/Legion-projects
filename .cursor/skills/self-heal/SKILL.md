---
name: self-heal
description: >
  Heals one drifted Playwright locator and opens a PR for that repair.
  Use this skill whenever the user says "the build is red because a locator
  broke", "fix the drifted selector", "the test broke after a UI change",
  or "heal the suite" — even if they do not name this skill. Use it ONLY
  after triage classifies the red run as a test issue (drift), never for a
  real app bug.
---

# Self-heal

Repair one drifted locator in its Page Object, prove the same assertions
still pass, and open a PR. One repair per run; every heal becomes a PR.
Do not merge. Do not edit application source. Do not change the spec.

## Steps

1. **Require triage's drift classification, else stop and route to bug-reporter.**
   Read the triage diagnosis for this red run (the triage subagent, or
   [ci-failure-triage](../ci-failure-triage/SKILL.md)). Proceed only when
   the classification is a test issue caused by locator drift. If triage
   says real app bug, product defect, or anything other than drift, stop.
   Do not patch. Route to the bug-reporter subagent and
   [jira-bug-reporter](../jira-bug-reporter/SKILL.md).

2. **From the trace, find the failing locator and its POM.**
   Read the Playwright error and trace (CI log, `playwright-report`, or
   `test-results/`). Name the failing spec, the locator call that threw,
   and the Page Object in `pages/` that owns it. Tests must not contain
   inline locators ([pom-conventions](../pom-conventions/SKILL.md)); if
   the failure is an inline locator in the spec, move the repair to the
   POM and leave the spec's assertions untouched.

3. **Re-discover the element via the Agent-Browser a11y tree by its role + current accessible name.**
   Use `plugin-playwright-playwright`. Read each tool schema before calling
   it. Open the page with `browser_navigate`, then read `browser_snapshot`
   — that snapshot is the Agent-Browser a11y tree. Do not pick a locator
   from a screenshot. Match the element by its role and its current
   accessible name.

4. **Patch the locator in the POM, minimal role-based diff, never the spec's assertions.**
   Change only the drifted locator, to `getByRole` with the role and
   accessible name from the a11y tree. Follow pom-conventions: `getByRole`
   first; disambiguate with `.filter({ hasText })` when the role matches
   more than one element; no CSS, XPath, or `.first()`. Do not edit any
   `expect(...)` in the spec. Do not weaken, delete, or rewrite an
   assertion to make the run pass.

5. **Re-run and prove green WITH assertions unchanged (green via a weakened assertion is a bug, escalate).**
   Run `npx playwright test` scoped to the failing spec. Diff the spec
   against HEAD: every assertion must be byte-for-byte unchanged. A green
   run that got there by weakening an assertion is a bug — stop, revert
   the assertion change, and escalate to bug-reporter. Do not report
   success.

6. **Report the old->new locator diff + the green run.**
   State the old locator and the new locator, the POM file, and the green
   `npx playwright test` result (spec, title, command). Open one PR for
   this heal. Link the red run. Do not merge.

## Rules

- One repair per run. A second drifted locator waits for the next run.
- Every heal becomes a PR. A human approves the merge.
- Assertions stay unchanged. The heal is the locator in the POM only.
