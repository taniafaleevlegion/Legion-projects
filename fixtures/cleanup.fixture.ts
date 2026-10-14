import { test as base, test as playwrightTest, type APIResponse } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiBaseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

const pendingDeletes = new Map<string, string[]>();
const pendingAuth = new Map<string, string>();

function currentTestId(): string {
  return playwrightTest.info().testId;
}

function normalizeAuthorization(value: string): string {
  return value.match(/^Bearer\s+/i) ? value : `Bearer ${value}`;
}

function authorizationFromRequestHeaders(headers: Record<string, string>): string | undefined {
  const raw = headers.authorization ?? headers.Authorization;
  return raw ? normalizeAuthorization(raw) : undefined;
}

function resolveAuthorization(testId: string): string | undefined {
  const fromEnv = process.env.DIDAXIS_API_TOKEN;
  if (fromEnv) {
    return normalizeAuthorization(fromEnv);
  }
  return pendingAuth.get(testId);
}

export async function uuidFromProgramCreateResponse(response: APIResponse): Promise<string> {
  if (response.status() !== 201) {
    throw new Error(`Expected program create to return 201, got ${response.status()}`);
  }
  const body = (await response.json()) as {
    uuid?: string;
    id?: string;
    data?: { uuid?: string; id?: string };
  };
  const uuid = body.data?.id ?? body.data?.uuid ?? body.uuid ?? body.id;
  if (!uuid) {
    throw new Error(`Create response missing uuid/id: ${JSON.stringify(body)}`);
  }
  return String(uuid);
}

/** Register a program UUID for API deletion after the current test finishes. */
export function trackProgram(uuid: string): void {
  const id = currentTestId();
  const list = pendingDeletes.get(id) ?? [];
  list.push(uuid);
  pendingDeletes.set(id, list);
}

/** Capture uuid + Authorization from POST /api/programs (call right after create). */
export async function trackCreatedProgram(response: APIResponse): Promise<void> {
  const auth = authorizationFromRequestHeaders(response.request().headers());
  if (auth) {
    pendingAuth.set(currentTestId(), auth);
  }
  trackProgram(await uuidFromProgramCreateResponse(response));
}

export const test = base.extend({
  _programCleanup: [
    async ({ page }, use, testInfo) => {
      let bearerFromUi: string | undefined;
      const captureAuth = (request: {
        url: () => string;
        headers: () => Record<string, string>;
      }) => {
        if (!request.url().includes('/api/')) {
          return;
        }
        const token = authorizationFromRequestHeaders(request.headers());
        if (token) {
          bearerFromUi = token;
        }
      };
      page.on('request', captureAuth);

      await use(undefined);

      page.off('request', captureAuth);

      const uuids = pendingDeletes.get(testInfo.testId) ?? [];
      pendingDeletes.delete(testInfo.testId);

      if (uuids.length === 0) {
        pendingAuth.delete(testInfo.testId);
        return;
      }

      const authHeader =
        resolveAuthorization(testInfo.testId) ??
        bearerFromUi ??
        pendingAuth.get(testInfo.testId);
      pendingAuth.delete(testInfo.testId);

      if (!authHeader) {
        throw new Error(
          `Cannot delete ${uuids.length} tracked program(s): no Authorization header. ` +
            'Set DIDAXIS_API_TOKEN or ensure the test creates a program via the UI API (POST /api/programs).',
        );
      }

      for (const uuid of uuids) {
        const deleteResponse = await page.request.delete(`${apiBaseURL}/api/programs/${uuid}`, {
          headers: { Authorization: authHeader },
        });

        if (deleteResponse.status() === 404) {
          const verifyMissing = await page.request.get(`${apiBaseURL}/api/programs/${uuid}`, {
            headers: { Authorization: authHeader },
          });
          if (verifyMissing.status() === 200) {
            throw new Error(
              `Program cleanup failed for ${uuid}: DELETE returned 404 but GET still returns 200`,
            );
          }
          testInfo.annotations.push({
            type: 'program-deleted',
            description: `${uuid} (already absent)`,
          });
          continue;
        }

        if (!deleteResponse.ok()) {
          throw new Error(
            `Program cleanup failed for ${uuid}: DELETE returned ${deleteResponse.status()} ${deleteResponse.statusText()}`,
          );
        }

        const verifyResponse = await page.request.get(`${apiBaseURL}/api/programs/${uuid}`, {
          headers: { Authorization: authHeader },
        });
        if (verifyResponse.status() === 200) {
          throw new Error(`Program cleanup verification failed: ${uuid} still exists after DELETE`);
        }

        testInfo.annotations.push({
          type: 'program-deleted',
          description: uuid,
        });
        if (process.env.DIDAXIS_DEBUG_CLEANUP) {
          console.log(`[cleanup] deleted program ${uuid}`);
        }
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
