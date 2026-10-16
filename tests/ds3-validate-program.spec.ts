import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

function requireAdminCredentials(): { email: string; password: string } {
  const email = process.env.DIDAXIS_EMAIL;
  const password = process.env.DIDAXIS_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'DIDAXIS_EMAIL and DIDAXIS_PASSWORD must be set (e.g. via .env loaded by playwright.config.ts).',
    );
  }
  return { email, password };
}

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function programCreateResponse(page: Page, timeout?: number) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/programs') && response.request().method() === 'POST',
    timeout === undefined ? undefined : { timeout },
  );
}

async function clickCreateAndTrack(programs: ProgramsPage): Promise<void> {
  const responsePromise = programCreateResponse(programs.page);
  await programs.newProgramModal.clickCreate();
  trackProgram(await uuidFromProgramCreateResponse(await responsePromise));
}

async function createProgram(
  programs: ProgramsPage,
  programName: string,
  description: string,
): Promise<void> {
  await programs.openNewProgramForm();
  await programs.newProgramModal.fillProgramName(programName);
  await programs.newProgramModal.fillDescription(description);
  await clickCreateAndTrack(programs);
  await expect(programs.newProgramModal.dialog).toBeHidden({ timeout: 20_000 });
  await expect(programs.editProgramButton(programName)).toBeVisible({ timeout: 20_000 });
}

async function expectDuplicateCreateRejected(
  programs: ProgramsPage,
  inputName: string,
  description: string,
  listName: string,
): Promise<boolean> {
  const countBefore = await programs.programRow(listName).count();
  await programs.openNewProgramForm();
  await programs.newProgramModal.fillProgramName(inputName);
  await programs.newProgramModal.fillDescription(description);

  const responsePromise = programCreateResponse(programs.page);
  await programs.newProgramModal.clickCreate();
  const response = await responsePromise;

  if (response.status() === 201) {
    trackProgram(await uuidFromProgramCreateResponse(response));
  }

  expect(response.status(), 'duplicate create must not return 201 Created').not.toBe(201);
  expect(await programs.programRow(listName).count()).toBe(countBefore);

  if (await programs.newProgramModal.dialog.isVisible()) {
    await expect(programs.newProgramModal.duplicateNameError).toBeVisible();
    return true;
  }
  return false;
}

