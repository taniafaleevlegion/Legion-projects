import type { Locator, Page } from '@playwright/test';
import { NewProgramModal } from './NewProgramModal';

export class ProgramsPage {
  readonly page: Page;
  readonly main: Locator;
  readonly newProgramButton: Locator;
  readonly programsHeading: Locator;
  readonly signInButton: Locator;
  readonly newProgramModal: NewProgramModal;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole('main');
    this.newProgramButton = page.getByRole('button', { name: /New Program/i });
    this.programsHeading = page.getByRole('heading', { name: 'Programs' });
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.newProgramModal = new NewProgramModal(page);
  }

  programNameInList(name: string): Locator {
    return this.main.getByText(name, { exact: true });
  }

  programRow(name: string): Locator {
    return this.main.getByRole('row').filter({ hasText: name });
  }

  editProgramButton(programName: string): Locator {
    return this.programRow(programName).getByRole('button', { name: `Edit ${programName}` });
  }

  async goto(baseURL: string): Promise<void> {
    await this.page.goto(`${baseURL}/programs`);
  }

  async openNewProgramForm(): Promise<void> {
    await this.newProgramButton.click();
  }

  async createProgram(programName: string, description?: string): Promise<void> {
    await this.openNewProgramForm();
    await this.newProgramModal.fillProgramName(programName);
    if (description !== undefined) {
      await this.newProgramModal.fillDescription(description);
    }
    await this.newProgramModal.clickCreate();
  }
}
