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
      'DIDAXIS_EMAIL and DIDAXIS_PASSWORD must be set (e.g. via .env and playwright.config.ts).',
    );
  }
  return { email, password };
}

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

/** UI label is "+ New Program"; substring match via regex. */
function newProgramButton(page: Page): Locator {
  return page.getByRole('button', { name: /New Program/i });
}

function programsMain(page: Page): Locator {
  return page.getByRole('main');
}

function programNameLocator(page: Page, name: string): Locator {
  return programsMain(page).getByText(name, { exact: true });
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
}

function creationDialog(page: Page): Locator {
  return page.getByRole('dialog');
}

async function openNewProgramForm(page: Page): Promise<void> {
  await newProgramButton(page).click();
  const dialog = creationDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Program Name')).toBeVisible();
  await expect(dialog.getByLabel('Description')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Create' })).toBeVisible();
}

async function expectProgramInList(page: Page, name: string): Promise<void> {
  await expect(programNameLocator(page, name).first()).toBeVisible();
}

async function expectProgramNotInList(page: Page, name: string): Promise<void> {
  await expect(programNameLocator(page, name)).toHaveCount(0);
}

test.describe('DS-1 — Create new academic program', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await gotoProgramsPage(page);
  });

  test('TC-001 — Admin opens program creation form with required fields', async ({
    page,
  }) => {
    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeVisible();
  });

  test('TC-002 — Admin creates program with name and description; list updates', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill(description);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expectProgramInList(page, programName);
  });

  test('TC-003 — Create button disabled when Program Name is empty', async ({ page }) => {
    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await dialog.getByLabel('Description').fill('Any description');
    const createButton = dialog.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeDisabled();
  });

  test('TC-004 — Admin creates program with name only (Description empty)', async ({
    page,
  }) => {
    const programName = uniqueName('Data Science Fundamentals');

    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expectProgramInList(page, programName);
  });

  test('TC-005 — Admin cancels creation; no new program in list', async ({ page }) => {
    const programName = uniqueName('Temporary Program Name');

    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('Should not be saved');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expectProgramNotInList(page, programName);
  });

  test('TC-006 — New program appears in list without full page reload', async ({
    page,
  }) => {
    const programName = uniqueName('Cloud Computing 2026');
    const programsUrl = page.url();

    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('AWS and Azure basics');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    expect(page.url()).toBe(programsUrl);
    await expectProgramInList(page, programName);
  });

  test('TC-102 — Empty Program Name cannot result in a saved program', async ({
    page,
  }) => {
    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    const createButton = dialog.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeDisabled();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });

  test('TC-103 — Create remains disabled after clearing a previously entered name', async ({
    page,
  }) => {
    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    const nameField = dialog.getByLabel('Program Name');
    const createButton = dialog.getByRole('button', { name: 'Create' });

    await nameField.fill('Initial Name');
    await expect(createButton).toBeEnabled();
    await nameField.fill('');
    await expect(createButton).toBeDisabled();
  });

  test('TC-201 — Program Name at minimum valid length (single character)', async ({
    page,
  }) => {
    const programName = String.fromCharCode(65 + (Date.now() % 26));

    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('Single-letter name test');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expectProgramInList(page, programName);
  });

  test('TC-204 — Program Name with leading and trailing whitespace is trimmed', async ({
    page,
  }) => {
    const suffix = Date.now();
    const storedName = `Web Development ${suffix}`;
    const paddedName = `  ${storedName}  `;

    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await dialog.getByLabel('Program Name').fill(paddedName);
    await dialog.getByLabel('Description').fill('Whitespace trimming test');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expectProgramInList(page, storedName);
  });

  test('TC-205 — Program Name containing only whitespace cannot be created', async ({
    page,
  }) => {
    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await dialog.getByLabel('Program Name').fill('   ');
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  test('TC-206 — Special characters and Unicode in Program Name', async ({ page }) => {
    const programName = uniqueName('Développement Web — 2026 (Phase 1)');

    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('Accents, em dash, parentheses');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expectProgramInList(page, programName);
  });

  test('TC-212 — Rapid double-click on Create creates only one program', async ({
    page,
  }) => {
    const programName = uniqueName('Double Submit Program');

    await openNewProgramForm(page);
    const dialog = creationDialog(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('Idempotency test');
    await dialog.getByRole('button', { name: 'Create' }).dblclick();

    await expect(dialog).toBeHidden();
    await expect(programNameLocator(page, programName)).toHaveCount(1);
  });
});

test('TC-105 — Unauthenticated user cannot reach program creation', async ({ page }) => {
  await page.goto(`${baseURL}/programs`);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(newProgramButton(page)).toHaveCount(0);
});
