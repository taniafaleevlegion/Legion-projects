import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page, Response } from '@playwright/test';
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

async function submitCreateDblClickAndTrack(programs: ProgramsPage): Promise<void> {
  const seenResponses = new WeakSet<Response>();
  const onCreate = async (response: Response) => {
    if (seenResponses.has(response)) {
      return;
    }
    if (response.request().method() !== 'POST' || response.status() !== 201) {
      return;
    }
    seenResponses.add(response);
    trackProgram(await uuidFromProgramCreateResponse(response));
  };
  programs.page.on('response', onCreate);
  await programs.newProgramModal.doubleClickCreate();
  await expect(programs.newProgramModal.dialog).toBeHidden({ timeout: 20_000 });
  await programs.page.waitForTimeout(500);
  programs.page.off('response', onCreate);
}

test.describe('DS-1 — Create new academic program', () => {
  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible();
  });

  test('TC-001 — Admin opens program creation form with required fields', async ({
    page,
  }) => {
    const programs = programsPage(page);
    await programs.openNewProgramForm();
    await expect(programs.newProgramModal.createButton).toBeVisible();
  });

  test('TC-002 — Admin creates program with name and description; list updates', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(description);
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
  });

  test('TC-003 — Create button disabled when Program Name is empty', async ({ page }) => {
    const programs = programsPage(page);
    await programs.openNewProgramForm();
    await programs.newProgramModal.fillDescription('Any description');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
  });

  test('TC-004 — Admin creates program with name only (Description empty)', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Data Science Fundamentals');

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(programName);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
  });

  test('TC-005 — Admin cancels creation; no new program in list', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Temporary Program Name');

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription('Should not be saved');
    await programs.newProgramModal.clickCancel();

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  test('TC-006 — New program appears in list without full page reload', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Cloud Computing 2026');
    const programsUrl = page.url();

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription('AWS and Azure basics');
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    expect(page.url()).toBe(programsUrl);
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
  });

  test('TC-102 — Empty Program Name cannot result in a saved program', async ({
    page,
  }) => {
    const programs = programsPage(page);
    await programs.openNewProgramForm();
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await programs.newProgramModal.clickCancel();
    await expect(programs.newProgramModal.dialog).toBeHidden();
  });

  test('TC-103 — Create remains disabled after clearing a previously entered name', async ({
    page,
  }) => {
    const programs = programsPage(page);
    await programs.openNewProgramForm();

    await programs.newProgramModal.fillProgramName('Initial Name');
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await programs.newProgramModal.fillProgramName('');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
  });

  test.fixme('TC-201 — Program Name at minimum valid length (single character) @known-failure', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = String.fromCharCode(65 + (Date.now() % 26));

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription('Single-letter name test');
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
  });

  test('TC-204 — Program Name with leading and trailing whitespace is trimmed', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const suffix = Date.now();
    const storedName = `Web Development ${suffix}`;
    const paddedName = `  ${storedName}  `;

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(paddedName);
    await programs.newProgramModal.fillDescription('Whitespace trimming test');
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(storedName)).toBeVisible({ timeout: 15_000 });
  });

  test('TC-205 — Program Name containing only whitespace cannot be created', async ({
    page,
  }) => {
    const programs = programsPage(page);
    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName('   ');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
  });

  test('TC-206 — Special characters and Unicode in Program Name', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Développement Web — 2026 (Phase 1)');

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription('Accents, em dash, parentheses');
    await submitCreateAndTrack(programs);

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
  });

  // DS-189 — double-click Create submits twice (separate from duplicate-name validation)
  test.fixme('TC-212 — Rapid double-click on Create creates only one program', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Double Submit Program');

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription('Idempotency test');
    await submitCreateDblClickAndTrack(programs);

    await expect(programs.programRow(programName)).toHaveCount(1);
  });
});

test.describe('DS-1 — Unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-105 — Unauthenticated user cannot reach program creation', async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/login/);
    await expect(programs.signInButton).toBeVisible();
    await expect(programs.newProgramButton).toHaveCount(0);
  });
});
