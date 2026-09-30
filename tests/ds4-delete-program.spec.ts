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

function deleteProgramButton(page: Page, programName: string): Locator {
  return programRow(page, programName).getByRole('button', {
    name: `Delete ${programName}`,
  });
}

function editProgramButton(page: Page, programName: string): Locator {
  return programRow(page, programName).getByRole('button', {
    name: `Edit ${programName}`,
  });
}

function createProgramDialog(page: Page): Locator {
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
}

async function createProgram(
  page: Page,
  programName: string,
  description: string,
): Promise<void> {
  await newProgramButton(page).click();
  const dialog = createProgramDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Program Name').fill(programName);
  await dialog.getByLabel('Description').fill(description);
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(editProgramButton(page, programName)).toBeVisible({ timeout: 20_000 });
}

async function expectProgramInList(page: Page, name: string): Promise<void> {
  await expect(programNameLocator(page, name).first()).toBeVisible({ timeout: 15_000 });
}

async function expectProgramNotInList(page: Page, name: string): Promise<void> {
  await expect(programNameLocator(page, name)).toHaveCount(0);
}

async function countProgramRows(page: Page): Promise<number> {
  return programsMain(page).getByRole('row').count();
}

/** Native browser confirm — not a Mantine role="dialog". */
async function clickDeleteWithConfirm(
  page: Page,
  programName: string,
  action: 'accept' | 'dismiss',
): Promise<string> {
  let message = '';
  const handled = new Promise<void>((resolve) => {
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      message = dialog.message();
      if (action === 'accept') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
      resolve();
    });
  });
  await deleteProgramButton(page, programName).click();
  await handled;
  return message;
}

