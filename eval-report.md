# Reliability report

Generated 2026-11-10T19:39:15.688Z. Repo `taniafaleevlegion/Legion-projects`. Cursor has no built-in telemetry for these numbers. Each section says where the number came from.

## Flake rate

**4 / 1024 executed tests (0.4%)** passed only on retry.

Measured from the Playwright summary annotation on the last 10 completed E2E or Playwright workflow runs (10 had a summary, 0 did not and are excluded). A flaky row in that summary is a test that failed and then passed on retry. Skipped tests are not in the denominator.

- [chromium] › tests/ds4-delete-program.spec.ts:221:7 › DS-4 — Delete program with confirmation › TC-203 — Delete correct row when two programs have similar display names ([run 42878751730](https://github.com/taniafaleevlegion/Legion-projects/actions/runs/42878751730))
- [chromium] › tests/ds2-edit-program.spec.ts:74:7 › DS-2 — Edit existing academic program › TC-002 — Program Name update persists and list refreshes immediately ([run 42301199071](https://github.com/taniafaleevlegion/Legion-projects/actions/runs/42301199071))
- [chromium] › tests/ds2-edit-program.spec.ts:91:7 › DS-2 — Edit existing academic program › TC-003 — Description-only edit leaves Program Name unchanged ([run 42301199071](https://github.com/taniafaleevlegion/Legion-projects/actions/runs/42301199071))
- [chromium] › tests/ds4-delete-program.spec.ts:221:7 › DS-4 — Delete program with confirmation › TC-203 — Delete correct row when two programs have similar display names ([run 42293833090](https://github.com/taniafaleevlegion/Legion-projects/actions/runs/42293833090))


What it tells us: a retry pass is an unstable test, not a stable one.

## Heal success rate

**0 / 0** drift repairs healed cleanly. **Masked regressions: 0.** That count must be 0. No drift-repair pull request was found, so the rate has no sample.

Measured from pull requests and the subjects of the latest 100 commits on `taniafaleevlegion/Legion-projects`. A repair subject starts with "heal" or "self-heal", or it names locator drift. Clean means the spec diff did not remove an `expect(`. A removed `expect(` counts as a masked regression. No heal commit messages were found outside those PRs.

- None in the measured set.

What it tells us: a heal that deletes an assertion can turn a product bug into a green suite.

## Generation-gate pass rate

**0 / 4 (0%)** generated specs were green, conforming, and mapped to acceptance criteria on the first pull request.

Measured from open and merged PRs whose branch starts with `cursor/` and that add a file under `tests/`. Green is the earliest E2E or Playwright check on that PR. Conforming means the spec still has `expect(` and does not add `waitForTimeout`, an XPath or CSS `page.locator`, or an `any` type. Mapped means every `Scenario` title in the PR’s feature file appears in a test title.

- #4 DS-259: Delete program with confirmation tests: fail — first check test failure; conforming yes; scenarios 6/6. https://github.com/taniafaleevlegion/Legion-projects/pull/4
- #3 DS-260: Program list filtering and display tests: fail — first check test failure; conforming yes; scenarios 6/6. https://github.com/taniafaleevlegion/Legion-projects/pull/3
- #2 DS-258: Program name validation and duplicate prevention tests: fail — first check test failure; conforming yes; scenarios 6/6. https://github.com/taniafaleevlegion/Legion-projects/pull/2
- #1 DS-254: Add Playwright coverage for creating an academic program: fail — first check test failure; conforming yes; scenarios 20/20. https://github.com/taniafaleevlegion/Legion-projects/pull/1

What it tells us: a generated PR that fails this gate ships a spec the suite cannot trust.

## Ask-vs-guess

**3 asked, 0 guessed (46 transcript files).**

<!-- ask-vs-guess: asks=3 guesses=0 measured=2026-11-10T19:39:15.688Z -->

Measured by reading local Cursor agent transcripts for this repo. An ask is one question on an `AskQuestion` tool call. A guess is an assistant sentence that says it assumed, is assuming, used a best guess, or invented a value. Tool placeholders named "placeholder" are not counted. This run read the transcripts on this machine.

Asks included: Where should the jira-ticket-to-gherkin skill be stored? It will auto-apply when a Jira ticket is referenced and test cases, a test plan, or scenarios are reque | Which exact model id should replace `model: inherit` in .cursor/agents/triage.md and .cursor/agents/bug-reporter.md? The phrase "composer 2.5" is not itself an  | Nothing in the repo states a locale or timezone. Which pair should playwright.config.ts pin under use, so date formatting stays the same on your machine and in 

What it tells us: an invented value becomes an assertion nobody confirmed.

## Top reliability risk

Generated specs are not clearing the first pull request. 0 of 4 were green, conforming, and mapped to acceptance criteria.

## Next action

Do not open the next generated PR until that spec’s first CI run is green, the spec still has its expects, and every Gherkin scenario title appears in a test title.
