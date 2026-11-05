import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

/** Shared test env can have thousands of programs; list visibility after create needs headroom. */
const PROGRAMS_SETUP_TIMEOUT = 180_000;

const WEB_DEV_NAME = 'Web Development 2026';
const WEB_DEV_DESCRIPTION = 'Full-stack web development program';
const SPECIAL_CHAR_NAME = 'Web Development 2026 (C++ & AI)';

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

test.describe('DS-256 — Valeria - Create new academic program', () => {
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

    await openCreateForm(programs);

    await expect(programs.newProgramModal.programNameField).toBeVisible();
    await expect(programs.newProgramModal.descriptionField).toBeVisible();
    await expect(programs.newProgramModal.createButton).toBeVisible();
    await expect(programs.newProgramModal.cancelButton).toBeVisible();
  });

  test('Successfully create a program', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(WEB_DEV_NAME);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
    await expect(
      programs.programRowWithDescription(programName, WEB_DEV_DESCRIPTION),
    ).toBeVisible({ timeout: PROGRAMS_SETUP_TIMEOUT });
  });

  test('Create a program when Description is left empty', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(WEB_DEV_NAME);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await expect(programs.newProgramModal.descriptionField).toHaveValue('');
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
  });

  test('Validation prevents empty program name', async ({ page }) => {
    const programs = programsPage(page);

    await openCreateForm(programs);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await expect(programs.newProgramModal.programNameField).toHaveValue('');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.newProgramModal.heading).toBeVisible();
  });

  test('Cancel does not create a program', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(WEB_DEV_NAME);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await programs.newProgramModal.clickCancel();

    await expect(programs.newProgramModal.dialog).toBeHidden();
    await expect(programs.programRow(programName)).toHaveCount(0);
  });

  test('Whitespace-only program name keeps Create disabled', async ({ page }) => {
    const programs = programsPage(page);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName('   ');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.newProgramModal.heading).toBeVisible();
  });

  test('Program name with special characters is accepted', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName(SPECIAL_CHAR_NAME);

    await openCreateForm(programs);
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription(WEB_DEV_DESCRIPTION);
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await submitCreateAndTrack(programs);

    await expectProgramCreated(programs, programName);
  });

  // Known failure: Mantine dialog close control can lack an accessible name (see programs.a11y).
  // Do not .disableRules(); keep the AC assertion under fixme until the control is named.
  test.fixme(
    'New Program dialog has no axe violations @known-failure',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      await openCreateForm(programs);
      await expect(programs.newProgramModal.programNameField).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include(programs.newProgramModal.axeIncludeSelector)
        .analyze();

      await expect(results.violations).toEqual([]);
    },
  );

  test(
    'Keyboard creates a program via Create',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      const programName = uniqueName(WEB_DEV_NAME);

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
