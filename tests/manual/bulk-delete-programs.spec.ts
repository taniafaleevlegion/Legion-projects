/**
 * Manual maintenance — NOT run by default (`testIgnore` in playwright.config.ts).
 *
 * Lists program ids via GET /api/programs, then optionally deletes the first N or all.
 *
 * Examples (PowerShell):
 *   # List count only (no deletes)
 *   npx playwright test tests/manual/bulk-delete-programs.spec.ts --project=chromium
 *
 *   # Delete first 100 programs
 *   $env:CONFIRM_BULK_DELETE="1"; $env:BULK_DELETE_COUNT="100"
 *   npx playwright test tests/manual/bulk-delete-programs.spec.ts --project=chromium
 *
 *   # Delete all programs
 *   $env:CONFIRM_BULK_DELETE="1"; $env:BULK_DELETE_COUNT="all"
 *   npx playwright test tests/manual/bulk-delete-programs.spec.ts --project=chromium
 *
 * Requires DIDAXIS_EMAIL / DIDAXIS_PASSWORD in .env (or DIDAXIS_API_TOKEN for API calls).
 */
import { test, expect } from '@playwright/test';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

function normalizeAuthorization(value: string): string {
  return value.match(/^Bearer\s+/i) ? value : `Bearer ${value}`;
}

function resolveDeleteCount(total: number): number | 'all' | null {
  const raw = process.env.BULK_DELETE_COUNT?.trim();
  if (!raw) {
    return null;
  }
  if (/^all$/i.test(raw)) {
    return 'all';
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`BULK_DELETE_COUNT must be a positive integer or "all", got: ${raw}`);
  }
  return n;
}

test.describe('Manual — bulk delete programs', () => {
  test('GET /api/programs, collect ids, optionally DELETE', async ({ page }) => {
    test.setTimeout(600_000);

    const email = process.env.DIDAXIS_EMAIL;
    const password = process.env.DIDAXIS_PASSWORD;
    test.skip(!email || !password, 'Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env');

    let authorization =
      process.env.DIDAXIS_API_TOKEN != null
        ? normalizeAuthorization(process.env.DIDAXIS_API_TOKEN)
        : undefined;

    page.on('request', (request) => {
      if (!request.url().includes('/api/')) {
        return;
      }
      const raw = request.headers()['authorization'];
      if (raw) {
        authorization = normalizeAuthorization(raw);
      }
    });

    await page.goto(`${baseURL}/login`);
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Password').fill(password!);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).not.toHaveURL(/\/login$/);

    const listResponse = await page.request.get(`${baseURL}/api/programs`, {
      headers: authorization ? { Authorization: authorization } : undefined,
    });
    expect(listResponse.ok(), `GET /api/programs failed: ${listResponse.status()}`).toBeTruthy();

    const listBody = (await listResponse.json()) as {
      data?: Array<{ id: string; name?: string }>;
    };

    /** All program ids from the GET response (separate array for slicing / deletes). */
    const programIds: string[] = [];
    for (const program of listBody.data ?? []) {
      if (program.id) {
        programIds.push(program.id);
      }
    }

    console.log(`[bulk-delete] GET /api/programs → ${programIds.length} id(s) stored in programIds`);

    const deletePlan = resolveDeleteCount(programIds.length);
    if (deletePlan === null) {
      console.log(
        '[bulk-delete] Dry run only. Set BULK_DELETE_COUNT (e.g. 100, 300, 1000, all) and CONFIRM_BULK_DELETE=1 to delete.',
      );
      return;
    }

    expect(process.env.CONFIRM_BULK_DELETE, 'Set CONFIRM_BULK_DELETE=1 to allow deletes').toBe('1');

    const idsToDelete =
      deletePlan === 'all' ? [...programIds] : programIds.slice(0, deletePlan);

    console.log(
      `[bulk-delete] Deleting ${idsToDelete.length} program(s) (${deletePlan === 'all' ? 'all' : `first ${deletePlan}`})…`,
    );

    let deleted = 0;
    let failed = 0;

    for (const id of idsToDelete) {
      if (!authorization) {
        throw new Error('No Authorization available for DELETE');
      }
      const deleteResponse = await page.request.delete(`${baseURL}/api/programs/${id}`, {
        headers: { Authorization: authorization },
      });
      if (deleteResponse.status() === 404) {
        deleted += 1;
        continue;
      }
      if (!deleteResponse.ok()) {
        failed += 1;
        console.warn(
          `[bulk-delete] DELETE ${id} → ${deleteResponse.status()} ${deleteResponse.statusText()}`,
        );
        continue;
      }
      deleted += 1;
      if (deleted % 50 === 0) {
        console.log(`[bulk-delete] progress: ${deleted}/${idsToDelete.length}`);
      }
    }

    console.log(`[bulk-delete] Done. deleted=${deleted} failed=${failed} requested=${idsToDelete.length}`);
    expect(failed, 'One or more DELETE requests failed').toBe(0);
  });
});
