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

function editProgramButton(page: Page, programName: string): Locator {
  return page
    .getByRole('main')
    .getByRole('row')
    .filter({ has: page.getByText(programName, { exact: true }) })
    .getByRole('button', { name: `Edit ${programName}` });
}

function creationDialog(page: Page): Locator {
  return page.getByRole('dialog');
}

function duplicateNameError(page: Page, dialog: Locator): Locator {
  return dialog
    .getByText(/already exists|duplicate|unique|name.*taken/i)
    .or(page.getByRole('alert').filter({ hasText: /already exists|duplicate|unique/i }));
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
}

async function openNewProgramForm(page: Page): Promise<Locator> {
  await newProgramButton(page).click();
  const dialog = creationDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Program Name')).toBeVisible();
  await expect(dialog.getByLabel('Description')).toBeVisible();
  return dialog;
}

async function createProgram(
  page: Page,
  programName: string,
  description: string,
): Promise<void> {
  const dialog = await openNewProgramForm(page);
  await dialog.getByLabel('Program Name').fill(programName);
  await dialog.getByLabel('Description').fill(description);
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(editProgramButton(page, programName)).toBeVisible({ timeout: 20_000 });
}

async function expectProgramInList(page: Page, name: string): Promise<void> {
  await expect(programNameLocator(page, name).first()).toBeVisible();
}

async function countProgramsNamed(page: Page, name: string): Promise<number> {
  return programNameLocator(page, name).count();
}

async function expectDuplicateCreateRejected(
  page: Page,
  inputName: string,
  description: string,
  listName: string,
): Promise<Locator | null> {
  const countBefore = await countProgramsNamed(page, listName);
  const dialog = await openNewProgramForm(page);
  await dialog.getByLabel('Program Name').fill(inputName);
  await dialog.getByLabel('Description').fill(description);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/programs') && response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Create' }).click();
  const response = await responsePromise;

  expect(response.status(), 'duplicate create must not return 201 Created').not.toBe(201);
  expect(await countProgramsNamed(page, listName)).toBe(countBefore);

  if (await dialog.isVisible()) {
    await expect(duplicateNameError(page, dialog)).toBeVisible();
    return dialog;
  }
  return null;
}

