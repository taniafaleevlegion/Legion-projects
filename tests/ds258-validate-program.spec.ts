import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page, Response } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

/** Shared test env can have thousands of programs; create setup needs headroom. */
const PROGRAMS_SETUP_TIMEOUT = 180_000;

const INFORMATICS_NAME = 'Informatique & IA - Niveau 2';
const INFORMATICS_DESCRIPTION = 'Artificial intelligence and informatics curriculum';
const WEB_DEV_NAME = 'Web Development 2026';
const WEB_DEV_DESCRIPTION = 'Full-stack web development program';

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
 * Whitespace-only / empty names leave Create disabled and do not POST.
 * The dialog stays open with no duplicate-name error.
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

async function moveToCreateWithKeyboard(programs: ProgramsPage): Promise<void> {
  const createButton = programs.newProgramModal.createButton;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await programs.page.keyboard.press('Tab');
    const focused = await createButton.evaluate(
      (element) => element === document.activeElement,
    );
    if (focused) {
      return;
    }
  }
}

test.describe('DS-258 — Program name validation and duplicate prevention', () => {
  test.describe.configure({ timeout: 720_000 });

  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
    await expect(programs.programsHeading).toBeVisible();
  });

  // Happy paths

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

  // Negative

  test('Reject program name with only whitespace', async ({ page }) => {
    const programs = programsPage(page);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName('   ');
    // Create stays disabled — whitespace is treated as empty; no POST.
    await expectInvalidNameNotSubmitted(programs);
  });

  // Known gap: duplicate rejection may still be unimplemented (DS-3 / DS-249).
  // Asserts the AC (error, modal open, single row); marked fixme until the app enforces uniqueness.
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

  // Edge cases

  test('Empty program name keeps Create disabled', async ({ page }) => {
    const programs = programsPage(page);

    await openCreateForm(programs);
    await expect(programs.newProgramModal.programNameField).toHaveValue('');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.newProgramModal.heading).toBeVisible();
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

  // Accessibility — axe + keyboard (a11y-checks)

  // Known failure: Mantine dialog close control can lack an accessible name (see programs.a11y).
  // Do not .disableRules(); keep the AC assertion under fixme until the control is named.
  test.fixme(
    'New Program dialog has no axe violations @known-failure',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      await openCreateForm(programs);
      await expect(programs.newProgramModal.createButton).toBeDisabled();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include(programs.newProgramModal.axeIncludeSelector)
        .analyze();

      await expect(results.violations).toEqual([]);
    },
  );

  test(
    'Keyboard creates a special-character program name',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      const programName = uniqueName(INFORMATICS_NAME);

      await openCreateForm(programs);
      await programs.newProgramModal.programNameField.focus();
      await expect(programs.newProgramModal.programNameField).toBeFocused();
      await page.keyboard.type(programName);
      await expect(programs.newProgramModal.programNameField).toHaveValue(programName);
      await expect(programs.newProgramModal.createButton).toBeEnabled();

      await moveToCreateWithKeyboard(programs);
      await expect(programs.newProgramModal.createButton).toBeFocused();

      const responsePromise = programCreateResponse(page);
      await page.keyboard.press('Enter');
      trackProgram(await uuidFromProgramCreateResponse(await responsePromise));

      await expectProgramCreated(programs, programName);
    },
  );
});
