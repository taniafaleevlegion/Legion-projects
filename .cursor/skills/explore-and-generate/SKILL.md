---
name: explore-and-generate
description: >
  Finds what the suite is not testing by reading tests/, crawling the live UI,
  and writing one Gherkin plan for the highest-value uncovered flow. Use this
  skill whenever the user says "find what we're not testing", "explore <page>
  for untested flows", or "expand coverage" — even if they do not name this
  skill. Do NOT use it when a ticket already exists (that's
  jira-ticket-analyzer; this is for when there's no ticket).
---

# Explore and Generate

Find one real coverage gap and hand the test-writer a Gherkin plan. Exploration
is read-only: do not edit application source, do not write Playwright specs,
and do not file a ticket. Stop after the plan so a human can review it.

Do not run this skill when a Jira ticket already exists. A ticket goes to
jira-ticket-analyzer. This skill is only for when there is no ticket.

## Steps

1. **Map covered flows by reading `tests/`.** Read the specs (and any
   `features/` already written for that area). List the user flows those
   tests actually exercise: page, action, and asserted outcome. Ignore
   helpers and fixtures that do not assert a flow.

2. **Crawl the target via the Playwright MCP and read the a11y tree, not
   pixels.** Use `plugin-playwright-playwright`. Read each tool schema before
   calling it. Open the page with `browser_navigate`, then read
   `browser_snapshot` (roles, names, labels). Do not use screenshots to
   decide what the UI supports. Follow the real controls a user can reach:
   links, buttons, fields, dialogs. Note the accessible name of each control
   you will mention in the plan.

3. **Enumerate real user flows the UI supports.** From the a11y tree, list
   flows a user can complete in the product: start state, action, observable
   result. Skip flows the UI does not expose.

4. **Diff to find the coverage gap.** Compare step 3 with step 1. A flow is
   uncovered only when no existing test asserts that outcome. Keep the gap
   list short and concrete.

5. **Pick the highest-value uncovered flow with a reason, one per run.**
   Choose a single flow. Prefer a flow a user hits on the way to their goal,
   or one whose failure would hide or destroy data. Say why it outranks the
   others. Leave the rest of the gap for a later run.

6. **Output a Gherkin test plan for the test-writer to implement.** One
   positive path and one edge case for that flow. Every `Then` must be
   assertable from the UI or the network (visible text, role, URL, enabled
   state, or a response the test can observe). No vague outcomes ("works",
   "looks right"). Use the accessible names from the crawl. Do not write the
   Playwright spec in this run.

## Output

```gherkin
# Explore: <page>
# Chosen flow: <one sentence>
# Why this one: <reason it is the highest-value gap>
# Already covered: <flows tests/ already asserts>
# Left for later: <other uncovered flows, one line each>

Feature: <page> — <chosen flow>

  # Positive path

  Scenario: <user completes the flow>
    Given <start state a test can set up>
    When <the user action>
    Then <assertable outcome>
    And <assertable outcome>

  # Edge case

  Scenario: <one boundary for the same flow>
    Given <start state>
    When <the edge action>
    Then <assertable outcome>
```

Hand this plan to the test-writer only after a human accepts it.
