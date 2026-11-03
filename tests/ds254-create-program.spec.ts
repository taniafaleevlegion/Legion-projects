import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Locator, Page, Request, Response } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

/** Shared test env can have thousands of programs; create setup needs headroom. */
const PROGRAMS_SETUP_TIMEOUT = 180_000;

const DESCRIPTION = 'Full-stack web development program';
const DESCRIPTION_UNIT = 'Full-stack web development program. ';
const NAME_STEM =
  'cohort for full-stack students entering the spring term at Legion QA School';

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function repeatedToLength(unit: string, length: number): string {
  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

/** Ticket prefix plus a timestamp, cut to an exact length so parallel runs do not collide. */
function programNameOfLength(length: number): string {
  const prefix = `Web Development 2026 ${Date.now()} `;
  if (prefix.length >= length) {
    throw new Error(`Unique prefix is ${prefix.length} characters; need fewer than ${length}`);
  }
  return (prefix + repeatedToLength(NAME_STEM, length)).slice(0, length);
}

function descriptionOfLength(length: number): string {
  return repeatedToLength(DESCRIPTION_UNIT, length);
}

/** Regex so leading and trailing spaces are compared as stored, not trimmed. */
function exactVisibleText(value: string): RegExp {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

function programsPage(page: Page): ProgramsPage {
  return new ProgramsPage(page);
}

function programCreateResponse(page: Page, timeout = PROGRAMS_SETUP_TIMEOUT) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/programs') && response.request().method() === 'POST',
    { timeout },
  );
}

/**
 * Empty list for the programs collection. The suite's GET body is `{ data: [...] }`
 * (tests/manual/bulk-delete-programs.spec.ts), so an empty list is `{ data: [] }`.
 * POST is left untouched.
 */
async function mockEmptyProgramList(page: Page): Promise<void> {
  await page.route(
    (url) => /\/api\/programs\/?$/.test(url.pathname),
    async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    },
  );
}

function watchCreatePosts(page: Page): { posted: () => boolean; stop: () => void } {
  let seen = false;
  const onRequest = (request: Request) => {
    if (request.method() === 'POST' && request.url().includes('/api/programs')) {
      seen = true;
    }
  };
  page.on('request', onRequest);
  return {
    posted: () => seen,
    stop: () => page.off('request', onRequest),
  };
}

async function openCreateForm(programs: ProgramsPage): Promise<void> {
  await programs.openNewProgramForm();
  await expect(programs.newProgramModal.dialog).toBeVisible();
  await expect(programs.newProgramModal.heading).toBeVisible();
}

async function submitCreate(programs: ProgramsPage, timeout = PROGRAMS_SETUP_TIMEOUT): Promise<Response | undefined> {
  const responsePromise = programCreateResponse(programs.page, timeout).catch(() => undefined);
  await programs.newProgramModal.clickCreate();
  const response = await responsePromise;
  if (response?.status() === 201) {
    trackProgram(await uuidFromProgramCreateResponse(response));
  }
  return response;
}

async function submitCreateAndTrack(programs: ProgramsPage): Promise<void> {
  const response = await submitCreate(programs);
  expect(response?.status()).toBe(201);
}

async function expectProgramCreated(programs: ProgramsPage, programName: string): Promise<void> {
  await expect(programs.newProgramModal.dialog).toBeHidden({ timeout: PROGRAMS_SETUP_TIMEOUT });
  await expect(programs.programRow(programName)).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
}

async function tabUntilFocused(page: Page, target: Locator): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.keyboard.press('Tab');
    const focused = await target.evaluate((element) => element === document.activeElement);
    if (focused) {
      return;
    }
  }
}

async function moveToCreateWithKeyboard(programs: ProgramsPage): Promise<void> {
  await tabUntilFocused(programs.page, programs.newProgramModal.createButton);
}

async function expectCreateRejected(programs: ProgramsPage, programName: string): Promise<void> {
  const errorsBefore = await programs.newProgramModal.validationError.count();
  const response = await submitCreate(programs, 60_000);
  expect(response?.status()).not.toBe(201);
  await expect
    .poll(async () => programs.newProgramModal.validationError.count(), { timeout: 15_000 })
    .toBeGreaterThan(errorsBefore);
  await expect(programs.programRow(programName)).toHaveCount(0);
}

async function fillCreateForm(
  programs: ProgramsPage,
  programName: string,
  description: string,
): Promise<void> {
  await openCreateForm(programs);
  await programs.newProgramModal.fillProgramName(programName);
  await programs.newProgramModal.fillDescription(description);
}

