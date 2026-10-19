import type { Locator, Page } from '@playwright/test';
import { EditProgramModal } from './EditProgramModal';
import { NewProgramModal } from './NewProgramModal';

const emptyStatePattern = /no programs|no program has been|create your first|get started by creating/i;

export class ProgramsPage {
  readonly page: Page;
  readonly main: Locator;
  readonly newProgramButton: Locator;
  readonly programsHeading: Locator;
  readonly signInButton: Locator;
  readonly newProgramModal: NewProgramModal;
  readonly editProgramModal: EditProgramModal;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole('main');
    this.newProgramButton = page.getByRole('button', { name: /New Program/i });
    this.programsHeading = page.getByRole('heading', { name: 'Programs' });
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.newProgramModal = new NewProgramModal(page);
    this.editProgramModal = new EditProgramModal(page);
  }

  programNameInList(name: string): Locator {
    return this.main.getByText(name, { exact: true });
  }

  programRow(name: string): Locator {
    return this.main
      .getByRole('row')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  programRowWithDescription(name: string, description: string): Locator {
    return this.programRow(name).filter({
      has: this.page.getByText(description, { exact: true }),
    });
  }

  editProgramButton(programName: string): Locator {
    return this.programRow(programName).getByRole('button', { name: `Edit ${programName}` });
  }

  deleteProgramButton(programName: string): Locator {
    return this.programRow(programName).getByRole('button', {
      name: `Delete ${programName}`,
    });
  }

  emptyStateMessage(): Locator {
    return this.main.getByText(emptyStatePattern);
  }

  tableRows(): Locator {
    return this.main.getByRole('row');
  }

  async goto(baseURL: string): Promise<void> {
    await this.page.goto(`${baseURL}/programs`);
  }

  async openNewProgramForm(): Promise<void> {
    await this.newProgramButton.click();
  }

  async openEditProgram(programName: string): Promise<void> {
    await this.editProgramButton(programName).click();
  }

  async clickDeleteProgram(programName: string): Promise<void> {
    await this.deleteProgramButton(programName).click();
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
