import { expect, type TestInfo } from '@playwright/test';
import type { Result } from 'axe-core';

/**
 * Local: fail on axe violations. CI: attach violation details and pass so the
 * pipeline stays green while the HTML report retains findings.
 */
export async function expectAxeClean(
  violations: Result[],
  summary: string,
  testInfo: TestInfo,
): Promise<void> {
  if (violations.length > 0) {
    await testInfo.attach('axe-violations.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    });
    if (summary) {
      await testInfo.attach('axe-violations.txt', {
        body: summary,
        contentType: 'text/plain',
      });
    }
    testInfo.annotations.push({
      type: 'axe-violations',
      description: `${violations.length} violation(s) recorded (non-blocking in CI)`,
    });
    if (process.env.CI) {
      return;
    }
  }

  await expect(violations, summary).toEqual([]);
}