test.describe('DS-3 — Program name validation and duplicate prevention', () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = requireAdminCredentials();
    const login = new LoginPage(page);
    await login.goto(baseURL);
    await login.login(email, password);
    await expect(page).not.toHaveURL(/\/login$/);

    const programs = new ProgramsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible();
  });

  test('TC-001 — Valid program name with special characters creates program successfully', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Informatique & IA - Niveau 2');

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription('Second-year informatics and AI track');
    await clickCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible();
  });

  test('TC-002 — Program Name with leading and trailing spaces trims on create', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const suffix = Date.now();
    const storedName = `Data Science 2026 ${suffix}`;
    const paddedName = `  ${storedName}  `;

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(paddedName);
    await programs.newProgramModal.fillDescription('Trim validation cohort');
    await clickCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(storedName)).toBeVisible();
  });

  test('TC-003 — Alphanumeric Program Name with hyphen creates program when unique', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Cloud Engineering 2026');
    await createProgram(programs, programName, 'Cloud-native architecture and DevOps');
    await expect(programs.programRow(programName)).toBeVisible();
  });

  test('TC-004 — Unicode and accented characters in Program Name are accepted when unique', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Programme Été 2026 — Montréal');
    await createProgram(programs, programName, 'French-language summer cohort');
    await expect(programs.programRow(programName)).toBeVisible();
  });

  test('TC-101 — Whitespace-only Program Name prevents form submission', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName('   ');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.dialog).toBeVisible();
  });

  test('TC-103 — Empty Program Name prevents submission', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await programs.openNewProgramForm();
    await programs.newProgramModal.fillDescription('Description without a program name');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.dialog).toBeVisible();
  });

  test('TC-102 — Duplicate Program Name shows error and does not create second program', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Original cohort');
    await expectDuplicateCreateRejected(
      programs,
      programName,
      'Alternate cohort description',
      programName,
    );
  });

  test('TC-104 — Duplicate after trim is rejected when stored name matches trimmed input', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Stored without padding');

    await expectDuplicateCreateRejected(
      programs,
      `  ${programName}  `,
      'Padded duplicate attempt',
      programName,
    );
  });

  test('TC-105 — Client must not create duplicate when error is shown', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Persisted program');

    await expectDuplicateCreateRejected(programs, programName, 'Should not persist', programName);

    await page.reload();
    await expect(page).toHaveURL(/\/programs/);
    expect(await programs.programRow(programName).count()).toBe(1);
  });

  test('TC-106 — Duplicate error is specific to Program Name; other fields stay populated', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Existing');

    const description = 'Alternate cohort description kept on failure';
    const dialogStayedOpen = await expectDuplicateCreateRejected(
      programs,
      programName,
      description,
      programName,
    );
    expect(dialogStayedOpen).toBe(true);
    await expect(programs.newProgramModal.descriptionField).toHaveValue(description);
  });

  test('TC-201 — Tabs and newlines only in Program Name treated as empty', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName('\t\n\t');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.dialog).toBeVisible();
  });

  test('TC-202 — Mixed whitespace and visible characters trims outer whitespace only', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const suffix = Date.now();
    const storedName = `Informatique & IA - Niveau 2 ${suffix}`;
    const paddedName = `  ${storedName}  `;

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(paddedName);
    await programs.newProgramModal.fillDescription('Internal spacing preserved');
    await clickCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(storedName)).toBeVisible();
  });

  test('TC-203 — Case-variant duplicate name behavior is documented', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = Date.now();
    const programName = `Web Development 2026 ${suffix}`;
    const caseVariant = `web development 2026 ${suffix}`;
    await createProgram(programs, programName, 'Case sensitivity probe');
    const countBefore =
      (await programs.programRow(programName).count()) +
      (await programs.programRow(caseVariant).count());

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(caseVariant);
    await programs.newProgramModal.fillDescription('Case variant attempt');

    const responsePromise = programCreateResponse(page, 15_000).catch(() => null);
    await programs.newProgramModal.clickCreate();
    await Promise.race([
      programs.newProgramModal.dialog.waitFor({ state: 'hidden', timeout: 15_000 }),
      programs.newProgramModal.duplicateNameError.waitFor({ state: 'visible', timeout: 15_000 }),
    ]).catch(() => {});

    const response = await responsePromise;
    if (response?.status() === 201) {
      trackProgram(await uuidFromProgramCreateResponse(response));
    }

    const rejected = await programs.newProgramModal.dialog.isVisible();
    const countAfter =
      (await programs.programRow(programName).count()) +
      (await programs.programRow(caseVariant).count());

    if (rejected) {
      await expect(programs.newProgramModal.duplicateNameError).toBeVisible();
      expect(countAfter).toBe(countBefore);
    } else {
      await expect(programs.newProgramModal.dialog).toBeHidden();
      expect(countAfter).toBeGreaterThan(countBefore);
    }
  });

  test('TC-208 — HTML-like characters in Program Name are stored as plain text', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName("<script>alert('x')</script> Test 2026");
    let dialogAlert = false;
    page.on('dialog', () => {
      dialogAlert = true;
    });

    await createProgram(programs, programName, 'XSS-safe name display check');
    await expect(programs.programRow(programName)).toBeVisible();
    expect(dialogAlert).toBe(false);
  });

  test('TC-209 — Whitespace padding around existing name triggers duplicate rejection', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Duplicate padding test');
    const padded = `${' '.repeat(50)}${programName}${' '.repeat(50)}`;

    await expectDuplicateCreateRejected(programs, padded, 'Padded duplicate', programName);
  });
});
