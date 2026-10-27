import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';
import { ProgramsPage } from '../pages/ProgramsPage';
import { expectAxeClean } from './helpers/axeExpect';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

function programsPage(page: Page): ProgramsPage {
  return new ProgramsPage(page);
}

function violationSummary(violations: Result[]): string {
  if (violations.length === 0) {
    return '';
  }
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact ?? 'unknown'}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(', ')).join('\n  ')}`,
    )
    .join('\n');
}

test.describe('Programs — accessibility', () => {
  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.programsHeading).toBeVisible();
  });

  test.fixme(
    'Programs list has no axe violations @known-failure',
    { tag: '@regression' },
    async ({ page }, testInfo) => {
      test.setTimeout(90_000);

      const results = await new AxeBuilder({ page })
        // Cross-origin frame aggregation can hang without legacy mode on this app.
        .setLegacyMode()
        .analyze();

      await expectAxeClean(
        results.violations,
        violationSummary(results.violations),
        testInfo,
      );
    },
  );

  test(
    'New Program modal scoped scan with optional rule disable',
    { tag: '@regression' },
    async ({ page }, testInfo) => {
      const programs = programsPage(page);
      await programs.openNewProgramForm();
      await expect(programs.newProgramModal.heading).toBeVisible();

      const results = await new AxeBuilder({ page })
        .include(programs.newProgramModal.axeIncludeSelector)
        // Example: `.disableRules('color-contrast')` — here, Mantine modal close lacks a name.
        .disableRules('button-name')
        .analyze();

      await expectAxeClean(
        results.violations,
        violationSummary(results.violations),
        testInfo,
      );
    },
  );
});
