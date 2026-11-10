import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const setupProject = {
  name: 'setup',
  testMatch: /.*\.setup\.ts/,
};

/**
 * A project testIgnore replaces the root one.
 * Skip the auth setup file and manual maintenance specs (those use playwright.manual.config.ts).
 * The folder check is a regex because a glob does not match Windows backslash paths.
 */
const browserTestIgnore = [/.*\.setup\.ts/, /manual[\\/]/];

const chromiumProject = {
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'playwright/.auth/user.json',
  },
  dependencies: ['setup'],
  testIgnore: browserTestIgnore,
};

// const firefoxProject = {
//   name: 'firefox',
//   use: { ...devices['Desktop Firefox'] },
//   testIgnore: browserTestIgnore,
// };

const webkitProject = {
  name: 'webkit',
  use: { ...devices['Desktop Safari'] },
  testIgnore: browserTestIgnore,
};

/** `npm run test:destructive` sets this. That slice is one worker and is not part of the default suite. */
const destructiveRun = process.env.npm_lifecycle_event === 'test:destructive';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Applies to projects that do not set their own testIgnore (the setup project). */
  testIgnore: /manual[\\/]/,
  /* Parallel by default. The destructive script forces one worker so shared settings cannot race. */
  fullyParallel: !destructiveRun,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(destructiveRun
    ? { workers: 1, grep: /@destructive/ }
    : { grepInvert: /@destructive/ }),
  reporter: process.env.CI
    ? [['html'], ['github']]
    : 'list',
  use: {
    baseURL: process.env.DIDAXIS_URL,
    trace: 'on-first-retry',
    locale: 'en-CA',
    timezoneId: 'America/Toronto',
  },

  projects: destructiveRun || process.env.CI
    ? [setupProject, chromiumProject]
    : [setupProject, chromiumProject, webkitProject],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
