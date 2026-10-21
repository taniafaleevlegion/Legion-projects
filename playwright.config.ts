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

const chromiumProject = {
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'playwright/.auth/user.json',
  },
  dependencies: ['setup'],
  testIgnore: /.*\.setup\.ts/,
};

const firefoxProject = {
  name: 'firefox',
  use: { ...devices['Desktop Firefox'] },
  testIgnore: /.*\.setup\.ts/,
};

const webkitProject = {
  name: 'webkit',
  use: { ...devices['Desktop Safari'] },
  testIgnore: /.*\.setup\.ts/,
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Manual maintenance specs — run only when targeted explicitly */
  testIgnore: ['**/manual/**'],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html'], ['github']]
    : 'list',
  use: {
    baseURL: process.env.DIDAXIS_URL,
    trace: 'on-first-retry',
  },

  projects: process.env.CI
    ? [setupProject, chromiumProject]
    : [setupProject, chromiumProject, firefoxProject, webkitProject],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
