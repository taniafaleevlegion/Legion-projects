import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

test.describe('DS-294 — Programs page accessibility', () => {
  test('Programs page meets WCAG 2 A and 2 AA', { tag: '@ds-294' }, async ({ page }) => {
    test.setTimeout(180_000);
    const programs = new ProgramsPage(page);
    await programs.goto(baseURL);
    await expect(programs.programsHeading).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    await expect(results.violations).toEqual([]);
  });

  test(
    'Keyboard opens New Program from the Programs page',
    { tag: '@ds-294' },
    async ({ page }) => {
      const programs = new ProgramsPage(page);
      await programs.goto(baseURL);
      await expect(programs.programsHeading).toBeVisible();
      await expect(programs.newProgramButton).toBeVisible();

      for (let press = 0; press < 30; press++) {
        const focused = await programs.newProgramButton.evaluate(
          (element) => element === element.ownerDocument.activeElement,
        );
        if (focused) {
          break;
        }
        await page.keyboard.press('Tab');
      }

      await expect(programs.newProgramButton).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(programs.newProgramModal.dialog).toBeVisible();
    },
  );
});
