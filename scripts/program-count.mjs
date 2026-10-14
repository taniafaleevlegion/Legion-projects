/**
 * Logs in and returns program total from the first GET /api/programs response.
 * Usage: node scripts/program-count.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

async function programTotalFromApi(page) {
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/programs') && r.request().method() === 'GET',
  );
  await page.goto(`${baseURL}/programs`);
  const response = await responsePromise;
  const body = await response.json();
  if (typeof body.total === 'number') return body.total;
  if (typeof body.meta?.total === 'number') return body.meta.total;
  if (Array.isArray(body.data)) return body.data.length;
  if (Array.isArray(body)) return body.length;
  throw new Error(`Unknown programs list shape: ${JSON.stringify(body).slice(0, 200)}`);
}

async function main() {
  const email = process.env.DIDAXIS_EMAIL;
  const password = process.env.DIDAXIS_PASSWORD;
  if (!email || !password) {
    console.error('DIDAXIS_EMAIL and DIDAXIS_PASSWORD required');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));

  const total = await programTotalFromApi(page);
  console.log(total);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
