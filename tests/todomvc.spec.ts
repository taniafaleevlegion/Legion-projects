import { test, expect, type Page } from '@playwright/test';

const TODO_MVC_URL = 'https://demo.playwright.dev/todomvc/#/';

async function gotoClean(page: Page): Promise<void> {
  await page.goto(TODO_MVC_URL);
  await page.evaluate(() => localStorage.removeItem('react-todos'));
  await page.reload();
  await expect(page).toHaveTitle(/TodoMVC/);
}

function newTodoInput(page: Page) {
  return page.getByPlaceholder('What needs to be done?');
}

function footer(page: Page) {
  return page.locator('footer.footer');
}

function todoItems(page: Page) {
  return page.getByTestId('todo-item');
}

function todoItem(page: Page, title: string, index = 0) {
  return todoItems(page)
    .filter({
      has: page.getByTestId('todo-title').getByText(title, { exact: true }),
    })
    .nth(index);
}

async function addTodo(page: Page, title: string): Promise<void> {
  await newTodoInput(page).fill(title);
  await newTodoInput(page).press('Enter');
}

async function toggleTodo(page: Page, title: string, index = 0): Promise<void> {
  const item = todoItem(page, title, index);
  await item.getByRole('checkbox', { name: 'Toggle Todo' }).click({ force: true });
}

async function deleteTodo(page: Page, title: string, index = 0): Promise<void> {
  const item = todoItem(page, title, index);
  await item.hover();
  await item.getByRole('button', { name: 'Delete' }).click();
}

async function expectItemsLeft(page: Page, count: number): Promise<void> {
  const label = count === 1 ? '1 item left' : `${count} items left`;
  await expect(footer(page).getByText(label, { exact: true })).toBeVisible();
}

function markAllComplete(page: Page) {
  return page.getByRole('checkbox', { name: 'Mark all as complete' });
}

test.describe('TodoMVC — Positive flows', () => {
  test('TC-001 — Single todo appears in the list after valid entry', async ({ page }) => {
    await gotoClean(page);

    await newTodoInput(page).click();
    await addTodo(page, 'Buy milk');

    await expect(todoItems(page)).toHaveCount(1);
    await expect(todoItem(page, 'Buy milk').getByTestId('todo-title')).toHaveText('Buy milk');
    await expect(newTodoInput(page)).toHaveValue('');
    await expectItemsLeft(page, 1);
    await expect(footer(page).getByRole('link', { name: 'All' })).toBeVisible();
    await expect(footer(page).getByRole('link', { name: 'Active' })).toBeVisible();
    await expect(footer(page).getByRole('link', { name: 'Completed' })).toBeVisible();
    await expect(markAllComplete(page)).toBeVisible();
  });

  test('TC-002 — Multiple distinct todos are all listed in add order', async ({ page }) => {
    await gotoClean(page);

    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');
    await addTodo(page, 'Pay electric bill');

    await expect(page.getByTestId('todo-title')).toHaveText([
      'Buy milk',
      'Walk the dog',
      'Pay electric bill',
    ]);
    await expectItemsLeft(page, 3);

    for (const title of ['Buy milk', 'Walk the dog', 'Pay electric bill']) {
      const item = todoItem(page, title);
      await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).not.toBeChecked();
      await expect(item.locator('button.destroy')).toHaveCount(1);
    }
  });

  test('TC-003 — Todo item is marked completed when toggled', async ({ page }) => {
    await gotoClean(page);
    await addTodo(page, 'Schedule dentist');

    await toggleTodo(page, 'Schedule dentist');

    const item = todoItem(page, 'Schedule dentist');
    await expect(item).toHaveClass(/completed/);
    await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).toBeChecked();
    await expectItemsLeft(page, 0);
    await expect(todoItem(page, 'Schedule dentist').getByTestId('todo-title')).toBeVisible();
  });

  test('TC-004 — Completed todo can be returned to active by toggling again', async ({ page }) => {
    await gotoClean(page);
    await addTodo(page, 'Schedule dentist');
    await toggleTodo(page, 'Schedule dentist');

    await toggleTodo(page, 'Schedule dentist');

    const item = todoItem(page, 'Schedule dentist');
    await expect(item).not.toHaveClass(/completed/);
    await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).not.toBeChecked();
    await expectItemsLeft(page, 1);
  });

  test('TC-005 — Todo is removed from the list when Delete is used', async ({ page }) => {
    await gotoClean(page);
    await addTodo(page, 'Walk the dog');

    await deleteTodo(page, 'Walk the dog');

    await expect(page.getByTestId('todo-title')).toHaveCount(0);
    await expect(footer(page)).toBeHidden();
    await expect(newTodoInput(page)).toBeVisible();
  });

  test('TC-006 — Delete removes only the targeted todo when multiple exist', async ({ page }) => {
    await gotoClean(page);
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');

    await deleteTodo(page, 'Buy milk');

    await expect(page.getByTestId('todo-title')).toHaveCount(1);
    await expect(todoItem(page, 'Walk the dog').getByTestId('todo-title')).toBeVisible();
    await expect(todoItem(page, 'Walk the dog').getByRole('checkbox', { name: 'Toggle Todo' })).not.toBeChecked();
    await expectItemsLeft(page, 1);
  });

  test('TC-007 — Mark all as complete completes every active todo', async ({ page }) => {
    await gotoClean(page);
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');

    await markAllComplete(page).click({ force: true });

    for (const title of ['Buy milk', 'Walk the dog']) {
      const item = todoItem(page, title);
      await expect(item).toHaveClass(/completed/);
      await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).toBeChecked();
    }
    await expectItemsLeft(page, 0);
  });
});

