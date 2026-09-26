import { test, expect } from '@playwright/test';
import { TodoMVCPage } from './todomvc.page';

test.describe('TodoMVC — Positive flows', () => {
  test('TC-001 — Single todo appears in the list after valid entry', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();

    await todos.newTodoInput.click();
    await todos.addTodo('Buy milk');

    await expect(todos.todoItems).toHaveCount(1);
    await expect(todos.todoItem('Buy milk').getByTestId('todo-title')).toHaveText('Buy milk');
    await expect(todos.newTodoInput).toHaveValue('');
    await todos.expectItemsLeft(1);
    await expect(todos.footer.getByRole('link', { name: 'All' })).toBeVisible();
    await expect(todos.footer.getByRole('link', { name: 'Active' })).toBeVisible();
    await expect(todos.footer.getByRole('link', { name: 'Completed' })).toBeVisible();
    await expect(todos.markAllComplete()).toBeVisible();
  });

  test('TC-002 — Multiple distinct todos are all listed in add order', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();

    await todos.addTodo('Buy milk');
    await todos.addTodo('Walk the dog');
    await todos.addTodo('Pay electric bill');

    await expect(todos.page.getByTestId('todo-title')).toHaveText([
      'Buy milk',
      'Walk the dog',
      'Pay electric bill',
    ]);
    await todos.expectItemsLeft(3);

    for (const title of ['Buy milk', 'Walk the dog', 'Pay electric bill']) {
      const item = todos.todoItem(title);
      await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).not.toBeChecked();
      await expect(item.locator('button.destroy')).toHaveCount(1);
    }
  });

  test('TC-003 — Todo item is marked completed when toggled', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Schedule dentist');

    await todos.toggleTodo('Schedule dentist');

    const item = todos.todoItem('Schedule dentist');
    await expect(item).toHaveClass(/completed/);
    await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).toBeChecked();
    await todos.expectItemsLeft(0);
    await expect(todos.todoItem('Schedule dentist').getByTestId('todo-title')).toBeVisible();
  });

  test('TC-004 — Completed todo can be returned to active by toggling again', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Schedule dentist');
    await todos.toggleTodo('Schedule dentist');

    await todos.toggleTodo('Schedule dentist');

    const item = todos.todoItem('Schedule dentist');
    await expect(item).not.toHaveClass(/completed/);
    await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).not.toBeChecked();
    await todos.expectItemsLeft(1);
  });

  test('TC-005 — Todo is removed from the list when Delete is used', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Walk the dog');

    await todos.deleteTodo('Walk the dog');

    await expect(todos.page.getByTestId('todo-title')).toHaveCount(0);
    await expect(todos.footer).toBeHidden();
    await expect(todos.newTodoInput).toBeVisible();
  });

  test('TC-006 — Delete removes only the targeted todo when multiple exist', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Buy milk');
    await todos.addTodo('Walk the dog');

    await todos.deleteTodo('Buy milk');

    await expect(todos.page.getByTestId('todo-title')).toHaveCount(1);
    await expect(todos.todoItem('Walk the dog').getByTestId('todo-title')).toBeVisible();
    await expect(todos.todoItem('Walk the dog').getByRole('checkbox', { name: 'Toggle Todo' })).not.toBeChecked();
    await todos.expectItemsLeft(1);
  });

  test('TC-007 — Mark all as complete completes every active todo', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Buy milk');
    await todos.addTodo('Walk the dog');

    await todos.markAllComplete().click({ force: true });

    for (const title of ['Buy milk', 'Walk the dog']) {
      const item = todos.todoItem(title);
      await expect(item).toHaveClass(/completed/);
      await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).toBeChecked();
    }
    await todos.expectItemsLeft(0);
  });
});

test.describe('TodoMVC — Negative flows', () => {
  test('TC-008 — Empty submission does not create a todo row', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();

    await todos.newTodoInput.click();
    await todos.newTodoInput.press('Enter');

    await expect(todos.todoItems).toHaveCount(0);
    await expect(todos.footer).toBeHidden();
    await expect(todos.newTodoInput).toBeEnabled();
  });

  test('TC-009 — Whitespace-only input does not add a visible todo', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();

    await todos.addTodo('   ');

    await expect(todos.todoItems).toHaveCount(0);
    await expect(todos.footer).toBeHidden();
  });

  test('TC-010 — Completing a todo does not remove it from the All view', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Buy milk');

    await todos.toggleTodo('Buy milk');

    await expect(todos.todoItems).toHaveCount(1);
    await expect(todos.todoItem('Buy milk').getByTestId('todo-title')).toBeVisible();
    await expect(todos.todoItem('Buy milk').getByRole('button', { name: 'Delete' })).toBeAttached();
  });

  test('TC-011 — Deleting a todo does not mark other todos completed', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Buy milk');
    await todos.addTodo('Walk the dog');

    await todos.deleteTodo('Buy milk');

    const remaining = todos.todoItem('Walk the dog');
    await expect(remaining).not.toHaveClass(/completed/);
    await expect(remaining.getByRole('checkbox', { name: 'Toggle Todo' })).not.toBeChecked();
    await expect(todos.markAllComplete()).not.toBeChecked();
  });

  test('TC-012 — Pressing Enter on empty input after deleting all todos does not restore deleted items', async ({
    page,
  }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Temp task');
    await todos.deleteTodo('Temp task');

    await todos.newTodoInput.press('Enter');

    await expect(todos.page.getByTestId('todo-title')).toHaveCount(0);
    const stored = await page.evaluate(() => localStorage.getItem('react-todos'));
    expect(stored === null || stored === '[]').toBeTruthy();
  });

  test('TC-013 — Toggle on non-existent row cannot be triggered (sanity)', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();

    await expect(todos.page.getByRole('checkbox', { name: 'Toggle Todo' })).toHaveCount(0);
    await expect(todos.todoItems).toHaveCount(0);
  });
});

