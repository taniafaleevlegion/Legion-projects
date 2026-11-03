import type { Locator, Page } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly main: Locator;
  readonly dashboardNavButton: Locator;
  readonly dashboardHeading: Locator;
  readonly welcomeText: Locator;
  readonly manageAcademicPrograms: Locator;
  readonly programsCard: Locator;
  readonly programCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole('main');
    this.dashboardNavButton = page.getByRole('button', { name: '📊 Dashboard' });
    this.dashboardHeading = page.getByRole('heading', {
      name: 'Dashboard',
      exact: true,
      level: 2,
    });
    this.welcomeText = this.main.getByText('Welcome to Didaxis Studio', { exact: true });
    this.manageAcademicPrograms = this.main.getByText('Manage academic programs', { exact: true });
    // The card has no role. Its text is the live count, "Programs", and the cue.
    this.programsCard = this.main.getByText(/\d+[\s\S]*Programs[\s\S]*Manage academic programs/);
    this.programCount = this.programsCard.getByText(/^\d+$/);
  }

  async openFromSidebar(): Promise<void> {
    await this.dashboardNavButton.click();
  }

  async openDirect(baseURL: string): Promise<void> {
    await this.page.goto(`${baseURL}/dashboard`);
  }

  async openProgramsFromCard(): Promise<void> {
    await this.manageAcademicPrograms.click();
  }

  async focusDashboardNav(): Promise<void> {
    const button = this.dashboardNavButton;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const focused = await button.evaluate((element) => element === document.activeElement);
      if (focused) {
        return;
      }
      await this.page.keyboard.press('Tab');
    }
  }
}
