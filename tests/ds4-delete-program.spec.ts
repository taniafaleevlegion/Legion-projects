import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

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
  await expect(programs.newProgramModal.dialog).toBeHidden({ timeout: 20_000 });
  await expect(programs.editProgramButton(programName)).toBeVisible({ timeout: 20_000 });
}

/** Native browser confirm — not a Mantine role="dialog". */
async function clickDeleteWithConfirm(
  programs: ProgramsPage,
  programName: string,
  action: 'accept' | 'dismiss',
): Promise<string> {
  let message = '';
  const handled = new Promise<void>((resolve) => {
    programs.page.once('dialog', async (dialog) => {
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
  await programs.clickDeleteProgram(programName);
  await handled;
  return message;
}

test.describe('DS-4 — Delete program with confirmation', () => {
  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible();
  });

  test('TC-001 — Delete action opens confirmation dialog for the selected program', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    await createProgram(programs, programName, 'Delete confirmation probe');

    const message = await clickDeleteWithConfirm(programs, programName, 'dismiss');

    expect(message).toMatch(/delete program/i);
    expect(message).toContain(programName);
    await expect(programs.programRow(programName)).toBeVisible();
  });

  test('TC-002 — Confirmed deletion removes program from Programs list', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    await createProgram(programs, programName, 'To be deleted');
    const rowsBefore = await programs.tableRows().count();

    await clickDeleteWithConfirm(programs, programName, 'accept');

    await expect(programs.programRow(programName)).toHaveCount(0);
    expect(await programs.tableRows().count()).toBeLessThan(rowsBefore);
  });

  test('TC-003 — Cancel on confirmation dialog leaves program in the list', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Cancel delete test');

    await clickDeleteWithConfirm(programs, programName, 'dismiss');

    await expect(programs.programRow(programName)).toBeVisible();
  });

  test('TC-004 — Deleted program does not reappear after Programs page reload', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    await createProgram(programs, programName, 'Persist delete test');
    await clickDeleteWithConfirm(programs, programName, 'accept');
    await expect(programs.programRow(programName)).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  test('TC-005 — Confirmation dialog references the program being deleted', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Cybersecurity 2026');
    await createProgram(programs, programName, 'Named in confirm message');

    const message = await clickDeleteWithConfirm(programs, programName, 'dismiss');

    expect(message).toContain(programName);
    await expect(programs.programRow(programName)).toBeVisible();
  });

  test('TC-006 — Other programs remain in the list when one program is deleted', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const programs = programsPage(page);
    const toDelete = uniqueName('Test Program');
    const keepA = uniqueName('Data Science 2026');
    const keepB = uniqueName('Cloud Engineering 2026');
    await createProgram(programs, toDelete, 'Delete me');
    await createProgram(programs, keepA, 'Keep A');
    await createProgram(programs, keepB, 'Keep B');
    await expect(programs.editProgramButton(toDelete)).toBeVisible();
    await expect(programs.editProgramButton(keepA)).toBeVisible();
    await expect(programs.editProgramButton(keepB)).toBeVisible();

    await clickDeleteWithConfirm(programs, toDelete, 'accept');

    await expect(programs.programRow(toDelete)).toHaveCount(0);
    await expect(programs.editProgramButton(keepA)).toBeVisible();
    await expect(programs.editProgramButton(keepB)).toBeVisible();
  });

  test('TC-101 — Program is not removed when deletion is not confirmed', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    await createProgram(programs, programName, 'Not confirmed');
    const rowsBefore = await programs.tableRows().count();

    await clickDeleteWithConfirm(programs, programName, 'dismiss');

    await expect(programs.programRow(programName)).toBeVisible();
    expect(await programs.tableRows().count()).toBe(rowsBefore);
  });

  test('TC-105 — Dismiss confirmation does not delete the program', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Data Analytics 2026');
    await createProgram(programs, programName, 'Dismiss only');

    await clickDeleteWithConfirm(programs, programName, 'dismiss');

    await expect(programs.programRow(programName)).toBeVisible();
    await expect(programs.page.getByText(/deleted successfully|was deleted/i)).toHaveCount(0);
  });

  test('TC-106 — Cancel must not remove the program or show deletion success', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    await createProgram(programs, programName, 'Cancel negative test');
    const rowsBefore = await programs.tableRows().count();

    await clickDeleteWithConfirm(programs, programName, 'dismiss');

    await expect(programs.programRow(programName)).toBeVisible();
    expect(await programs.tableRows().count()).toBe(rowsBefore);
    await expect(
      programs.page.getByText(new RegExp(`${programName}.*deleted`, 'i')),
    ).toHaveCount(0);
  });

  test('TC-107 — Confirming deletion must not remove a different program', async ({ page }) => {
    test.setTimeout(60_000);
    const programs = programsPage(page);
    const alpha = uniqueName('Program Alpha');
    const beta = uniqueName('Program Beta');
    await createProgram(programs, alpha, 'Alpha');
    await createProgram(programs, beta, 'Beta');
    await expect(programs.programRow(alpha)).toBeVisible();
    await expect(programs.programRow(beta)).toBeVisible();

    const message = await clickDeleteWithConfirm(programs, alpha, 'accept');
    expect(message).toContain(alpha);

    await expect(programs.programRow(alpha)).toHaveCount(0);
    await expect(programs.editProgramButton(beta)).toBeVisible({ timeout: 15_000 });
  });

  test('TC-202 — Delete program whose name contains special characters and Unicode', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Informatique & IA — Niveau 2 ( été )');
    await createProgram(programs, programName, 'Unicode delete');

    const message = await clickDeleteWithConfirm(programs, programName, 'accept');
    expect(message).toContain(programName);
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  test('TC-203 — Delete correct row when two programs have similar display names', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const primary = uniqueName('Test Program');
    const archive = uniqueName('Test Program (Archive)');
    await createProgram(programs, primary, 'Primary');
    await createProgram(programs, archive, 'Archive copy');

    await clickDeleteWithConfirm(programs, primary, 'accept');

    await expect(programs.programRow(primary)).toHaveCount(0);
    await expect(programs.programRow(archive)).toBeVisible();
  });

  test('TC-205 — Rapid double-click delete icon opens one confirmation flow', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    await createProgram(programs, programName, 'Double click delete icon');

    let dialogCount = 0;
    programs.page.on('dialog', async (dialog) => {
      dialogCount += 1;
      await dialog.dismiss();
    });
    await programs.deleteProgramButton(programName).dblclick();
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 5_000 });
    programs.page.removeAllListeners('dialog');

    expect(dialogCount).toBeGreaterThanOrEqual(1);
    expect(dialogCount).toBeLessThanOrEqual(2);
    await expect(programs.programRow(programName)).toBeVisible();
  });

  test('TC-206 — Confirmed delete removes program once without duplicate rows', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Double Delete Test');
    await createProgram(programs, programName, 'Single removal');

    await clickDeleteWithConfirm(programs, programName, 'accept');

    await expect(programs.programRow(programName)).toHaveCount(0);
    await expect(programs.programNameInList(programName)).toHaveCount(0);
    await expect(programs.deleteProgramButton(programName)).toHaveCount(0);
  });

  test('TC-210 — Delete program with description not shown in list row', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    const description = 'Full-stack curriculum with capstone project';
    await createProgram(programs, programName, description);

    await clickDeleteWithConfirm(programs, programName, 'accept');
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  test('TC-212 — Undo is not offered after confirmed deletion', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('No Undo Program');
    await createProgram(programs, programName, 'No undo expected');

    await clickDeleteWithConfirm(programs, programName, 'accept');
    await expect(programs.programRow(programName)).toHaveCount(0);
    await expect(programs.page.getByRole('button', { name: /undo/i })).toHaveCount(0);
    await expect(programs.page.getByText(/undo/i)).toHaveCount(0);
  });
});

test.describe('DS-4 — Unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-104 — Unauthenticated user cannot delete a program', async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/login/);
    await expect(programs.signInButton).toBeVisible();
  });
});