test.describe('TodoMVC — Negative flows', () => {
  test('TC-008 — Empty submission does not create a todo row', async ({ page }) => {
    await gotoClean(page);

    await newTodoInput(page).click();
    await newTodoInput(page).press('Enter');

    await expect(todoItems(page)).toHaveCount(0);
    await expect(footer(page)).toBeHidden();
    await expect(newTodoInput(page)).toBeEnabled();
  });

  test('TC-009 — Whitespace-only input does not add a visible todo', async ({ page }) => {
    await gotoClean(page);

    await addTodo(page, '   ');

    await expect(todoItems(page)).toHaveCount(0);
    await expect(footer(page)).toBeHidden();
  });

  test('TC-010 — Completing a todo does not remove it from the All view', async ({ page }) => {
    await gotoClean(page);
    await addTodo(page, 'Buy milk');

    await toggleTodo(page, 'Buy milk');

    await expect(todoItems(page)).toHaveCount(1);
    await expect(todoItem(page, 'Buy milk').getByTestId('todo-title')).toBeVisible();
    await expect(todoItem(page, 'Buy milk').getByRole('button', { name: 'Delete' })).toBeAttached();
  });

  test('TC-011 — Deleting a todo does not mark other todos completed', async ({ page }) => {
    await gotoClean(page);
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');

    await deleteTodo(page, 'Buy milk');

    const remaining = todoItem(page, 'Walk the dog');
    await expect(remaining).not.toHaveClass(/completed/);
    await expect(remaining.getByRole('checkbox', { name: 'Toggle Todo' })).not.toBeChecked();
    await expect(markAllComplete(page)).not.toBeChecked();
  });

  test('TC-012 — Pressing Enter on empty input after deleting all todos does not restore deleted items', async ({
    page,
  }) => {
    await gotoClean(page);
    await addTodo(page, 'Temp task');
    await deleteTodo(page, 'Temp task');

    await newTodoInput(page).press('Enter');

    await expect(page.getByTestId('todo-title')).toHaveCount(0);
    const stored = await page.evaluate(() => localStorage.getItem('react-todos'));
    expect(stored === null || stored === '[]').toBeTruthy();
  });

  test('TC-013 — Toggle on non-existent row cannot be triggered (sanity)', async ({ page }) => {
    await gotoClean(page);

    await expect(page.getByRole('checkbox', { name: 'Toggle Todo' })).toHaveCount(0);
    await expect(todoItems(page)).toHaveCount(0);
  });
});

