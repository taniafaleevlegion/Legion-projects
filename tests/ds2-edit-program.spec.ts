import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page, Response } from '@playwright/test';
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

test.describe('DS-2 — Edit existing academic program', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await expect(programs.programsHeading).toBeVisible();
  });

  test('TC-001 — Edit form opens with current program data pre-filled', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';
    await createProgram(programs, programName, description);

    await openEditForm(programs, programName);
    await expect(programs.editProgramModal.programNameField).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionField).toHaveValue(description);
    await expect(programs.editProgramModal.saveButton).toBeVisible();
  });

  test('TC-002 — Program Name update persists and list refreshes immediately', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    await createProgram(programs, programName, 'Full-stack web development program');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(updatedName);
    await saveEdit(programs);

    await expect(programs.programRow(updatedName)).toBeVisible();
    await expect(programs.programRow(programName)).toHaveCount(0);
    await expect(programs.editProgramButton(updatedName)).toBeVisible();
  });

  test('TC-003 — Description-only edit leaves Program Name unchanged', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Cybersecurity 2026');
    const originalDescription = 'Introductory security track';
    const updatedDescription = 'Introductory security track — includes labs and capstone';
    await createProgram(programs, programName, originalDescription);

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillDescription(updatedDescription);
    await saveEdit(programs);

    await expect(programs.programRow(programName)).toBeVisible();

    await openEditForm(programs, programName);
    await expect(programs.editProgramModal.programNameField).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionField).toHaveValue(updatedDescription);
  });

  test('TC-004 — Admin saves Description update; modal closes and edit shows new value', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const updatedDescription = 'Full-stack web development program (2026 cohort)';
    await createProgram(programs, programName, 'Original description');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillDescription(updatedDescription);
    await saveEdit(programs);
    await expect(programs.programRow(programName)).toBeVisible();

    await openEditForm(programs, programName);
    await expect(programs.editProgramModal.descriptionField).toHaveValue(updatedDescription);
  });

  test('TC-005 — Cancel edit discards changes and restores list state', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Full-stack web development program');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName('Should Not Persist');
    await programs.editProgramModal.clickCancel();

    await expect(programs.editProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible();
    await expect(programs.programRow('Should Not Persist')).toHaveCount(0);
  });

  test('TC-006 — Updated program remains visible after Programs page reload', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    await createProgram(programs, programName, 'Persist after reload');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(updatedName);
    await saveEdit(programs);

    await page.reload();
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await expect(programs.programRow(updatedName)).toBeVisible();
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  test('TC-007 — Edit modal exposes Show AI Generation Config', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'AI config probe');

    await openEditForm(programs, programName);
    await expect(programs.editProgramModal.showAiConfigButton).toBeVisible();
    await programs.editProgramModal.clickShowAiConfig();
    await expect(programs.editProgramModal.programNameField).toBeEditable();
  });

  test('TC-101 — Empty Program Name cannot be saved on edit', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Full-stack web development program');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName('');
    await expect(programs.editProgramModal.saveButton).toBeDisabled();
    await programs.editProgramModal.clickCancel();
    await expect(programs.programRow(programName)).toBeVisible();
  });

  test('TC-102 — Save blocked when Program Name is cleared', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Valid description');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName('');
    await expect(programs.editProgramModal.saveButton).toBeDisabled();
    await programs.editProgramModal.fillProgramName(' ');
    await expect(programs.editProgramModal.saveButton).toBeDisabled();
  });

  test('TC-106 — Successful rename updates row in place (row count unchanged)', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    await createProgram(programs, programName, 'No duplicate row');

    const rowsBefore = await programs.tableRows().count();

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(updatedName);
    await saveEdit(programs);

    const rowsAfter = await programs.tableRows().count();
    expect(rowsAfter).toBe(rowsBefore);
    await expect(programs.programRow(updatedName)).toBeVisible();
  });

  // DS-249 — edit allows duplicate program name (see also DS-229)
  test.fixme('TC-108 — Renaming to existing program name should be rejected @known-failure', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const nameA = uniqueName('Web Development 2026');
    const nameB = uniqueName('Cloud Computing 2026');
    await createProgram(programs, nameA, 'Program A');
    await createProgram(programs, nameB, 'Program B');

    const countBeforeA = await programs.programRow(nameA).count();
    const countBeforeB = await programs.programRow(nameB).count();

    await openEditForm(programs, nameB);
    await programs.editProgramModal.fillProgramName(nameA);
    const patchPromise = programs.page.waitForResponse(
      (response) =>
        response.url().includes('/api/programs') && response.request().method() === 'PATCH',
    );
    await programs.editProgramModal.clickSave();
    const patch = await patchPromise;

    const rejected =
      patch.status() !== 200 ||
      (await programs.editProgramModal.dialog.isVisible()) ||
      (await programs.editProgramModal.duplicateNameError.isVisible().catch(() => false));

    if (!rejected) {
      test.info().annotations.push({
        type: 'known defect',
        description:
          'Edit allows duplicate Program Name (PATCH 200, no error) — parity gap vs create (DS-3).',
      });
    }

    expect(rejected, 'duplicate rename on edit should be rejected').toBe(true);
    expect(await programs.programRow(nameA).count()).toBe(countBeforeA);
    expect(await programs.programRow(nameB).count()).toBe(countBeforeB);
  });

  test('TC-107 — Invalid name with whitespace-only does not corrupt stored fields', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Data Analytics 2026');
    const description = 'SQL and Python focus';
    await createProgram(programs, programName, description);

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName('   ');
    await programs.editProgramModal.fillDescription('New description attempt');
    await expect(programs.editProgramModal.saveButton).toBeDisabled();
    await programs.editProgramModal.clickCancel();

    await openEditForm(programs, programName);
    await expect(programs.editProgramModal.programNameField).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionField).toHaveValue(description);
  });

  test('TC-201 — Program Name at 100 characters saves on edit', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const long100 = `${Date.now()}${'X'.repeat(100)}`.slice(0, 100);
    expect(long100.length).toBe(100);

    await createProgram(programs, programName, 'Max 100 chars');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(long100);
    await saveEdit(programs);

    await expect(programs.programRow(long100)).toBeVisible();
    await openEditForm(programs, long100);
    await expect(programs.editProgramModal.programNameField).toHaveValue(long100);
  });

  test('TC-202 — Program Name at 101 characters on edit (current: accepted)', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const long101 = `${Date.now()}${'Y'.repeat(101)}`.slice(0, 101);
    expect(long101.length).toBe(101);

    await createProgram(programs, programName, '101 char probe');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(long101);
    const patchPromise = programs.page.waitForResponse(
      (response) =>
        response.url().includes('/api/programs') && response.request().method() === 'PATCH',
    );
    await programs.editProgramModal.clickSave();
    const patch = await patchPromise;
    expect(patch.status()).toBe(200);
    await expect(programs.editProgramModal.dialog).toBeHidden({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await expect(programs.programRow(long101)).toBeVisible();
  });

  test('TC-204 — Leading and trailing whitespace in Program Name is trimmed on save', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const trimmedUpdate = `${programName} - Updated`;
    const paddedUpdate = `  ${trimmedUpdate}  `;
    await createProgram(programs, programName, 'Whitespace edit test');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(paddedUpdate);
    await saveEdit(programs);

    await expect(programs.programRow(trimmedUpdate)).toBeVisible();
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  test('TC-205 — Special characters and Unicode in Program Name persist correctly', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const unicodeName = uniqueName('Développement Web — Cohort #2 (50%)');
    await createProgram(programs, programName, 'Unicode rename test');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(unicodeName);
    await saveEdit(programs);

    await expect(programs.programRow(unicodeName)).toBeVisible();
    await openEditForm(programs, unicodeName);
    await expect(programs.editProgramModal.programNameField).toHaveValue(unicodeName);
  });

  test('TC-211 — Clearing Description on edit is allowed and persists', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Full-stack web development program');

    await openEditForm(programs, programName);
    await expect(programs.editProgramModal.saveButton).toBeEnabled();
    await programs.editProgramModal.fillDescription('');
    await saveEdit(programs);

    await openEditForm(programs, programName);
    await expect(programs.editProgramModal.programNameField).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionField).toHaveValue('');
  });

  test('TC-208 — Rapid double-click Save closes modal once; documents duplicate PATCH', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    await createProgram(programs, programName, 'Double save test');

    await openEditForm(programs, programName);
    await programs.editProgramModal.fillProgramName(updatedName);

    let patchCount = 0;
    const onPatch = (response: Response) => {
      if (response.url().includes('/api/programs') && response.request().method() === 'PATCH') {
        patchCount += 1;
      }
    };
    programs.page.on('response', onPatch);
    await programs.editProgramModal.doubleClickSave();
    await expect(programs.editProgramModal.dialog).toBeHidden({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await programs.page.waitForTimeout(1_000);
    programs.page.off('response', onPatch);

    expect(patchCount, 'double-click currently sends duplicate PATCH requests').toBeGreaterThan(1);
    await expect(programs.programRow(updatedName)).toHaveCount(1);
    await expect(programs.programRow(programName)).toHaveCount(0);
  });
});

test.describe('DS-2 — Unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-105 — Unauthenticated user cannot open program edit', async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/login/);
    await expect(programs.signInButton).toBeVisible();
  });
});
