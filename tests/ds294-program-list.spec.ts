import { test, expect, trackProgram, uuidFromProgramCreateResponse } from '../fixtures/cleanup.fixture';
import type { Page } from '@playwright/test';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

const listErrorStatuses = [401, 403, 404, 500, 501, 502, 300] as const;

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
  await expect(programs.newProgramModal.dialog).toBeHidden({ timeout: 180_000 });
}

async function expectProgramListed(
  programs: ProgramsPage,
  name: string,
  description: string,
): Promise<void> {
  await expect(programs.programRowWithDescription(name, description)).toBeVisible({
    timeout: 180_000,
  });
}

async function deleteProgramWithConfirm(
  page: Page,
  programs: ProgramsPage,
  programName: string,
): Promise<void> {
  const handled = new Promise<void>((resolve) => {
    page.once('dialog', async (dialog) => {
      await dialog.accept();
      resolve();
    });
  });
  await programs.clickDeleteProgram(programName);
  await handled;
}

async function mockProgramsGet(page: Page, status: number, body: string): Promise<void> {
  await page.route('**/api/programs', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body,
    });
  });
}

async function expectBlankProgramsPage(page: Page, body: string): Promise<void> {
  await mockProgramsGet(page, 200, body);
  const listResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/programs') && response.request().method() === 'GET',
  );
  const programs = programsPage(page);
  await programs.goto(baseURL);
  await listResponse;
  await expect(programs.programsHeading).not.toBeVisible();
  await expect(programs.emptyStateCopy()).not.toBeVisible();
}

test.describe('DS-294 — Program list filtering and display', () => {
  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.programsHeading).toBeVisible();
  });

  test('Display program list with key details', { tag: '@ds-294' }, async ({ page }) => {
    test.setTimeout(180_000);
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    await createProgram(programs, programName, description);

    await expect(programs.programsHeading).toBeVisible();
    await expectProgramListed(programs, programName, description);
  });

  test(
    'Several programs each show name and description',
    { tag: '@ds-294' },
    async ({ page }) => {
      test.setTimeout(180_000 * 3);
      const programs = programsPage(page);
      const programList = [
        {
          name: uniqueName('Web Development 2026'),
          description: 'Full-stack web curriculum for 2026 cohort',
        },
        {
          name: uniqueName('Data Science 2026'),
          description: 'Statistics, Python, and machine learning foundations',
        },
        {
          name: uniqueName('Cybersecurity 2026'),
          description: 'Network security and incident response track',
        },
      ];

      for (const program of programList) {
        await createProgram(programs, program.name, program.description);
      }

      for (const program of programList) {
        await expectProgramListed(programs, program.name, program.description);
      }
    },
  );

  test('Program list remains accurate after reload', { tag: '@ds-294' }, async ({ page }) => {
    test.setTimeout(180_000);
    const programs = programsPage(page);
    const programName = uniqueName('Cloud Engineering 2026');
    const description = 'Cloud-native architecture and DevOps';

    await createProgram(programs, programName, description);
    await page.reload();
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.programsHeading).toBeVisible();
    await expectProgramListed(programs, programName, description);
  });

  test(
    'Populated list must not show the empty-state message',
    { tag: '@ds-294' },
    async ({ page }) => {
      test.setTimeout(180_000);
      const programs = programsPage(page);
      const programName = uniqueName('Web Development 2026');
      const description = 'Listed program with description';

      await createProgram(programs, programName, description);

      await expect(programs.programRow(programName)).toBeVisible({ timeout: 180_000 });
      await expect(programs.emptyStateCopy()).toHaveCount(0);
    },
  );

  test('Deleted program must not remain in the list', { tag: '@ds-294' }, async ({ page }) => {
    test.setTimeout(180_000);
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    const description = 'To be removed from list display';

    await createProgram(programs, programName, description);
    await expectProgramListed(programs, programName, description);

    await deleteProgramWithConfirm(page, programs, programName);

    await expect(programs.programNameInList(programName)).toHaveCount(0);
    await expect(programs.programNameInList(description)).toHaveCount(0);
  });

  test(
    'Special characters in name and description render in the list',
    { tag: '@ds-294' },
    async ({ page }) => {
      test.setTimeout(180_000);
      const programs = programsPage(page);
      const programName = uniqueName('Informatique & IA - Niveau 2');
      const description = 'Track A/B: C++ & Python (2026)';

      await createProgram(programs, programName, description);
      await expectProgramListed(programs, programName, description);
    },
  );

  test(
    'Unicode and accented characters display in the list',
    { tag: '@ds-294' },
    async ({ page }) => {
      test.setTimeout(180_000);
      const programs = programsPage(page);
      const programName = uniqueName('Programme Été 2026');
      const description = 'Cursus français — débutant';

      await createProgram(programs, programName, description);
      await expectProgramListed(programs, programName, description);
    },
  );

  test('HTML-like description is shown as text', { tag: '@ds-294' }, async ({ page }) => {
    test.setTimeout(180_000);
    const programs = programsPage(page);
    const programName = uniqueName('Security Awareness 2026');
    const description = "<script>alert('x')</script> & <b>Bold</b>";
    let alertFired = false;
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'alert') {
        alertFired = true;
        await dialog.dismiss();
      }
    });

    await createProgram(programs, programName, description);
    await expectProgramListed(programs, programName, description);
    expect(alertFired).toBe(false);
  });

  test(
    'A program with an empty description still shows its name',
    { tag: '@ds-294' },
    async ({ page }) => {
      test.setTimeout(180_000);
      const programs = programsPage(page);
      const programName = uniqueName('Data Science 2026');

      await createProgram(programs, programName, '');

      await expect(programs.programRow(programName)).toBeVisible({ timeout: 180_000 });
    },
  );

  test('Similar program names stay distinguishable', { tag: '@ds-294' }, async ({ page }) => {
    test.setTimeout(180_000 * 2);
    const programs = programsPage(page);
    const name2026 = uniqueName('Web Development 2026');
    const name2027 = uniqueName('Web Development 2027');
    const desc2026 = '2026 full-stack curriculum track';
    const desc2027 = '2027 full-stack curriculum track';

    await createProgram(programs, name2026, desc2026);
    await createProgram(programs, name2027, desc2027);

    await expectProgramListed(programs, name2026, desc2026);
    await expectProgramListed(programs, name2027, desc2027);
  });
});