test.describe('TodoMVC — Edge cases', () => {
  test('TC-014 — Leading and trailing spaces are trimmed on add', async ({ page }) => {
    await gotoClean(page);

    await addTodo(page, '  Buy milk  ');

    await expect(todoItems(page)).toHaveCount(1);
    await expect(todoItem(page, 'Buy milk').getByTestId('todo-title')).toHaveText('Buy milk');
  });

  test('TC-015 — Special characters and symbols are stored and displayed literally', async ({ page }) => {
    await gotoClean(page);
    const title = 'Pay €50 & "utilities" <test>';

    page.on('dialog', (dialog) => {
      throw new Error(`Unexpected dialog: ${dialog.message()}`);
    });

    await addTodo(page, title);

    const item = todoItem(page, title);
    await expect(item.getByTestId('todo-title')).toHaveText(title);
    await toggleTodo(page, title);
    await expect(item).toHaveClass(/completed/);
    await deleteTodo(page, title);
    await expect(todoItems(page)).toHaveCount(0);
  });

  test('TC-016 — Unicode and emoji characters are accepted in todo titles', async ({ page }) => {
    await gotoClean(page);
    const title = 'Buy milk 🥛 and 日本語';

    await addTodo(page, title);

    const item = todoItem(page, title);
    await expect(item.getByTestId('todo-title')).toHaveText(title);
    await toggleTodo(page, title);
    await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).toBeChecked();
    await deleteTodo(page, title);
    await expect(todoItems(page)).toHaveCount(0);
  });

  test('TC-017 — Duplicate titles are allowed as separate list items', async ({ page }) => {
    await gotoClean(page);

    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Buy milk');

    await expect(todoItems(page)).toHaveCount(2);
    await expectItemsLeft(page, 2);

    const ids = await page.evaluate(() => {
      const raw = localStorage.getItem('react-todos');
      if (!raw) return [];
      return (JSON.parse(raw) as { id: string }[]).map((t) => t.id);
    });
    expect(new Set(ids).size).toBe(2);

    await toggleTodo(page, 'Buy milk', 0);
    await expect(todoItem(page, 'Buy milk', 0)).toHaveClass(/completed/);
    await expect(todoItem(page, 'Buy milk', 1)).not.toHaveClass(/completed/);

    await deleteTodo(page, 'Buy milk', 0);
    await expect(todoItems(page)).toHaveCount(1);
    await expect(todoItem(page, 'Buy milk', 0)).not.toHaveClass(/completed/);
  });

  test('TC-018 — Very long todo title is accepted and fully visible in the label', async ({ page }) => {
    await gotoClean(page);
    const longTitle = 'A'.repeat(500);

    await addTodo(page, longTitle);

    await expect(todoItems(page)).toHaveCount(1);
    await expect(todoItem(page, longTitle).getByTestId('todo-title')).toHaveText(longTitle);
    await deleteTodo(page, longTitle);
    await expect(todoItems(page)).toHaveCount(0);
  });

  test('TC-019 — Single-character todo is valid', async ({ page }) => {
    await gotoClean(page);

    await addTodo(page, '?');

    await expect(todoItem(page, '?').getByTestId('todo-title')).toHaveText('?');
    await toggleTodo(page, '?');
    await deleteTodo(page, '?');
    await expect(todoItems(page)).toHaveCount(0);
  });

  test('TC-020 — Completed filter hides active items but retains completed after delete of another', async ({
    page,
  }) => {
    await gotoClean(page);
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');
    await toggleTodo(page, 'Walk the dog');

    await footer(page).getByRole('link', { name: 'Completed' }).click();

    await expect(todoItem(page, 'Walk the dog')).toBeVisible();
    await expect(todoItem(page, 'Buy milk')).toHaveCount(0);

    await deleteTodo(page, 'Walk the dog');

    await expect(todoItems(page)).toHaveCount(0);

    await footer(page).getByRole('link', { name: 'All' }).click();

    await expect(todoItems(page)).toHaveCount(1);
    await expect(todoItem(page, 'Buy milk')).toBeVisible();
    await expect(todoItem(page, 'Buy milk')).not.toHaveClass(/completed/);
  });

  test('TC-021 — Active filter excludes completed items after toggle', async ({ page }) => {
    await gotoClean(page);
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');

    await toggleTodo(page, 'Buy milk');
    await footer(page).getByRole('link', { name: 'Active' }).click();

    await expect(todoItem(page, 'Walk the dog')).toBeVisible();
    await expect(page.getByTestId('todo-title')).toHaveCount(1);
    await expect(todoItem(page, 'Buy milk')).toHaveCount(0);

    await footer(page).getByRole('link', { name: 'Completed' }).click();
    await expect(todoItem(page, 'Buy milk')).toBeVisible();
  });

  test('TC-022 — Page refresh persists todos via localStorage', async ({ page }) => {
    await gotoClean(page);
    await addTodo(page, 'Persist me');

    await page.reload();

    await expect(todoItem(page, 'Persist me').getByTestId('todo-title')).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('react-todos'));
    expect(stored).toContain('Persist me');
  });

  test('TC-023 — Rapid consecutive adds create distinct rows', async ({ page }) => {
    await gotoClean(page);

    await addTodo(page, 'Task 1');
    await addTodo(page, 'Task 2');
    await addTodo(page, 'Task 3');

    await expect(page.getByTestId('todo-title')).toHaveText(['Task 1', 'Task 2', 'Task 3']);
    await expectItemsLeft(page, 3);
  });
});
