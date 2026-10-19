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

async function deleteProgramWithConfirm(programs: ProgramsPage, programName: string): Promise<void> {
  const handled = new Promise<void>((resolve) => {
    programs.page.once('dialog', async (dialog) => {
      await dialog.accept();
      resolve();
    });
  });
  await programs.clickDeleteProgram(programName);
  await handled;
}

test.describe('DS-5 — Program list filtering and display', () => {
  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.newProgramButton).toBeVisible();
  });

  test('TC-001 — Programs list displays name and description for every created program', async ({
    page,
  }) => {
    test.setTimeout(90_000);
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
      await expectRowShowsNameAndDescription(programs, program.name, program.description);
    }
  });

  test('TC-002 — Single program shows name and description on the Programs page', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Cloud Engineering 2026');
    const description = 'Cloud-native architecture and DevOps';
    await createProgram(programs, programName, description);

    await expectRowShowsNameAndDescription(programs, programName, description);
    await expect(programs.emptyStateMessage()).toHaveCount(0);
  });

  test('TC-003 — Empty state shows no-program message and create prompt', async ({ page }) => {
    test.skip(
      true,
      'Requires an isolated tenant with zero programs; shared test.didaxis.studio always has existing programs.',
    );
    const programs = programsPage(page);
    await expect(programs.emptyStateMessage()).toBeVisible();
    await expect(programs.newProgramButton).toBeVisible();
  });

  test('TC-004 — Create-first-program prompt opens program creation', async ({ page }) => {
    test.skip(
      true,
      'Requires empty program list; use isolated tenant or DB reset to validate empty-state CTA.',
    );
    const programs = programsPage(page);
    await programs.openNewProgramForm();
    await expect(programs.newProgramModal.programNameField).toBeVisible();
  });

  test('TC-005 — Program list remains accurate after browser reload', async ({ page }) => {
    const programs = programsPage(page);
    const programA = uniqueName('Web Development 2026');
    const programB = uniqueName('Data Science 2026');
    const descA = 'Full-stack web curriculum for 2026 cohort';
    const descB = 'Statistics, Python, and machine learning foundations';
    await createProgram(programs, programA, descA);
    await createProgram(programs, programB, descB);

    await page.reload();
    await expect(page).toHaveURL(/\/programs/);

    await expectRowShowsNameAndDescription(programs, programA, descA);
    await expectRowShowsNameAndDescription(programs, programB, descB);
  });

  test('TC-006 — Special characters in name and description render correctly in the list', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Informatique & IA - Niveau 2');
    const description = 'Track A/B: C++ & Python (2026)';
    await createProgram(programs, programName, description);
    await expectRowShowsNameAndDescription(programs, programName, description);
  });

  test('TC-007 — Newly created program appears in the list with name and description', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Mobile Development 2026');
    const description = 'iOS and Android fundamentals';
    await createProgram(programs, programName, description);
    await expectRowShowsNameAndDescription(programs, programName, description);
  });

  test('TC-101 — Populated list must not show empty-state messaging', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    await createProgram(programs, programName, 'Listed program with description');

    await expect(programs.programRow(programName)).toBeVisible();
    await expect(programs.emptyStateMessage()).toHaveCount(0);
  });

  test('TC-102 — Empty state must not display fabricated program rows', async ({ page }) => {
    test.skip(
      true,
      'Requires zero programs in tenant to validate empty state without placeholder rows.',
    );
    const programs = programsPage(page);
    await expect(programs.main.getByText(/sample program|lorem ipsum/i)).toHaveCount(0);
  });

  test('TC-105 — Each visible program row shows both name and description', async ({ page }) => {
    test.setTimeout(60_000);
    const programs = programsPage(page);
    const programList = [
      { name: uniqueName('List Integrity A'), description: 'Description A for list check' },
      { name: uniqueName('List Integrity B'), description: 'Description B for list check' },
    ];
    for (const p of programList) {
      await createProgram(programs, p.name, p.description);
    }
    for (const p of programList) {
      await expectRowShowsNameAndDescription(programs, p.name, p.description);
    }
  });

  test('TC-106 — Deleted program must not remain visible in the list', async ({ page }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Test Program');
    const description = 'To be removed from list display';
    await createProgram(programs, programName, description);
    await expectRowShowsNameAndDescription(programs, programName, description);

    await deleteProgramWithConfirm(programs, programName);

    await expect(programs.main.getByText(programName, { exact: true })).toHaveCount(0);
    await expect(programs.main.getByText(description, { exact: true })).toHaveCount(0);
  });

  test('TC-107 — Rejected duplicate create does not add incomplete list row', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = 'Original list entry';
    await createProgram(programs, programName, description);
    await expectRowShowsNameAndDescription(programs, programName, description);

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(programName);
    await programs.newProgramModal.fillDescription('Duplicate attempt');
    const responsePromise = programs.page.waitForResponse(
      (r) => r.url().includes('/api/programs') && r.request().method() === 'POST',
    );
    await programs.newProgramModal.clickCreate();
    const response = await responsePromise;

    if (response.status() === 201) {
      trackProgram(await uuidFromProgramCreateResponse(response));
      test.info().annotations.push({
        type: 'product-gap',
        description: 'API allows duplicate program names; DS-3 duplicate prevention not enforced.',
      });
    } else {
      expect(response.status()).not.toBe(201);
    }

    await expectRowShowsNameAndDescription(programs, programName, description);
    if (response.status() === 201) {
      await expectRowShowsNameAndDescription(programs, programName, 'Duplicate attempt');
    }

    if (await programs.newProgramModal.dialog.isVisible()) {
      await programs.newProgramModal.clickCancel();
    }
  });

  test('TC-203 — Unicode and accented characters display correctly in the list', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Programme Été 2026');
    const description = 'Cursus français — débutant';
    await createProgram(programs, programName, description);
    await expectRowShowsNameAndDescription(programs, programName, description);
  });

  test('TC-205 — HTML-like description is shown safely without executing script', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const programName = uniqueName('Security Awareness 2026');
    const description = "<script>alert('x')</script> & <b>Bold</b>";
    let alertFired = false;
    programs.page.on('dialog', (d) => {
      if (d.type() === 'alert') alertFired = true;
    });

    await createProgram(programs, programName, description);
    await expectRowShowsNameAndDescription(programs, programName, description);
    expect(alertFired).toBe(false);
  });

  test('TC-206 — Trimmed program name displays without leading or trailing spaces', async ({
    page,
  }) => {
    const programs = programsPage(page);
    const suffix = Date.now();
    const storedName = `Data Science 2026 ${suffix}`;
    const paddedName = `  ${storedName}  `;
    const description = 'Whitespace trim display test';

    await programs.openNewProgramForm();
    await programs.newProgramModal.fillProgramName(paddedName);
    await programs.newProgramModal.fillDescription(description);
    const responsePromise = programs.page.waitForResponse(
      (r) => r.url().includes('/api/programs') && r.request().method() === 'POST',
    );
    await programs.newProgramModal.clickCreate();
    trackProgram(await uuidFromProgramCreateResponse(await responsePromise));
    await expect(programs.newProgramModal.dialog).toBeHidden();

    await expectRowShowsNameAndDescription(programs, storedName, description);
  });

  test('TC-207 — Creating first program replaces empty-state messaging', async ({ page }) => {
    test.skip(
      true,
      'Requires starting from zero programs; not feasible on shared test environment.',
    );
  });

  test('TC-208 — Deleting the last program restores empty state with create prompt', async ({
    page,
  }) => {
    test.skip(
      true,
      'Requires exactly one program in tenant; shared environment has many programs.',
    );
  });

  test('TC-210 — Similar program names remain distinguishable in the list', async ({ page }) => {
    const programs = programsPage(page);
    const name2026 = uniqueName('Web Development 2026');
    const name2027 = uniqueName('Web Development 2027');
    const desc2026 = '2026 full-stack curriculum track';
    const desc2027 = '2027 full-stack curriculum track';
    await createProgram(programs, name2026, desc2026);
    await createProgram(programs, name2027, desc2027);

    await expectRowShowsNameAndDescription(programs, name2026, desc2026);
    await expectRowShowsNameAndDescription(programs, name2027, desc2027);
  });
});

test.describe('DS-5 — Unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-103 — Unauthenticated user must not see the admin program list', async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(/\/login/);
    await expect(programs.signInButton).toBeVisible();
    await expect(programs.programsHeading).toHaveCount(0);
  });
});
