import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

/** Shared test env can have thousands of programs; create/edit setup needs headroom. */
const PROGRAMS_SETUP_TIMEOUT = 180_000;

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function programsPage(page: Page): ProgramsPage {
  return new ProgramsPage(page);
}

async function createProgram(
  programs: ProgramsPage,
  programName: string,
  description: string,
): Promise<void> {
  await programs.openNewProgramForm();
  await programs.newProgramModal.fillProgramName(programName);
  await programs.newProgramModal.fillDescription(description);
  const responsePromise = programs.page.waitForResponse(
    (response) =>
      response.url().includes('/api/programs') && response.request().method() === 'POST',
    { timeout: PROGRAMS_SETUP_TIMEOUT },
  );
  await programs.newProgramModal.clickCreate();
  trackProgram(await uuidFromProgramCreateResponse(await responsePromise));
  await expect(programs.newProgramModal.dialog).toBeHidden({ timeout: PROGRAMS_SETUP_TIMEOUT });
  await expect(programs.editProgramButton(programName)).toBeVisible({
    timeout: PROGRAMS_SETUP_TIMEOUT,
  });
}

async function openEditForm(programs: ProgramsPage, programName: string): Promise<void> {
  await programs.openEditProgram(programName);
  await expect(programs.editProgramModal.dialog).toBeVisible();
  await expect(programs.editProgramModal.heading).toBeVisible();
  await expect(programs.editProgramModal.programNameField).toBeVisible();
  await expect(programs.editProgramModal.descriptionField).toBeVisible();
}

async function saveEdit(programs: ProgramsPage): Promise<void> {
  await programs.editProgramModal.clickSave();
  await expect(programs.editProgramModal.dialog).toBeHidden({ timeout: PROGRAMS_SETUP_TIMEOUT });
}

async function moveToSaveWithKeyboard(programs: ProgramsPage): Promise<void> {
  const saveButton = programs.editProgramModal.saveButton;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await programs.page.keyboard.press('Tab');
    const focused = await saveButton.evaluate(
      (element) => element === document.activeElement,
    );
    if (focused) {
      return;
    }
  }
}

test.describe('DS-257 — Valeria - Edit existing program details', () => {
  test.describe.configure({ timeout: 720_000 });

  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await expect(programs.programsHeading).toBeVisible();
  });

  test('Open program for editing shows pre-populated Name and Description', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';
    await createProgram(programs, programName, description);

    await openEditForm(programs, programName);

    await expect(programs.editProgramModal.programNameField).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionField).toHaveValue(description);
    await expect(programs.editProgramModal.saveButton).toBeVisible();
    await expect(programs.editProgramModal.cancelButton).toBeVisible();
  });

  test('Successfully edit a program name and list refreshes', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    await createProgram(programs, programName, 'Full-stack web development program');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(updatedName);
    await saveEdit(programs);

    await expect(programs.programRow(updatedName)).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await expect(programs.programRow(programName)).toHaveCount(0);
    await expect(programs.editProgramButton(updatedName)).toBeVisible();
  });

  test('Edit preserves unchanged fields when only Description changes', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Cybersecurity 2026');
    const originalDescription = 'Introductory security track';
    const updatedDescription = 'Introductory security track — includes labs and capstone';
    await createProgram(programs, programName, originalDescription);

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillDescription(updatedDescription);
    await saveEdit(programs);

    await expect(programs.programRow(programName)).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });

    await openEditForm(programs, programName);
    await expect(programs.editProgramModal.programNameField).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionField).toHaveValue(updatedDescription);
  });

  test('Cancel discards edit changes', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const discardedName = `${programName} - Discarded`;
    await createProgram(programs, programName, 'Full-stack web development program');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(discardedName);
    await programs.editProgramModal.clickCancel();

    await expect(programs.editProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible();
    await expect(programs.programRow(discardedName)).toHaveCount(0);
  });

  test('Empty program name keeps Save disabled', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Full-stack web development program');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName('');

    await expect(programs.editProgramModal.saveButton).toBeDisabled();
    await expect(programs.editProgramModal.dialog).toBeVisible();
    await expect(programs.editProgramModal.heading).toBeVisible();
  });

  test('Edit program name with special characters', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const specialName = `${programName} (C++ & AI)`;
    await createProgram(programs, programName, 'Special character rename');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(specialName);
    await saveEdit(programs);

    await expect(programs.programRow(specialName)).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  test('Description-only edit leaves list name unchanged', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Data Science 2026');
    const originalDescription = 'Original description';
    const updatedDescription = 'Updated cohort description';
    await createProgram(programs, programName, originalDescription);

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillDescription(updatedDescription);
    await saveEdit(programs);

    await expect(programs.programRow(programName)).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });

    await openEditForm(programs, programName);
    await expect(programs.editProgramModal.programNameField).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionField).toHaveValue(updatedDescription);
  });

  // Known failure: Mantine dialog close control can lack an accessible name (see programs.a11y).
  // Do not .disableRules(); keep the AC assertion under fixme until the control is named.
  test.fixme(
    'Edit Program dialog has no axe violations @known-failure',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      const programName = uniqueName('Web Development 2026');
      await createProgram(programs, programName, 'A11y axe seed');

      await openEditForm(programs, programName);
      await expect(programs.editProgramModal.programNameField).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include(programs.editProgramModal.axeIncludeSelector)
        .analyze();

      await expect(results.violations).toEqual([]);
    },
  );

  test(
    'Keyboard saves an edited program name via Save',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      const programName = uniqueName('Web Development 2026');
      const updatedName = `${programName} - Keyboard`;
      await createProgram(programs, programName, 'A11y keyboard rename');

      await openEditForm(programs, programName);
      await programs.editProgramModal.programNameField.focus();
      await expect(programs.editProgramModal.programNameField).toBeFocused();
      await programs.editProgramModal.fillProgramName(updatedName);
      await expect(programs.editProgramModal.programNameField).toHaveValue(updatedName);
      await expect(programs.editProgramModal.saveButton).toBeEnabled();

      await moveToSaveWithKeyboard(programs);
      await expect(programs.editProgramModal.saveButton).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(programs.editProgramModal.dialog).toBeHidden({ timeout: PROGRAMS_SETUP_TIMEOUT });
      await expect(programs.programRow(updatedName)).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
      await expect(programs.programRow(programName)).toHaveCount(0);
    },
  );
});
