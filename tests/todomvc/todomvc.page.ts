import { expect, type Locator, type Page } from '@playwright/test';

export const TODO_MVC_URL = 'https://demo.playwright.dev/todomvc/#/';

export class TodoMVCPage {
  constructor(readonly page: Page) {}

  async gotoClean(): Promise<void> {
    await this.page.goto(TODO_MVC_URL);
    await this.page.evaluate(() => localStorage.removeItem('react-todos'));
    await this.page.reload();
    await expect(this.page).toHaveTitle(/TodoMVC/);
  }

  get newTodoInput(): Locator {
    return this.page.getByPlaceholder('What needs to be done?');
  }

  get footer(): Locator {
    return this.page.locator('footer.footer');
  }

  get todoItems(): Locator {
    return this.page.getByTestId('todo-item');
  }

  todoItem(title: string, index = 0): Locator {
    return this.todoItems
      .filter({
        has: this.page.getByTestId('todo-title').getByText(title, { exact: true }),
      })
      .nth(index);
  }

  async addTodo(title: string): Promise<void> {
    await this.newTodoInput.fill(title);
    await this.newTodoInput.press('Enter');
  }

  async toggleTodo(title: string, index = 0): Promise<void> {
    const item = this.todoItem(title, index);
    await item.getByRole('checkbox', { name: 'Toggle Todo' }).click({ force: true });
  }

  async deleteTodo(title: string, index = 0): Promise<void> {
    const item = this.todoItem(title, index);
    await item.hover();
    await item.getByRole('button', { name: 'Delete' }).click();
  }

  async expectItemsLeft(count: number): Promise<void> {
    const label = count === 1 ? '1 item left' : `${count} items left`;
    await expect(this.footer.getByText(label, { exact: true })).toBeVisible();
  }

  markAllComplete(): Locator {
    return this.page.getByRole('checkbox', { name: 'Mark all as complete' });
  }
}