test.describe('TodoMVC — Edge cases', () => {
  test('TC-014 — Leading and trailing spaces are trimmed on add', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();

    await todos.addTodo('  Buy milk  ');

    await expect(todos.todoItems).toHaveCount(1);
    await expect(todos.todoItem('Buy milk').getByTestId('todo-title')).toHaveText('Buy milk');
  });

  test('TC-015 — Special characters and symbols are stored and displayed literally', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    const title = 'Pay €50 & "utilities" <test>';

    page.on('dialog', (dialog) => {
      throw new Error(`Unexpected dialog: ${dialog.message()}`);
    });

    await todos.addTodo(title);

    const item = todos.todoItem(title);
    await expect(item.getByTestId('todo-title')).toHaveText(title);
    await todos.toggleTodo(title);
    await expect(item).toHaveClass(/completed/);
    await todos.deleteTodo(title);
    await expect(todos.todoItems).toHaveCount(0);
  });

  test('TC-016 — Unicode and emoji characters are accepted in todo titles', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    const title = 'Buy milk 🥛 and 日本語';

    await todos.addTodo(title);

    const item = todos.todoItem(title);
    await expect(item.getByTestId('todo-title')).toHaveText(title);
    await todos.toggleTodo(title);
    await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).toBeChecked();
    await todos.deleteTodo(title);
    await expect(todos.todoItems).toHaveCount(0);
  });

  test('TC-017 — Duplicate titles are allowed as separate list items', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();

    await todos.addTodo('Buy milk');
    await todos.addTodo('Buy milk');

    await expect(todos.todoItems).toHaveCount(2);
    await todos.expectItemsLeft(2);

    const ids = await page.evaluate(() => {
      const raw = localStorage.getItem('react-todos');
      if (!raw) return [];
      return (JSON.parse(raw) as { id: string }[]).map((t) => t.id);
    });
    expect(new Set(ids).size).toBe(2);

    await todos.toggleTodo('Buy milk', 0);
    await expect(todos.todoItem('Buy milk', 0)).toHaveClass(/completed/);
    await expect(todos.todoItem('Buy milk', 1)).not.toHaveClass(/completed/);

    await todos.deleteTodo('Buy milk', 0);
    await expect(todos.todoItems).toHaveCount(1);
    await expect(todos.todoItem('Buy milk', 0)).not.toHaveClass(/completed/);
  });

  test('TC-018 — Very long todo title is accepted and fully visible in the label', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    const longTitle = 'A'.repeat(500);

    await todos.addTodo(longTitle);

    await expect(todos.todoItems).toHaveCount(1);
    await expect(todos.todoItem(longTitle).getByTestId('todo-title')).toHaveText(longTitle);
    await todos.deleteTodo(longTitle);
    await expect(todos.todoItems).toHaveCount(0);
  });

  test('TC-019 — Single-character todo is valid', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();

    await todos.addTodo('?');

    await expect(todos.todoItem('?').getByTestId('todo-title')).toHaveText('?');
    await todos.toggleTodo('?');
    await todos.deleteTodo('?');
    await expect(todos.todoItems).toHaveCount(0);
  });

  test('TC-020 — Completed filter hides active items but retains completed after delete of another', async ({
    page,
  }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Buy milk');
    await todos.addTodo('Walk the dog');
    await todos.toggleTodo('Walk the dog');

    await todos.footer.getByRole('link', { name: 'Completed' }).click();

    await expect(todos.todoItem('Walk the dog')).toBeVisible();
    await expect(todos.todoItem('Buy milk')).toHaveCount(0);

    await todos.deleteTodo('Walk the dog');

    await expect(todos.todoItems).toHaveCount(0);

    await todos.footer.getByRole('link', { name: 'All' }).click();

    await expect(todos.todoItems).toHaveCount(1);
    await expect(todos.todoItem('Buy milk')).toBeVisible();
    await expect(todos.todoItem('Buy milk')).not.toHaveClass(/completed/);
  });

  test('TC-021 — Active filter excludes completed items after toggle', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Buy milk');
    await todos.addTodo('Walk the dog');

    await todos.toggleTodo('Buy milk');
    await todos.footer.getByRole('link', { name: 'Active' }).click();

    await expect(todos.todoItem('Walk the dog')).toBeVisible();
    await expect(todos.page.getByTestId('todo-title')).toHaveCount(1);
    await expect(todos.todoItem('Buy milk')).toHaveCount(0);

    await todos.footer.getByRole('link', { name: 'Completed' }).click();
    await expect(todos.todoItem('Buy milk')).toBeVisible();
  });

  test('TC-022 — Page refresh persists todos via localStorage', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();
    await todos.addTodo('Persist me');

    await page.reload();

    await expect(todos.todoItem('Persist me').getByTestId('todo-title')).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('react-todos'));
    expect(stored).toContain('Persist me');
  });

  test('TC-023 — Rapid consecutive adds create distinct rows', async ({ page }) => {
    const todos = new TodoMVCPage(page);
    await todos.gotoClean();

    await todos.addTodo('Task 1');
    await todos.addTodo('Task 2');
    await todos.addTodo('Task 3');

    await expect(todos.page.getByTestId('todo-title')).toHaveText(['Task 1', 'Task 2', 'Task 3']);
    await todos.expectItemsLeft(3);
  });
});