async function expectDismissedWithoutCreate(
  programs: ProgramsPage,
  programName: string,
  dismiss: () => Promise<void>,
): Promise<void> {
  let createResponse: Response | undefined;
  const onResponse = (response: Response) => {
    if (response.request().method() === 'POST' && response.url().includes('/api/programs')) {
      createResponse = response;
    }
  };
  programs.page.on('response', onResponse);
  await dismiss();
  await expect(programs.newProgramModal.dialog).toBeHidden();
  await expect(programs.programRow(programName)).toHaveCount(0);
  programs.page.off('response', onResponse);
  if (createResponse?.status() === 201) {
    trackProgram(await uuidFromProgramCreateResponse(createResponse));
  }
  expect(createResponse).toBeUndefined();
}

test.describe('DS-254 — Tania - Create new academic program', () => {
  test.describe.configure({ timeout: 720_000 });

  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await expect(programs.programsHeading).toBeVisible();
  });

  test('Navigate to program creation form', async ({ page }) => {
    const programs = programsPage(page);
    await programs.openNewProgramForm();

    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.newProgramModal.heading).toBeVisible();
    await expect(programs.newProgramModal.programNameField).toBeVisible();
    await expect(programs.newProgramModal.descriptionField).toBeVisible();
  });

  test('Successfully create a program', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const programsUrl = page.url();

    await fillCreateForm(programs, programName, DESCRIPTION);
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
    expect(page.url()).toBe(programsUrl);
    await expect(programs.programRowWithDescription(programName, DESCRIPTION)).toBeVisible({
      timeout: PROGRAMS_SETUP_TIMEOUT,
    });
  });

  // auth.setup.ts stores one admin session. No editor or viewer storage state exists.
  // Same skip style as tests/ds5-program-list.spec.ts.
  test('Editor can create a program', async () => {
    test.skip(true, 'No editor or viewer credentials are configured');
  });

  test('Create a program when Description is left empty', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await expect(programs.newProgramModal.descriptionField).toHaveValue('');
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
  });

  test('Validation prevents empty program name', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const posts = watchCreatePosts(page);

    await openCreateForm(programs);
    await programs.newProgramModal.fillDescription(DESCRIPTION);

    await expect(programs.newProgramModal.programNameField).toHaveValue('');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.duplicateNameError).not.toBeVisible();
    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.programRow(programName)).toHaveCount(0);
    expect(posts.posted()).toBe(false);
    posts.stop();
  });

  // Create stays disabled for a whitespace-only name (DS-1 TC-205, DS-3), so the
  // click in this scenario cannot submit. The dialog stays open and no POST is sent.
  test('Whitespace-only program name is not submitted', async ({ page }) => {
    const programs = programsPage(page);
    const posts = watchCreatePosts(page);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName('   ');

    await expect(programs.newProgramModal.programNameField).toHaveValue(/^\s*$/);
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.duplicateNameError).not.toBeVisible();
    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.newProgramModal.heading).toBeVisible();
    expect(posts.posted()).toBe(false);
    posts.stop();
  });

  test('Viewer cannot start program creation', async () => {
    test.skip(true, 'No editor or viewer credentials are configured');
  });

  test('Cancel does not create a program', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');

    await fillCreateForm(programs, programName, DESCRIPTION);
    await expectDismissedWithoutCreate(programs, programName, () =>
      programs.newProgramModal.clickCancel(),
    );
  });

  test('Closing with X does not create a program', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');

    await fillCreateForm(programs, programName, DESCRIPTION);
    await expectDismissedWithoutCreate(programs, programName, () =>
      programs.newProgramModal.clickClose(),
    );
  });

  test('Clicking outside the modal does not create a program', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');

    await fillCreateForm(programs, programName, DESCRIPTION);
    await expectDismissedWithoutCreate(programs, programName, () =>
      programs.newProgramModal.clickOutside(),
    );
  });

  // Same behavior as DS-3 "Reject duplicate program name @known-failure".
  test.fixme('Duplicate program name is rejected @known-failure', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');

    await fillCreateForm(programs, programName, DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);
    await expectProgramCreated(programs, programName);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();

    const responsePromise = programCreateResponse(page);
    await programs.newProgramModal.clickCreate();
    const response = await responsePromise;
    if (response.status() === 201) {
      trackProgram(await uuidFromProgramCreateResponse(response));
    }
    expect(response.status()).not.toBe(201);
    await expect(programs.newProgramModal.duplicateNameError).toBeVisible();
    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.programRow(programName)).toHaveCount(1, {
      timeout: PROGRAMS_SETUP_TIMEOUT,
    });
  });

  test('Program name longer than 100 characters is rejected', async ({ page }) => {
    const programs = programsPage(page);
    const programName = programNameOfLength(101);
    expect(programName.startsWith('Web Development 2026')).toBe(true);
    expect(programName.length).toBe(101);

    await fillCreateForm(programs, programName, DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await expectCreateRejected(programs, programName);
  });

  test('Description longer than 500 characters is rejected', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = descriptionOfLength(501);
    expect(description.startsWith(DESCRIPTION)).toBe(true);
    expect(description.length).toBe(501);

    await fillCreateForm(programs, programName, description);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await expectCreateRejected(programs, programName);
  });

  test('Program name of exactly 100 characters is accepted', async ({ page }) => {
    const programs = programsPage(page);
    const programName = programNameOfLength(100);
    expect(programName.startsWith('Web Development 2026')).toBe(true);
    expect(programName.length).toBe(100);

    await fillCreateForm(programs, programName, DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
  });

  test('Description of exactly 500 characters is accepted', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = descriptionOfLength(500);
    expect(description.startsWith(DESCRIPTION)).toBe(true);
    expect(description.length).toBe(500);

    await fillCreateForm(programs, programName, description);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
  });

  test('Leading and trailing spaces are trimmed from the program name', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const paddedName = `  ${programName}  `;

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(paddedName);
    await programs.newProgramModal.fillDescription(DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
    await expect(programs.programNameInList(programName)).toHaveText(exactVisibleText(programName), {
      timeout: PROGRAMS_SETUP_TIMEOUT,
    });
    await expect(programs.programNameInList(programName)).not.toHaveText(exactVisibleText(paddedName));
  });

  test('Program name with special characters is accepted', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026 (C++ & AI)');

    await fillCreateForm(programs, programName, DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
    await expect(programs.programRowWithDescription(programName, DESCRIPTION)).toBeVisible({
      timeout: PROGRAMS_SETUP_TIMEOUT,
    });
  });

  // Same behavior as DS-1 TC-201 @known-failure. The scenario's "W" is one
  // character; DS-1 rotates A–Z with Date.now() so parallel runs do not share a letter.
  test.fixme('A one-character program name is accepted @known-failure', async ({ page }) => {
    const programs = programsPage(page);
    const programName = String.fromCharCode(65 + (Date.now() % 26));
    expect(programName.length).toBe(1);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(DESCRIPTION);
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
  });

  test(
    'New Program dialog has no WCAG 2 A or AA violations',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      await openCreateForm(programs);
      await expect(programs.newProgramModal.programNameField).toBeVisible();
      await expect(programs.newProgramModal.descriptionField).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include(programs.newProgramModal.axeIncludeSelector)
        .analyze();

      await expect(results.violations).toEqual([]);
    },
  );

  test(
    'Keyboard opens New Program and creates a program',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      const programName = uniqueName('Web Development 2026');

      await tabUntilFocused(page, programs.newProgramButton);
      await expect(programs.newProgramButton).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(programs.newProgramModal.dialog).toBeVisible();
      await expect(programs.newProgramModal.heading).toBeVisible();

      await programs.newProgramModal.programNameField.focus();
      await expect(programs.newProgramModal.programNameField).toBeFocused();
      await page.keyboard.type(programName);
      await expect(programs.newProgramModal.programNameField).toHaveValue(programName);

      await programs.newProgramModal.descriptionField.focus();
      await page.keyboard.type(DESCRIPTION);
      await expect(programs.newProgramModal.descriptionField).toHaveValue(DESCRIPTION);
      await expect(programs.newProgramModal.createButton).toBeEnabled();

      await moveToCreateWithKeyboard(programs);
      await expect(programs.newProgramModal.createButton).toBeFocused();

      const responsePromise = programCreateResponse(page);
      await page.keyboard.press('Enter');
      trackProgram(await uuidFromProgramCreateResponse(await responsePromise));

      await expectProgramCreated(programs, programName);
      await expect(programs.programRowWithDescription(programName, DESCRIPTION)).toBeVisible({
        timeout: PROGRAMS_SETUP_TIMEOUT,
      });
    },
  );
});

test.describe('DS-254 — Empty programs list', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await mockEmptyProgramList(page);
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.programsHeading).toBeVisible();
  });

  test('Empty programs page offers program creation', async ({ page }) => {
    const programs = programsPage(page);
    await expect(programs.emptyStateCopy).toHaveText(
      'No programs yet. Create your first program to get started.',
    );
    await expect(programs.createProgramButton).toBeVisible();
  });

  test('Create Program on the empty page opens the form', async ({ page }) => {
    const programs = programsPage(page);
    await programs.openCreateProgramFromEmptyState();

    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.newProgramModal.heading).toBeVisible();
    await expect(programs.newProgramModal.programNameField).toBeVisible();
    await expect(programs.newProgramModal.descriptionField).toBeVisible();
  });
});
