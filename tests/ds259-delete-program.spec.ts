import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

/** Shared test env can have thousands of programs; create setup needs headroom. */
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
  await expect(programs.newProgramModal.dialog).toBeVisible();
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

test.describe('DS-259 — Delete program with confirmation', () => {
  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible();
  });

  // Happy paths

  test('Delete program with confirmation', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    await createProgram(programs, programName, 'To be deleted');

    const message = await clickDeleteWithConfirm(programs, programName, 'accept');

    expect(message).toContain(programName);
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  test('Cancel program deletion', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Cancel delete test');

    const message = await clickDeleteWithConfirm(programs, programName, 'dismiss');

    expect(message).toContain(programName);
    await expect(programs.programRow(programName)).toBeVisible();
  });

  // Negative

  test('Program is not removed when deletion is not confirmed', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    await createProgram(programs, programName, 'Not confirmed');
    const rowsBefore = await programs.tableRows().count();

    await clickDeleteWithConfirm(programs, programName, 'dismiss');

    await expect(programs.programRow(programName)).toBeVisible();
    expect(await programs.tableRows().count()).toBe(rowsBefore);
  });

  // Edge cases

  test('Deleting one program leaves other programs in the list', async ({ page }) => {
    test.setTimeout(90_000);
    const programs = programsPage(page);
    const toDelete = uniqueName('Test Program');
    const toKeep = uniqueName('Data Science 2026');
    await createProgram(programs, toDelete, 'Delete me');
    await createProgram(programs, toKeep, 'Keep me');
    await expect(programs.editProgramButton(toDelete)).toBeVisible();
    await expect(programs.editProgramButton(toKeep)).toBeVisible();

    const message = await clickDeleteWithConfirm(programs, toDelete, 'accept');
    expect(message).toContain(toDelete);

    await expect(programs.programRow(toDelete)).toHaveCount(0);
    await expect(programs.editProgramButton(toKeep)).toBeVisible();
  });

  test('Deleted program stays gone after reload', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    await createProgram(programs, programName, 'Persist delete test');

    await clickDeleteWithConfirm(programs, programName, 'accept');
    await expect(programs.programRow(programName)).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  // Accessibility — axe + keyboard (a11y-checks)

  // Known failure: Programs list has Mantine/axe issues (see programs.a11y).
  // Do not .disableRules(); keep the AC assertion under fixme until remediated.
  test.fixme(
    'Programs page has no axe violations @known-failure',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      await expect(programs.programsHeading).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      await expect(results.violations).toEqual([]);
    },
  );

  test(
    'Keyboard activates delete and opens native confirm for the program',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      const programName = uniqueName('Test Program');
      await createProgram(programs, programName, 'Keyboard delete');

      const deleteButton = programs.deleteProgramButton(programName);
      await deleteButton.focus();
      await expect(deleteButton).toBeFocused();

      let message = '';
      const handled = new Promise<void>((resolve) => {
        page.once('dialog', async (dialog) => {
          expect(dialog.type()).toBe('confirm');
          message = dialog.message();
          await dialog.dismiss();
          resolve();
        });
      });
      await page.keyboard.press('Enter');
      await handled;

      expect(message).toContain(programName);
      await expect(programs.programRow(programName)).toBeVisible();
    },
  );
});

test.describe('DS-259 — Unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Unauthenticated user cannot reach program delete actions', async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/login/);
    await expect(programs.signInButton).toBeVisible();
  });
});
