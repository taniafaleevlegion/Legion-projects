import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

/** Shared test env can have thousands of programs; create setup needs headroom. */
const PROGRAMS_SETUP_TIMEOUT = 180_000;

const INFORMATICS_NAME = 'Informatique & IA - Niveau 2';

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function programsPage(page: Page): ProgramsPage {
  return new ProgramsPage(page);
}

async function moveToCreateWithKeyboard(programs: ProgramsPage): Promise<void> {
  const createButton = programs.newProgramModal.createButton;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await programs.page.keyboard.press('Tab');
    const focused = await createButton.evaluate(
      (element) => element === document.activeElement,
    );
    if (focused) {
      return;
    }
  }
}

test.describe('DS-3 — Program name accessibility', () => {
  test.describe.configure({ timeout: 720_000 });

  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await expect(programs.programsHeading).toBeVisible();
  });

  test(
    'New Program dialog has no axe violations after a whitespace-only Program Name',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      await programs.openNewProgramForm();
      await expect(programs.newProgramModal.dialog).toBeVisible();
      await expect(programs.newProgramModal.heading).toBeVisible();
      await programs.newProgramModal.fillProgramName('   ');
      await expect(programs.newProgramModal.programNameField).toHaveValue('   ');
      await expect(programs.newProgramModal.createButton).toBeDisabled();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include(programs.newProgramModal.axeIncludeSelector)
        .analyze();

      await expect(results.violations).toEqual([]);
    },
  );

  test(
    'Keyboard creates a special-character program name',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      const programName = uniqueName(INFORMATICS_NAME);

      await programs.openNewProgramForm();
      await expect(programs.newProgramModal.dialog).toBeVisible();
      await programs.newProgramModal.programNameField.focus();
      await expect(programs.newProgramModal.programNameField).toBeFocused();
      await page.keyboard.type(programName);
      await expect(programs.newProgramModal.programNameField).toHaveValue(programName);
      await expect(programs.newProgramModal.createButton).toBeEnabled();

      await moveToCreateWithKeyboard(programs);
      await expect(programs.newProgramModal.createButton).toBeFocused();

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/programs') && response.request().method() === 'POST',
        { timeout: PROGRAMS_SETUP_TIMEOUT },
      );
      await page.keyboard.press('Enter');
      trackProgram(await uuidFromProgramCreateResponse(await responsePromise));

      await expect(programs.newProgramModal.dialog).toBeHidden({ timeout: PROGRAMS_SETUP_TIMEOUT });
      await expect(programs.programRow(programName)).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
    },
  );
});
