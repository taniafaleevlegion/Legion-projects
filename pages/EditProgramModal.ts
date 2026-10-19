import type { Locator, Page } from '@playwright/test';

export class EditProgramModal {
  readonly dialog: Locator;
  readonly heading: Locator;
  readonly programNameField: Locator;
  readonly descriptionField: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly showAiConfigButton: Locator;
  readonly duplicateNameError: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog');
    this.heading = this.dialog.getByRole('heading', { name: 'Edit Program' });
    this.programNameField = this.dialog.getByLabel('Program Name');
    this.descriptionField = this.dialog.getByLabel('Description');
    this.saveButton = this.dialog.getByRole('button', { name: 'Save' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.showAiConfigButton = this.dialog.getByRole('button', {
      name: /Show AI Generation Config/i,
    });
    this.duplicateNameError = this.dialog.getByText(
      /already exists|duplicate|unique|name.*taken/i,
    );
  }

  async fillProgramName(name: string): Promise<void> {
    await this.programNameField.fill(name);
  }

  async fillDescription(description: string): Promise<void> {
    await this.descriptionField.fill(description);
  }

  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  async doubleClickSave(): Promise<void> {
    await this.saveButton.dblclick();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async clickShowAiConfig(): Promise<void> {
    await this.showAiConfigButton.click();
  }
}
