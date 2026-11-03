import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

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

async function submitCreateAndTrack(programs: ProgramsPage): Promise<void> {
  const responsePromise = programCreateResponse(programs.page);
  await programs.newProgramModal.clickCreate();
  trackProgram(await uuidFromProgramCreateResponse(await responsePromise));
}

async function openCreateForm(programs: ProgramsPage): Promise<void> {
  await programs.openNewProgramForm();
  await expect(programs.newProgramModal.dialog).toBeVisible();
  await expect(programs.newProgramModal.heading).toBeVisible();
}

async function tabUntilFocused(page: Page, target: Locator, maxTabs = 40): Promise<void> {
  for (let attempt = 0; attempt < maxTabs; attempt += 1) {
    await page.keyboard.press('Tab');
    const focused = await target.evaluate((element) => element === document.activeElement);
    if (focused) {
      return;
    }
  }
  throw new Error('Target control was not focused within Tab budget');
}

test.describe('DS-255 — Tania - new academic program', () => {
  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible();
  });

  test('Admin opens program creation form with name, description, Create, and Cancel', async ({
    page,
  }) => {
    const programs = programsPage(page);
    await openCreateForm(programs);

    await expect(programs.newProgramModal.programNameField).toBeVisible();
    await expect(programs.newProgramModal.descriptionField).toBeVisible();
    await expect(programs.newProgramModal.createButton).toBeVisible();
    await expect(programs.newProgramModal.cancelButton).toBeVisible();
  });

  test('Admin creates Web Development 2026 with description; list updates', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(description);
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
  });

  test('Create is disabled when Program Name is empty and Description is filled', async ({
    page,
  }) => {
    const programs = programsPage(page);
    await openCreateForm(programs);
    await programs.newProgramModal.fillDescription('Full-stack web development program');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
  });

  test('Cancel discards unsaved program; name does not appear in list', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Temporary Program Name');

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription('Should not be saved');
    await programs.newProgramModal.clickCancel();

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  test('Whitespace-only Program Name keeps Create disabled', async ({ page }) => {
    const programs = programsPage(page);
    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName('   ');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
  });

  test('Special characters and Unicode in Program Name are accepted', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Développement Web — 2026 (Phase 1)');

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription('Accents, em dash, parentheses');
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
  });

  // Known product a11y defects: Mantine close lacks button-name; Cancel/AI config fail color-contrast.
  test.fixme(
    'New Program dialog has no axe violations (wcag2a/wcag2aa) @known-failure',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      await openCreateForm(programs);
      await expect(programs.newProgramModal.createButton).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include(programs.newProgramModal.axeIncludeSelector)
        .analyze();

      await expect(results.violations).toEqual([]);
    },
  );

  test(
    'Keyboard opens New Program via Tab to + New Program then Enter',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);

      await tabUntilFocused(page, programs.newProgramButton);
      await expect(programs.newProgramButton).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(programs.newProgramModal.dialog).toBeVisible();
      await expect(programs.newProgramModal.heading).toBeVisible();
    },
  );

  test(
    'Keyboard submits Create when Create is focused',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      const programName = uniqueName('Web Development 2026');

      await openCreateForm(programs);
      await programs.newProgramModal.fillProgramName(programName);
      await programs.newProgramModal.fillDescription('Full-stack web development program');
      await expect(programs.newProgramModal.createButton).toBeEnabled();

      await programs.newProgramModal.createButton.focus();
      await expect(programs.newProgramModal.createButton).toBeFocused();

      const responsePromise = programCreateResponse(page);
      await page.keyboard.press('Enter');
      trackProgram(await uuidFromProgramCreateResponse(await responsePromise));

      await expect(programs.newProgramModal.dialog).toBeHidden();
      await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
    },
  );
});
