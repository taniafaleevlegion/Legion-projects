import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

const WEB_DEV_PREFIX = 'Web Development 2026';
const WEB_DEV_DESCRIPTION = 'Full-stack web development program';

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function programsPage(page: Page): ProgramsPage {
  return new ProgramsPage(page);
}

function programCreateResponse(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/programs') && response.request().method() === 'POST',
  );
}

async function openCreateForm(programs: ProgramsPage): Promise<void> {
  await programs.openNewProgramForm();
  await expect(programs.newProgramModal.dialog).toBeVisible();
  await expect(programs.newProgramModal.heading).toBeVisible();
}

async function submitCreateAndTrack(programs: ProgramsPage): Promise<void> {
  const responsePromise = programCreateResponse(programs.page);
  await programs.newProgramModal.clickCreate();
  trackProgram(await uuidFromProgramCreateResponse(await responsePromise));
}

test.describe('DS-255 — Tania - new academic program', () => {
  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible();
    await expect(programs.programsHeading).toBeVisible();
  });

  // Happy paths

  test('Navigate to program creation form', async ({ page }) => {
    const programs = programsPage(page);

    await programs.openNewProgramForm();

    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.newProgramModal.heading).toBeVisible();
    await expect(programs.newProgramModal.programNameField).toBeVisible();
    await expect(programs.newProgramModal.descriptionField).toBeVisible();
  });

  test('Successfully create a program', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(WEB_DEV_PREFIX);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
  });

  test('Create a program when Description is left empty', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(WEB_DEV_PREFIX);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
  });

  // Negative

  test('Validation prevents empty program name', async ({ page }) => {
    const programs = programsPage(page);

    await openCreateForm(programs);
    await expect(programs.newProgramModal.programNameField).toHaveValue('');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
  });

  test('Whitespace-only program name keeps Create disabled', async ({ page }) => {
    const programs = programsPage(page);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName('   ');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.newProgramModal.heading).toBeVisible();
  });

  test('Cancel does not create a program', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(WEB_DEV_PREFIX);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await programs.newProgramModal.clickCancel();

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  // Edge cases

  test('Leading and trailing spaces are trimmed from the program name', async ({ page }) => {
    const programs = programsPage(page);
    const suffix = Date.now();
    const storedName = `${WEB_DEV_PREFIX} ${suffix}`;
    const paddedName = `  ${storedName}  `;

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(paddedName);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(storedName)).toBeVisible({ timeout: 15_000 });
  });

  test('Program name with special characters is accepted', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(`${WEB_DEV_PREFIX} (C++ & AI)`);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
  });

  // Accessibility — axe + keyboard (a11y-checks)

  // Known failure: Mantine dialog close control can lack an accessible name (see programs.a11y).
  // Do not .disableRules(); keep the AC assertion under fixme until the control is named.
  test.fixme(
    'New Program dialog has no axe violations @known-failure',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      await openCreateForm(programs);
      await expect(programs.newProgramModal.createButton).toBeDisabled();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include(programs.newProgramModal.axeIncludeSelector)
        .analyze();

      await expect(results.violations).toEqual([]);
    },
  );

  test(
    'Keyboard Enter on + New Program opens the dialog',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);

      await programs.newProgramButton.focus();
      await expect(programs.newProgramButton).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(programs.newProgramModal.dialog).toBeVisible();
      await expect(programs.newProgramModal.heading).toBeVisible();
      await expect(programs.newProgramModal.programNameField).toBeVisible();
      await expect(programs.newProgramModal.descriptionField).toBeVisible();
    },
  );
});