test.describe('DS-294 — Programs list API responses', () => {
  test('Empty state when no programs exist', { tag: '@ds-294' }, async ({ page }) => {
    await mockProgramsGet(page, 200, JSON.stringify({ data: [] }));
    const programs = programsPage(page);
    await programs.goto(baseURL);

    await expect(programs.emptyStateCopy()).toBeVisible();
    await expect(programs.createProgramPrompt).toBeVisible();
    await expect(programs.newProgramButton).toBeVisible();
  });

  test(
    'Create Program on the empty page opens the form',
    { tag: '@ds-294' },
    async ({ page }) => {
      await mockProgramsGet(page, 200, JSON.stringify({ data: [] }));
      const programs = programsPage(page);
      await programs.goto(baseURL);
      await expect(programs.createProgramPrompt).toBeVisible();

      await programs.openCreateProgramPrompt();

      await expect(programs.newProgramModal.dialog).toBeVisible();
      await expect(programs.newProgramModal.programNameField).toBeVisible();
      await expect(programs.newProgramModal.descriptionField).toBeVisible();
    },
  );

  for (const status of listErrorStatuses) {
    test(
      `GET /api/programs returns ${status} and shows the empty-state copy`,
      { tag: '@ds-294' },
      async ({ page }) => {
        await mockProgramsGet(page, status, JSON.stringify({ data: [] }));
        const programs = programsPage(page);
        await programs.goto(baseURL);

        await expect(programs.emptyStateCopy()).toBeVisible();
      },
    );
  }

  test(
    'Empty list body that is a bare array does not invent an error string',
    { tag: '@ds-294' },
    async ({ page }) => {
      await expectBlankProgramsPage(page, '[]');
    },
  );

  test(
    'Malformed programs list JSON does not invent an error string',
    { tag: '@ds-294' },
    async ({ page }) => {
      await expectBlankProgramsPage(page, '{');
    },
  );

  test(
    'A JSON object instead of a program array does not invent an error string',
    { tag: '@ds-294' },
    async ({ page }) => {
      await expectBlankProgramsPage(page, '{"data":{"name":"Web Development 2026"}}');
    },
  );
});

test.describe('DS-294 — Unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(
    'Unauthenticated user must not see the admin program list',
    { tag: '@ds-294' },
    async ({ page }) => {
      const programs = programsPage(page);
      await programs.goto(baseURL);

      await expect(page).toHaveURL(/\/login/);
      await expect(programs.signInButton).toBeVisible();
      await expect(programs.programsHeading).toHaveCount(0);
    },
  );
});
