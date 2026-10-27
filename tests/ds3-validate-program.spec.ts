import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page, Response } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

/** Shared test env can have thousands of programs; create setup needs headroom. */
const PROGRAMS_SETUP_TIMEOUT = 180_000;

const INFORMATICS_NAME = 'Informatique & IA - Niveau 2';
const INFORMATICS_DESCRIPTION = 'Artificial intelligence and informatics curriculum';
const WEB_DEV_NAME = 'Web Development 2026';
const WEB_DEV_DESCRIPTION = 'Full-stack web development program';
const ALTERNATE_DESCRIPTION = 'Alternate cohort description';

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

/** Regex so leading and trailing spaces are compared as stored, not trimmed. */
function exactVisibleText(value: string): RegExp {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

function programsPage(page: Page): ProgramsPage {
  return new ProgramsPage(page);
}

function programCreateResponse(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/programs') && response.request().method() === 'POST',
    { timeout: PROGRAMS_SETUP_TIMEOUT },
  );
}

async function openCreateForm(programs: ProgramsPage): Promise<void> {
  await programs.openNewProgramForm();
  await expect(programs.newProgramModal.dialog).toBeVisible();
  await expect(programs.newProgramModal.heading).toBeVisible();
}

async function submitCreateAndTrack(programs: ProgramsPage): Promise<void> {
  const responsePromise = programCreateResponse(programs.page);
  await programs.newProgramModal.clickCreate();
  trackProgram(await uuidFromProgramCreateResponse(await responsePromise));
}

async function expectProgramCreated(programs: ProgramsPage, programName: string): Promise<void> {
  await expect(programs.newProgramModal.dialog).toBeHidden({ timeout: PROGRAMS_SETUP_TIMEOUT });
  await expect(programs.programRow(programName)).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
}

async function seedProgram(
  programs: ProgramsPage,
  programName: string,
  description: string,
): Promise<void> {
  await openCreateForm(programs);
  await programs.newProgramModal.fillProgramName(programName);
  await programs.newProgramModal.fillDescription(description);
  await expect(programs.newProgramModal.createButton).toBeEnabled();
  await submitCreateAndTrack(programs);
  await expectProgramCreated(programs, programName);
}

/**
 * getByText exact trims, so a whitespace-only name also matches empty cells.
 * The field stays blank-or-whitespace, Create stays disabled, and the dialog
 * stays open — that click cannot submit, so no program row is added.
 */
async function expectInvalidNameNotSubmitted(programs: ProgramsPage): Promise<void> {
  await expect(programs.newProgramModal.programNameField).toHaveValue(/^\s*$/);
  await expect(programs.newProgramModal.createButton).toBeDisabled();
  await expect(programs.newProgramModal.dialog).toBeVisible();
  await expect(programs.newProgramModal.heading).toBeVisible();
  await expect(programs.newProgramModal.duplicateNameError).not.toBeVisible();
}

async function submitDuplicateAttempt(programs: ProgramsPage): Promise<Response> {
  const responsePromise = programCreateResponse(programs.page);
  await programs.newProgramModal.clickCreate();
  const response = await responsePromise;
  if (response.status() === 201) {
    trackProgram(await uuidFromProgramCreateResponse(response));
  }
  return response;
}

async function expectDuplicateRejected(programs: ProgramsPage, programName: string): Promise<void> {
  const response = await submitDuplicateAttempt(programs);
  expect(response.status()).not.toBe(201);
  await expect(programs.newProgramModal.duplicateNameError).toBeVisible();
  await expect(programs.newProgramModal.dialog).toBeVisible();
  await expect(programs.newProgramModal.heading).toBeVisible();
  await expect(programs.programRow(programName)).toHaveCount(1, {
    timeout: PROGRAMS_SETUP_TIMEOUT,
  });
}

test.describe('DS-3 — Program name validation and duplicate prevention', () => {
  test.describe.configure({ timeout: 720_000 });

  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await expect(programs.programsHeading).toBeVisible();
  });

  test('Accept program name with special characters', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(INFORMATICS_NAME);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(INFORMATICS_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
    await expect(
      programs.programRowWithDescription(programName, INFORMATICS_DESCRIPTION),
    ).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
  });

  test('Special-character name is accepted when Description is left empty', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(INFORMATICS_NAME);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await expect(programs.newProgramModal.descriptionField).toHaveValue('');
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
  });

  test('Leading and trailing spaces are trimmed before the name is saved', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(INFORMATICS_NAME);
    const paddedName = `  ${programName}  `;

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(paddedName);
    await programs.newProgramModal.fillDescription(INFORMATICS_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
    await expect(programs.programNameInList(programName)).toHaveText(exactVisibleText(programName), {
      timeout: PROGRAMS_SETUP_TIMEOUT,
    });
  });

  test('Reject program name with only whitespace', async ({ page }) => {
    const programs = programsPage(page);
    const nameInput = '   ';

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(nameInput);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await expectInvalidNameNotSubmitted(programs);
  });

  test('Empty program name is not submitted', async ({ page }) => {
    const programs = programsPage(page);

    await openCreateForm(programs);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await expectInvalidNameNotSubmitted(programs);
  });

  test.fixme('Reject duplicate program name @known-failure', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(WEB_DEV_NAME);

    await seedProgram(programs, programName, WEB_DEV_DESCRIPTION);
    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await expectDuplicateRejected(programs, programName);
  });

  test.fixme('Same program name with a different description is still rejected @known-failure', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName(WEB_DEV_NAME);

    await seedProgram(programs, programName, WEB_DEV_DESCRIPTION);
    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(ALTERNATE_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await expectDuplicateRejected(programs, programName);
    await expect(
      programs.programRowWithDescription(programName, ALTERNATE_DESCRIPTION),
    ).toHaveCount(0);
  });

  test('A single space is treated as an empty program name', async ({ page }) => {
    const programs = programsPage(page);
    const nameInput = ' ';

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(nameInput);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await expectInvalidNameNotSubmitted(programs);
  });

  test('Tabs and newlines only are treated as an empty program name', async ({ page }) => {
    const programs = programsPage(page);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName('\t\n');
    await expectInvalidNameNotSubmitted(programs);
  });

  test.fixme('A name that trims to an existing program name is rejected as a duplicate @known-failure', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName(WEB_DEV_NAME);
    const paddedName = `  ${programName}  `;

    await seedProgram(programs, programName, WEB_DEV_DESCRIPTION);
    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(paddedName);
    await programs.newProgramModal.fillDescription(ALTERNATE_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await expectDuplicateRejected(programs, programName);
  });

  test.fixme('Creating the special-character name a second time is rejected @known-failure', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName(INFORMATICS_NAME);

    await seedProgram(programs, programName, INFORMATICS_DESCRIPTION);
    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(INFORMATICS_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await expectDuplicateRejected(programs, programName);
  });

  test('Whitespace-only name can be corrected and then created', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(INFORMATICS_NAME);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName('   ');
    await expect(programs.newProgramModal.createButton).toBeDisabled();

    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(INFORMATICS_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
  });
});