test.describe('DS-3 — Program name validation and duplicate prevention', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await gotoProgramsPage(page);
  });

  test('TC-001 — Valid program name with special characters creates program successfully', async ({
    page,
  }) => {
    const programName = uniqueName('Informatique & IA - Niveau 2');
    const dialog = await openNewProgramForm(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('Second-year informatics and AI track');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(dialog).toBeHidden();
    await expectProgramInList(page, programName);
  });

  test('TC-002 — Program Name with leading and trailing spaces trims on create', async ({
    page,
  }) => {
    const suffix = Date.now();
    const storedName = `Data Science 2026 ${suffix}`;
    const paddedName = `  ${storedName}  `;

    const dialog = await openNewProgramForm(page);
    await dialog.getByLabel('Program Name').fill(paddedName);
    await dialog.getByLabel('Description').fill('Trim validation cohort');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(dialog).toBeHidden();
    await expectProgramInList(page, storedName);
  });

  test('TC-003 — Alphanumeric Program Name with hyphen creates program when unique', async ({
    page,
  }) => {
    const programName = uniqueName('Cloud Engineering 2026');
    await createProgram(page, programName, 'Cloud-native architecture and DevOps');
    await expectProgramInList(page, programName);
  });

  test('TC-004 — Unicode and accented characters in Program Name are accepted when unique', async ({
    page,
  }) => {
    const programName = uniqueName('Programme Été 2026 — Montréal');
    await createProgram(page, programName, 'French-language summer cohort');
    await expectProgramInList(page, programName);
  });

  test('TC-101 — Whitespace-only Program Name prevents form submission', async ({ page }) => {
    const dialog = await openNewProgramForm(page);
    await dialog.getByLabel('Program Name').fill('   ');
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
    await expect(dialog).toBeVisible();
  });

  test('TC-103 — Empty Program Name prevents submission', async ({ page }) => {
    const dialog = await openNewProgramForm(page);
    await dialog.getByLabel('Description').fill('Description without a program name');
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
    await expect(dialog).toBeVisible();
  });

  test('TC-102 — Duplicate Program Name shows error and does not create second program', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    await createProgram(page, programName, 'Original cohort');
    await expectDuplicateCreateRejected(
      page,
      programName,
      'Alternate cohort description',
      programName,
    );
  });

  test('TC-104 — Duplicate after trim is rejected when stored name matches trimmed input', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    await createProgram(page, programName, 'Stored without padding');

    await expectDuplicateCreateRejected(
      page,
      `  ${programName}  `,
      'Padded duplicate attempt',
      programName,
    );
  });

  test('TC-105 — Client must not create duplicate when error is shown', async ({ page }) => {
    const programName = uniqueName('Web Development 2026');
    await createProgram(page, programName, 'Persisted program');

    await expectDuplicateCreateRejected(page, programName, 'Should not persist', programName);

    await page.reload();
    await expect(page).toHaveURL(/\/programs/);
    expect(await countProgramsNamed(page, programName)).toBe(1);
  });

  test('TC-106 — Duplicate error is specific to Program Name; other fields stay populated', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    await createProgram(page, programName, 'Existing');

    const description = 'Alternate cohort description kept on failure';
    const dialog = await expectDuplicateCreateRejected(
      page,
      programName,
      description,
      programName,
    );
    expect(dialog).not.toBeNull();
    await expect(dialog!.getByLabel('Description')).toHaveValue(description);
  });

  test('TC-201 — Tabs and newlines only in Program Name treated as empty', async ({ page }) => {
    const dialog = await openNewProgramForm(page);
    await dialog.getByLabel('Program Name').fill('\t\n\t');
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
    await expect(dialog).toBeVisible();
  });

  test('TC-202 — Mixed whitespace and visible characters trims outer whitespace only', async ({
    page,
  }) => {
    const suffix = Date.now();
    const storedName = `Informatique & IA - Niveau 2 ${suffix}`;
    const paddedName = `  ${storedName}  `;

    const dialog = await openNewProgramForm(page);
    await dialog.getByLabel('Program Name').fill(paddedName);
    await dialog.getByLabel('Description').fill('Internal spacing preserved');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(dialog).toBeHidden();
    await expectProgramInList(page, storedName);
  });

  test('TC-203 — Case-variant duplicate name behavior is documented', async ({ page }) => {
    const suffix = Date.now();
    const programName = `Web Development 2026 ${suffix}`;
    const caseVariant = `web development 2026 ${suffix}`;
    await createProgram(page, programName, 'Case sensitivity probe');
    const countBefore =
      (await countProgramsNamed(page, programName)) +
      (await countProgramsNamed(page, caseVariant));

    const dialog = await openNewProgramForm(page);
    await dialog.getByLabel('Program Name').fill(caseVariant);
    await dialog.getByLabel('Description').fill('Case variant attempt');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await Promise.race([
      dialog.waitFor({ state: 'hidden', timeout: 15_000 }),
      duplicateNameError(page, dialog).waitFor({ state: 'visible', timeout: 15_000 }),
    ]).catch(() => {});

    const rejected = await dialog.isVisible();
    const countAfter =
      (await countProgramsNamed(page, programName)) +
      (await countProgramsNamed(page, caseVariant));

    if (rejected) {
      await expect(duplicateNameError(page, dialog)).toBeVisible();
      expect(countAfter).toBe(countBefore);
    } else {
      await expect(dialog).toBeHidden();
      expect(countAfter).toBeGreaterThan(countBefore);
    }
  });

  test('TC-208 — HTML-like characters in Program Name are stored as plain text', async ({
    page,
  }) => {
    const programName = uniqueName("<script>alert('x')</script> Test 2026");
    await createProgram(page, programName, 'XSS-safe name display check');
    await expectProgramInList(page, programName);

    let dialogAlert = false;
    page.on('dialog', () => {
      dialogAlert = true;
    });
    await page.waitForTimeout(500);
    expect(dialogAlert).toBe(false);
  });

  test('TC-209 — Whitespace padding around existing name triggers duplicate rejection', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    await createProgram(page, programName, 'Duplicate padding test');
    const padded = `${' '.repeat(50)}${programName}${' '.repeat(50)}`;

    await expectDuplicateCreateRejected(page, padded, 'Padded duplicate', programName);
  });
});
