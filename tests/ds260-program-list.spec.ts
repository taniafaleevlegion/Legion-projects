import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

/** Shared tenant can have a large programs list; create setup needs headroom. */
const PROGRAMS_SETUP_TIMEOUT = 180_000;

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function programsPage(page: Page): ProgramsPage {
  return new ProgramsPage(page);
}

/**
 * Shared test.didaxis.studio is never empty. Mock GET list as an empty
 * `data` array (API envelope). A raw `[]` body crashes the client.
 */
async function mockEmptyProgramsList(page: Page): Promise<void> {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const pathname = new URL(route.request().url()).pathname;
    if (/\/api\/programs\/.+/.test(pathname)) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
}

async function createProgram(
  programs: ProgramsPage,
  programName: string,
  description?: string,
): Promise<void> {
  await programs.openNewProgramForm();
  await expect(programs.newProgramModal.dialog).toBeVisible();
  await programs.newProgramModal.fillProgramName(programName);
  if (description !== undefined) {
    await programs.newProgramModal.fillDescription(description);
  }
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

async function expectRowShowsNameAndDescription(
  programs: ProgramsPage,
  name: string,
  description: string,
): Promise<void> {
  const row = programs.programRowWithDescription(name, description);
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row.getByText(name, { exact: true })).toBeVisible();
  await expect(row.getByText(description, { exact: true })).toBeVisible();
}

async function assertEmptyState(programs: ProgramsPage): Promise<void> {
  await expect(programs.emptyStateMessage()).toBeVisible();
  await expect(programs.newProgramButton).toBeVisible();
  await expect(programs.createFirstProgramButton).toBeVisible();
}

test.describe('DS-260 — Program list filtering and display', () => {
  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible();
  });

  // Happy paths

  test('Display program list with key details', async ({ page }) => {
    test.setTimeout(90_000);
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web curriculum';

    await createProgram(programs, programName, description);

    await expect(programs.programsHeading).toBeVisible();
    await expect(programs.pageSubtitle).toBeVisible();
    await expect(programs.programColumnHeader).toBeVisible();
    await expectRowShowsNameAndDescription(programs, programName, description);
    await expect(programs.emptyStateMessage()).toHaveCount(0);
  });

  test('Empty state when no programs exist', async ({ page }) => {
    const programs = programsPage(page);
    await mockEmptyProgramsList(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.programsHeading).toBeVisible();
    await assertEmptyState(programs);
  });

  // Edge cases

  test('Program with empty description still shows its name in the list', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');

    await createProgram(programs, programName);

    await expect(programs.programRow(programName)).toBeVisible({ timeout: 15_000 });
    await expect(programs.programNameInList(programName)).toBeVisible();
  });

  test('Multiple programs each show their own name and description', async ({ page }) => {
    test.setTimeout(90_000);
    const programs = programsPage(page);
    const webName = uniqueName('Web Development 2026');
    const dataName = uniqueName('Data Science 2026');
    const webDesc = 'Full-stack web curriculum';
    const dataDesc = 'Statistics and ML foundations';

    await createProgram(programs, webName, webDesc);
    await createProgram(programs, dataName, dataDesc);

    await expectRowShowsNameAndDescription(programs, webName, webDesc);
    await expectRowShowsNameAndDescription(programs, dataName, dataDesc);
  });

  test('Empty list via mocked GET [] shows empty-state copy and create prompt', async ({
    page,
  }) => {
    const programs = programsPage(page);
    await mockEmptyProgramsList(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await assertEmptyState(programs);
    await expect(programs.programColumnHeader).toHaveCount(0);
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
    'Keyboard focuses New Program and Enter opens the create dialog',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = programsPage(page);
      await expect(programs.programsHeading).toBeVisible();

      await programs.newProgramButton.focus();
      await expect(programs.newProgramButton).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(programs.newProgramModal.dialog).toBeVisible();
      await expect(programs.newProgramModal.heading).toBeVisible();
    },
  );
});

test.describe('DS-260 — Unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Unauthenticated user cannot view the program list', async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/login/);
    await expect(programs.signInButton).toBeVisible();
    await expect(programs.programsHeading).toHaveCount(0);
  });
});
