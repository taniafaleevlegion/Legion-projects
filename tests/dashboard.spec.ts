import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DashboardPage } from '../pages/DashboardPage';
import { ProgramsPage } from '../pages/ProgramsPage';

const baseURL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

function pathnameIs(path: string) {
  return (url: URL) => url.pathname === path;
}

function dashboardPage(page: Page): DashboardPage {
  return new DashboardPage(page);
}

function programsPage(page: Page): ProgramsPage {
  return new ProgramsPage(page);
}

test.describe('Dashboard — open Programs from the Programs card', () => {
  test.beforeEach(async ({ page }) => {
    const programs = programsPage(page);
    await programs.goto(baseURL);
    await expect(page).toHaveURL(pathnameIs('/programs'));
    await expect(programs.programsHeading).toBeVisible();
  });

  test('Programs card opens the Programs page', async ({ page }) => {
    test.setTimeout(90_000);
    const dashboard = dashboardPage(page);
    const programs = programsPage(page);

    await dashboard.focusDashboardNav();
    await expect(dashboard.dashboardNavButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(pathnameIs('/'));
    await expect(dashboard.dashboardHeading).toBeVisible();
    await expect(dashboard.welcomeText).toBeVisible();
    await expect(dashboard.programsCard).toBeVisible();
    await expect(dashboard.manageAcademicPrograms).toBeVisible();
    await expect(dashboard.programCount).toHaveText(/^\d+$/);

    await dashboard.openProgramsFromCard();

    await expect(page).toHaveURL(pathnameIs('/programs'));
    await expect(programs.programsHeading).toBeVisible();
    await expect(programs.newProgramButton).toBeVisible();

    await dashboard.openDirect(baseURL);

    await expect(page).toHaveURL(pathnameIs('/dashboard'));
    await expect(dashboard.dashboardNavButton).toBeVisible();
    await expect(dashboard.dashboardHeading).toHaveCount(0);
    await expect(dashboard.manageAcademicPrograms).toHaveCount(0);

    await dashboard.openFromSidebar();
    await expect(page).toHaveURL(pathnameIs('/'));
    await expect(dashboard.dashboardHeading).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    await expect(results.violations).toEqual([]);
  });
});
