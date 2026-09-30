import { test, expect, type Page, type Locator } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

function requireAdminCredentials(): { email: string; password: string } {
  const email = process.env.DIDAXIS_EMAIL;
  const password = process.env.DIDAXIS_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'DIDAXIS_EMAIL and DIDAXIS_PASSWORD must be set (e.g. via .env loaded by dotenv).',
    );
  }
  return { email, password };
}

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function newProgramButton(page: Page): Locator {
  return page.getByRole('button', { name: /New Program/i });
}

function programsMain(page: Page): Locator {
  return page.getByRole('main');
}

function programNameLocator(page: Page, name: string): Locator {
  return programsMain(page).getByText(name, { exact: true });
}

function programRow(page: Page, name: string): Locator {
  return programsMain(page)
    .getByRole('row')
    .filter({ has: page.getByText(name, { exact: true }) });
}

function editProgramButton(page: Page, programName: string): Locator {
  return programRow(page, programName).getByRole('button', {
    name: `Edit ${programName}`,
  });
}

function programDialog(page: Page): Locator {
  return page.getByRole('dialog');
}

async function loginAsAdmin(page: Page): Promise<void> {
  const { email, password } = requireAdminCredentials();
  await page.goto(`${baseURL}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function gotoProgramsPage(page: Page): Promise<void> {
  await page.goto(`${baseURL}/programs`);
  await expect(page).toHaveURL(/\/programs/);
  await expect(newProgramButton(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();
}

async function createProgram(
  page: Page,
  programName: string,
  description: string,
): Promise<void> {
  await newProgramButton(page).click();
  const dialog = programDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Program Name').fill(programName);
  await dialog.getByLabel('Description').fill(description);
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(editProgramButton(page, programName)).toBeVisible({ timeout: 20_000 });
}

async function openEditForProgram(page: Page, programName: string): Promise<Locator> {
  await editProgramButton(page, programName).click();
  const dialog = programDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Program Name')).toBeVisible();
  await expect(dialog.getByLabel('Description')).toBeVisible();
  return dialog;
}

async function expectProgramInList(page: Page, name: string): Promise<void> {
  await expect(programNameLocator(page, name).first()).toBeVisible();
}

async function expectProgramNotInList(page: Page, name: string): Promise<void> {
  await expect(programNameLocator(page, name)).toHaveCount(0);
}

async function saveEditDialog(dialog: Locator): Promise<void> {
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
}

test.describe('DS-2 — Edit existing academic program', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await gotoProgramsPage(page);
  });

  test('TC-001 — Edit form opens with current program data pre-filled', async ({ page }) => {
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';
    await createProgram(page, programName, description);

    const dialog = await openEditForProgram(page, programName);
    await expect(dialog.getByLabel('Program Name')).toHaveValue(programName);
    await expect(dialog.getByLabel('Description')).toHaveValue(description);
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('TC-002 — Program Name update persists and list refreshes immediately', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    await createProgram(page, programName, 'Full-stack web development program');

    const dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Program Name').fill(updatedName);
    await saveEditDialog(dialog);

    await expectProgramInList(page, updatedName);
    await expectProgramNotInList(page, programName);
  });

  test('TC-003 — Description-only edit leaves Program Name unchanged', async ({ page }) => {
    const programName = uniqueName('Cybersecurity 2026');
    const originalDescription = 'Introductory security track';
    const updatedDescription = 'Introductory security track — includes labs and capstone';
    await createProgram(page, programName, originalDescription);

    let dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Description').fill(updatedDescription);
    await saveEditDialog(dialog);

    await expectProgramInList(page, programName);

    dialog = await openEditForProgram(page, programName);
    await expect(dialog.getByLabel('Program Name')).toHaveValue(programName);
    await expect(dialog.getByLabel('Description')).toHaveValue(updatedDescription);
  });

  test('TC-004 — Admin saves Description update; modal closes and edit shows new value', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    const updatedDescription = 'Full-stack web development program (2026 cohort)';
    await createProgram(page, programName, 'Original description');

    const dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Description').fill(updatedDescription);
    await saveEditDialog(dialog);
    await expectProgramInList(page, programName);

    const reopened = await openEditForProgram(page, programName);
    await expect(reopened.getByLabel('Description')).toHaveValue(updatedDescription);
  });

  test('TC-005 — Cancel edit discards changes and restores list state', async ({ page }) => {
    const programName = uniqueName('Web Development 2026');
    await createProgram(page, programName, 'Full-stack web development program');

    const dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Program Name').fill('Should Not Persist');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expectProgramInList(page, programName);
    await expectProgramNotInList(page, 'Should Not Persist');
  });

  test('TC-006 — Updated program remains visible after Programs page reload', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    await createProgram(page, programName, 'Persist after reload');

    const dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Program Name').fill(updatedName);
    await saveEditDialog(dialog);

    await page.reload();
    await expect(page).toHaveURL(/\/programs/);
    await expectProgramInList(page, updatedName);
    await expectProgramNotInList(page, programName);
  });

  test('TC-101 — Empty Program Name cannot be saved on edit', async ({ page }) => {
    const programName = uniqueName('Web Development 2026');
    await createProgram(page, programName, 'Full-stack web development program');

    const dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Program Name').fill('');
    const saveButton = dialog.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeDisabled();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expectProgramInList(page, programName);
  });

  test('TC-102 — Save blocked when Program Name is cleared', async ({ page }) => {
    const programName = uniqueName('Web Development 2026');
    await createProgram(page, programName, 'Valid description');

    const dialog = await openEditForProgram(page, programName);
    const nameField = dialog.getByLabel('Program Name');
    const saveButton = dialog.getByRole('button', { name: 'Save' });

    await nameField.fill('');
    await expect(saveButton).toBeDisabled();
    await nameField.fill(' ');
    await expect(saveButton).toBeDisabled();
  });

  test('TC-106 — Edit save must not create a duplicate program row', async ({ page }) => {
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    await createProgram(page, programName, 'No duplicate row');

    const rowsBefore = await programsMain(page).getByRole('row').count();

    const dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Program Name').fill(updatedName);
    await saveEditDialog(dialog);

    const rowsAfter = await programsMain(page).getByRole('row').count();
    expect(rowsAfter).toBe(rowsBefore);
    await expectProgramInList(page, updatedName);
  });

  test('TC-107 — Invalid name with whitespace-only does not corrupt stored fields', async ({
    page,
  }) => {
    const programName = uniqueName('Data Analytics 2026');
    const description = 'SQL and Python focus';
    await createProgram(page, programName, description);

    const dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Program Name').fill('   ');
    await dialog.getByLabel('Description').fill('New description attempt');
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    const reopened = await openEditForProgram(page, programName);
    await expect(reopened.getByLabel('Program Name')).toHaveValue(programName);
    await expect(reopened.getByLabel('Description')).toHaveValue(description);
  });

  test('TC-204 — Leading and trailing whitespace in Program Name is trimmed on save', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    const trimmedUpdate = `${programName} - Updated`;
    const paddedUpdate = `  ${trimmedUpdate}  `;
    await createProgram(page, programName, 'Whitespace edit test');

    const dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Program Name').fill(paddedUpdate);
    await saveEditDialog(dialog);

    await expectProgramInList(page, trimmedUpdate);
    await expectProgramNotInList(page, programName);
  });

  test('TC-205 — Special characters and Unicode in Program Name persist correctly', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    const unicodeName = uniqueName('Développement Web — Cohort #2 (50%)');
    await createProgram(page, programName, 'Unicode rename test');

    const dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Program Name').fill(unicodeName);
    await saveEditDialog(dialog);

    await expectProgramInList(page, unicodeName);
    const reopened = await openEditForProgram(page, unicodeName);
    await expect(reopened.getByLabel('Program Name')).toHaveValue(unicodeName);
  });

  test('TC-208 — Rapid double-click Save applies update once', async ({ page }) => {
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    await createProgram(page, programName, 'Double save test');

    const dialog = await openEditForProgram(page, programName);
    await dialog.getByLabel('Program Name').fill(updatedName);
    await dialog.getByRole('button', { name: 'Save' }).dblclick();
    await expect(dialog).toBeHidden();

    await expect(programNameLocator(page, updatedName)).toHaveCount(1);
    await expectProgramNotInList(page, programName);
  });
});

test('TC-105 — Unauthenticated user cannot open program edit', async ({ page }) => {
  await page.goto(`${baseURL}/programs`);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});