test.describe('DS-4 — Delete program with confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await gotoProgramsPage(page);
  });

  test('TC-001 — Delete action opens confirmation dialog for the selected program', async ({
    page,
  }) => {
    const programName = uniqueName('Test Program');
    await createProgram(page, programName, 'Delete confirmation probe');

    const message = await clickDeleteWithConfirm(page, programName, 'dismiss');

    expect(message).toMatch(/delete program/i);
    expect(message).toContain(programName);
    await expectProgramInList(page, programName);
  });

  test('TC-002 — Confirmed deletion removes program from Programs list', async ({ page }) => {
    const programName = uniqueName('Test Program');
    await createProgram(page, programName, 'To be deleted');
    const rowsBefore = await countProgramRows(page);

    await clickDeleteWithConfirm(page, programName, 'accept');

    await expectProgramNotInList(page, programName);
    expect(await countProgramRows(page)).toBeLessThan(rowsBefore);
  });

  test('TC-003 — Cancel on confirmation dialog leaves program in the list', async ({ page }) => {
    const programName = uniqueName('Web Development 2026');
    await createProgram(page, programName, 'Cancel delete test');

    await clickDeleteWithConfirm(page, programName, 'dismiss');

    await expectProgramInList(page, programName);
  });

  test('TC-004 — Deleted program does not reappear after Programs page reload', async ({
    page,
  }) => {
    const programName = uniqueName('Test Program');
    await createProgram(page, programName, 'Persist delete test');
    await clickDeleteWithConfirm(page, programName, 'accept');
    await expectProgramNotInList(page, programName);

    await page.reload();
    await expect(page).toHaveURL(/\/programs/);
    await expectProgramNotInList(page, programName);
  });

  test('TC-005 — Confirmation dialog references the program being deleted', async ({
    page,
  }) => {
    const programName = uniqueName('Cybersecurity 2026');
    await createProgram(page, programName, 'Named in confirm message');

    const message = await clickDeleteWithConfirm(page, programName, 'dismiss');

    expect(message).toContain(programName);
    await expectProgramInList(page, programName);
  });

  test('TC-006 — Other programs remain in the list when one program is deleted', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const toDelete = uniqueName('Test Program');
    const keepA = uniqueName('Data Science 2026');
    const keepB = uniqueName('Cloud Engineering 2026');
    await createProgram(page, toDelete, 'Delete me');
    await createProgram(page, keepA, 'Keep A');
    await createProgram(page, keepB, 'Keep B');
    await expect(editProgramButton(page, toDelete)).toBeVisible();
    await expect(editProgramButton(page, keepA)).toBeVisible();
    await expect(editProgramButton(page, keepB)).toBeVisible();

    await clickDeleteWithConfirm(page, toDelete, 'accept');

    await expectProgramNotInList(page, toDelete);
    await expect(editProgramButton(page, keepA)).toBeVisible();
    await expect(editProgramButton(page, keepB)).toBeVisible();
  });

  test('TC-101 — Program is not removed when deletion is not confirmed', async ({ page }) => {
    const programName = uniqueName('Test Program');
    await createProgram(page, programName, 'Not confirmed');
    const rowsBefore = await countProgramRows(page);

    await clickDeleteWithConfirm(page, programName, 'dismiss');

    await expectProgramInList(page, programName);
    expect(await countProgramRows(page)).toBe(rowsBefore);
  });

  test('TC-105 — Dismiss confirmation does not delete the program', async ({ page }) => {
    const programName = uniqueName('Data Analytics 2026');
    await createProgram(page, programName, 'Dismiss only');

    await clickDeleteWithConfirm(page, programName, 'dismiss');

    await expectProgramInList(page, programName);
    await expect(page.getByText(/deleted successfully|was deleted/i)).toHaveCount(0);
  });

  test('TC-106 — Cancel must not remove the program or show deletion success', async ({
    page,
  }) => {
    const programName = uniqueName('Test Program');
    await createProgram(page, programName, 'Cancel negative test');
    const rowsBefore = await countProgramRows(page);

    await clickDeleteWithConfirm(page, programName, 'dismiss');

    await expectProgramInList(page, programName);
    expect(await countProgramRows(page)).toBe(rowsBefore);
    await expect(page.getByText(new RegExp(`${programName}.*deleted`, 'i'))).toHaveCount(0);
  });

  test('TC-107 — Confirming deletion must not remove a different program', async ({ page }) => {
    test.setTimeout(60_000);
    const alpha = uniqueName('Program Alpha');
    const beta = uniqueName('Program Beta');
    await createProgram(page, alpha, 'Alpha');
    await createProgram(page, beta, 'Beta');
    await expectProgramInList(page, alpha);
    await expectProgramInList(page, beta);

    const message = await clickDeleteWithConfirm(page, alpha, 'accept');
    expect(message).toContain(alpha);

    await expectProgramNotInList(page, alpha);
    await expect(editProgramButton(page, beta)).toBeVisible({ timeout: 15_000 });
  });

  test('TC-202 — Delete program whose name contains special characters and Unicode', async ({
    page,
  }) => {
    const programName = uniqueName('Informatique & IA — Niveau 2 ( été )');
    await createProgram(page, programName, 'Unicode delete');

    const message = await clickDeleteWithConfirm(page, programName, 'accept');
    expect(message).toContain(programName);
    await expectProgramNotInList(page, programName);
  });

  test('TC-203 — Delete correct row when two programs have similar display names', async ({
    page,
  }) => {
    const primary = uniqueName('Test Program');
    const archive = uniqueName('Test Program (Archive)');
    await createProgram(page, primary, 'Primary');
    await createProgram(page, archive, 'Archive copy');

    await clickDeleteWithConfirm(page, primary, 'accept');

    await expectProgramNotInList(page, primary);
    await expectProgramInList(page, archive);
  });

  test('TC-205 — Rapid double-click delete icon opens one confirmation flow', async ({
    page,
  }) => {
    const programName = uniqueName('Test Program');
    await createProgram(page, programName, 'Double click delete icon');

    let dialogCount = 0;
    page.on('dialog', async (dialog) => {
      dialogCount += 1;
      await dialog.dismiss();
    });
    await deleteProgramButton(page, programName).dblclick();
    await page.waitForTimeout(500);
    page.removeAllListeners('dialog');

    expect(dialogCount).toBeGreaterThanOrEqual(1);
    expect(dialogCount).toBeLessThanOrEqual(2);
    await expectProgramInList(page, programName);
  });

  test('TC-206 — Confirmed delete removes program once without duplicate rows', async ({
    page,
  }) => {
    const programName = uniqueName('Double Delete Test');
    await createProgram(page, programName, 'Single removal');

    await clickDeleteWithConfirm(page, programName, 'accept');

    await expectProgramNotInList(page, programName);
    expect(await programNameLocator(page, programName).count()).toBe(0);
    await expect(deleteProgramButton(page, programName)).toHaveCount(0);
  });

  test('TC-210 — Delete program with description not shown in list row', async ({ page }) => {
    const programName = uniqueName('Test Program');
    const description = 'Full-stack curriculum with capstone project';
    await createProgram(page, programName, description);

    await clickDeleteWithConfirm(page, programName, 'accept');
    await expectProgramNotInList(page, programName);
  });

  test('TC-212 — Undo is not offered after confirmed deletion', async ({ page }) => {
    const programName = uniqueName('No Undo Program');
    await createProgram(page, programName, 'No undo expected');

    await clickDeleteWithConfirm(page, programName, 'accept');
    await expectProgramNotInList(page, programName);
    await expect(page.getByRole('button', { name: /undo/i })).toHaveCount(0);
    await expect(page.getByText(/undo/i)).toHaveCount(0);
  });
});

test('TC-104 — Unauthenticated user cannot delete a program', async ({ page }) => {
  await page.goto(`${baseURL}/programs`);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});
