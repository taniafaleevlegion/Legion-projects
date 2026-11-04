import type { Locator, Page } from '@playwright/test';

export class NewProgramModal {
  readonly dialog: Locator;
  /** Matches `dialog`; axe `.include()` requires a CSS selector. */
  readonly axeIncludeSelector = '[role="dialog"]';
  readonly heading: Locator;
  readonly programNameField: Locator;
  readonly descriptionField: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  /**
   * Dialog X control. tests/programs.a11y.spec.ts records that the Mantine close
   * button has no accessible name, so getByRole({ name }) cannot see it.
   * Keep the button whose label is not Create, Cancel, or another named action.
   */
  readonly closeButton: Locator;
  readonly duplicateNameError: Locator;
  /** DS-254 does not specify error copy; match an alert or the usual validation phrases. */
  readonly validationError: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog');
    this.heading = this.dialog.getByRole('heading', { name: 'New Program' });
    this.programNameField = this.dialog.getByLabel('Program Name');
    this.descriptionField = this.dialog.getByLabel('Description');
    this.createButton = this.dialog.getByRole('button', { name: 'Create' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.closeButton = this.dialog.getByRole('button').filter({
      hasNotText: /create|cancel|save|show|generation/i,
    });
    // Exact duplicate-name copy is unspecified; match the phrases the product uses.
    this.duplicateNameError = this.dialog
      .getByText(/already exists|duplicate|unique|name.*taken/i)
      .or(page.getByRole('alert').filter({ hasText: /already exists|duplicate|unique/i }));
    this.validationError = this.dialog
      .getByRole('alert')
      .or(page.getByRole('alert'))
      .or(
        this.dialog.getByText(
          /already exists|duplicate|unique|name.*taken|too long|maximum|at most|exceeds|exceed|must be|invalid|too many|unable to save|could not|failed to create|something went wrong/i,
        ),
      );
  }

  async fillProgramName(name: string): Promise<void> {
    await this.programNameField.fill(name);
  }

  async fillDescription(description: string): Promise<void> {
    await this.descriptionField.fill(description);
  }

  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  async doubleClickCreate(): Promise<void> {
    await this.createButton.dblclick();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async clickClose(): Promise<void> {
    await this.closeButton.click();
  }

  /** Overlay has no accessible role; the corner sits outside the centered dialog. */
  async clickOutside(): Promise<void> {
    await this.dialog.page().mouse.click(4, 4);
  }
}
