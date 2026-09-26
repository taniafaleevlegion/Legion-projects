# Test Plan: Playwright TodoMVC Demo

**Application under test:** [React • TodoMVC](https://demo.playwright.dev/todomvc/#/)  
**Environment:** Public demo (no login)  
**Primary UI references:** `new-todo` input (placeholder **What needs to be done?**), `[data-testid="todo-item"]`, `[data-testid="todo-title"]`, **Toggle Todo** checkbox, **Delete** button, **Mark all as complete** checkbox, footer filters **All** / **Active** / **Completed**, counter **N item(s) left**

**Acceptance criteria (in scope):**

1. User can add a todo item to the list  
2. User can complete an item  
3. User can delete an item from the list  

---

## Positive Flows

### TC-001 — Single todo appears in the list after valid entry

**Preconditions**

- Browser opens `https://demo.playwright.dev/todomvc/#/` with a clean session (clear `localStorage` key `react-todos` or use a fresh profile so the list is empty).
- Page title is **React • TodoMVC**.
- The **What needs to be done?** field is visible and empty.

**Steps**

1. Click the **What needs to be done?** text box.  
2. Type `Buy milk`.  
3. Press **Enter**.

**Expected result**

- Exactly one row appears in the todo list with label text **Buy milk** (`[data-testid="todo-title"]`).  
- The **What needs to be done?** field is cleared and ready for another entry.  
- Footer shows **1 item left** and links **All**, **Active**, **Completed** are visible.  
- **Mark all as complete** checkbox is visible above the list.

**Maps to AC:** Add a todo item  

---

### TC-002 — Multiple distinct todos are all listed in add order

**Preconditions**

- Clean session on `https://demo.playwright.dev/todomvc/#/`.

**Steps**

1. Add `Buy milk` via **What needs to be done?** + **Enter**.  
2. Add `Walk the dog` + **Enter**.  
3. Add `Pay electric bill` + **Enter**.

**Expected result**

- Three todo items appear with titles **Buy milk**, **Walk the dog**, **Pay electric bill** in that order.  
- Footer counter reads **3 items left**.  
- Each item has a **Toggle Todo** checkbox (unchecked) and a **Delete** button in its row.

**Maps to AC:** Add a todo item  

---

### TC-003 — Todo item is marked completed when toggled

**Preconditions**

- Session on demo URL with one active todo **Schedule dentist** (add if missing).

**Steps**

1. Locate the list item whose title is **Schedule dentist**.  
2. Click the **Toggle Todo** checkbox for that row.

**Expected result**

- The list item (`[data-testid="todo-item"]`) has CSS class `completed`.  
- The **Toggle Todo** checkbox is checked.  
- Footer counter decreases (e.g. **0 items left** if it was the only active item).  
- Title text **Schedule dentist** remains visible on the **All** filter.

**Maps to AC:** Complete an item  

---

### TC-004 — Completed todo can be returned to active by toggling again

**Preconditions**

- Todo **Schedule dentist** exists and is completed (per TC-003).

**Steps**

1. Click the **Toggle Todo** checkbox for **Schedule dentist** again.

**Expected result**

- The `completed` class is removed from that `[data-testid="todo-item"]`.  
- Checkbox is unchecked.  
- Footer shows **1 item left** (when it is the only todo).

**Maps to AC:** Complete an item (toggle off is valid completion workflow)  

---

### TC-005 — Todo is removed from the list when Delete is used

**Preconditions**

- List contains **Walk the dog** as the only todo (add via **What needs to be done?** if needed).

**Steps**

1. Hover or focus the row for **Walk the dog** so the **Delete** control is usable (class `destroy`, aria-label **Delete**).  
2. Click **Delete**.

**Expected result**

- **Walk the dog** no longer appears in the list.  
- Footer **main** section (counter and filters) is hidden when zero todos remain.  
- **What needs to be done?** remains available for new entries.

**Maps to AC:** Delete an item  

---

### TC-006 — Delete removes only the targeted todo when multiple exist

**Preconditions**

- List contains **Buy milk** and **Walk the dog** (both active).

**Steps**

1. Click **Delete** on the row for **Buy milk** only.

**Expected result**

- **Buy milk** is removed.  
- **Walk the dog** remains with unchanged title and unchecked **Toggle Todo**.  
- Footer reads **1 item left**.

**Maps to AC:** Delete an item  

---

### TC-007 — Mark all as complete completes every active todo

**Preconditions**

- List contains active todos **Buy milk** and **Walk the dog**.

**Steps**

1. Click the **Mark all as complete** checkbox at the top of the main section.

**Expected result**

- Both items have class `completed` and checked **Toggle Todo** checkboxes.  
- Footer counter reads **0 items left**.

**Maps to AC:** Complete an item  

---

## Negative Flows

### TC-008 — Empty submission does not create a todo row

**Preconditions**

- Clean session; todo list is empty.

**Steps**

1. Click **What needs to be done?**.  
2. Press **Enter** without typing any characters.

**Expected result**

- No `[data-testid="todo-item"]` elements appear.  
- Footer counter and filters are not shown.  
- No error dialog or broken layout; input remains usable.

**Maps to AC:** Add (invalid attempt must not satisfy AC falsely)  

---

### TC-009 — Whitespace-only input does not add a visible todo

**Preconditions**

- Clean session; list empty.

**Steps**

1. In **What needs to be done?**, type three spaces (`   `).  
2. Press **Enter**.

**Expected result**

- No new todo row is added (TodoMVC trims/rejects whitespace-only titles).  
- List remains empty; footer hidden.

**Maps to AC:** Add  

---

### TC-010 — Completing a todo does not remove it from the All view

**Preconditions**

- Single todo **Buy milk** in the list.

**Steps**

1. Toggle **Toggle Todo** for **Buy milk** to completed.

**Expected result**

- **Buy milk** is still present in the list on **All** (not deleted).  
- Item is not duplicated.  
- **Delete** button still exists on that row.

**Maps to AC:** Complete (must not imply delete)  

---

### TC-011 — Deleting a todo does not mark other todos completed

**Preconditions**

- **Buy milk** (active) and **Walk the dog** (active) in the list.

**Steps**

1. Delete **Buy milk**.

**Expected result**

- **Walk the dog** stays active (no `completed` class, checkbox unchecked).  
- **Mark all as complete** does not become checked solely due to delete.

**Maps to AC:** Delete (no side effects on siblings)  

---

### TC-012 — Pressing Enter on empty input after deleting all todos does not restore deleted items

**Preconditions**

- Had **Temp task**; delete it so list is empty.

**Steps**

1. With empty list, press **Enter** in **What needs to be done?** without text.

**Expected result**

- **Temp task** does not reappear.  
- `localStorage` key `react-todos` is `[]` or absent after delete (no phantom restore from empty Enter).

**Maps to AC:** Delete  

---

### TC-013 — Toggle on non-existent row cannot be triggered (sanity)

**Preconditions**

- Empty list.

**Steps**

1. Confirm no **Toggle Todo** checkboxes are rendered.

**Expected result**

- User cannot complete an item that was never added; no `[data-testid="todo-item"]` in DOM.

**Maps to AC:** Complete  

---

## Edge Cases

### TC-014 — Leading and trailing spaces are trimmed on add

**Preconditions**

- Clean session.

**Steps**

1. In **What needs to be done?**, type `  Buy milk  `.  
2. Press **Enter**.

**Expected result**

- One todo displays as **Buy milk** (no leading/trailing spaces in `[data-testid="todo-title"]`).

**Maps to AC:** Add  

---

### TC-015 — Special characters and symbols are stored and displayed literally

**Preconditions**

- Clean session.

**Steps**

1. Add `Pay €50 & "utilities" <test>` + **Enter**.

**Expected result**

- List shows exactly `Pay €50 & "utilities" <test>` as plain text (HTML not executed; no script alert).  
- Item can be toggled complete and deleted like any other todo.

**Maps to AC:** Add, Complete, Delete  

---

### TC-016 — Unicode and emoji characters are accepted in todo titles

**Preconditions**

- Clean session.

**Steps**

1. Add `Buy milk 🥛 and 日本語` + **Enter**.

**Expected result**

- Title renders **Buy milk 🥛 and 日本語** correctly.  
- **Toggle Todo** and **Delete** work on this row.

**Maps to AC:** Add  

---

### TC-017 — Duplicate titles are allowed as separate list items

**Preconditions**

- Clean session.

**Steps**

1. Add `Buy milk` + **Enter**.  
2. Add `Buy milk` + **Enter** again.

**Expected result**

- Two separate `[data-testid="todo-item"]` rows both titled **Buy milk** (distinct internal ids in `react-todos` JSON).  
- Footer reads **2 items left**.  
- Completing or deleting one row does not automatically complete/delete the other.

**Maps to AC:** Add (duplicate policy edge)  

---

### TC-018 — Very long todo title is accepted and fully visible in the label

**Preconditions**

- Clean session.

**Steps**

1. Paste a string of 500 characters: repeat `A` 500 times as the todo title.  
2. Press **Enter**.

**Expected result**

- One todo is added; label contains the full 500-character string (or documents truncation if UI truncates—expected: full text in label or edit field on double-click).  
- No application crash; **Delete** still removes the row.

**Maps to AC:** Add, Delete  

---

### TC-019 — Single-character todo is valid

**Preconditions**

- Clean session.

**Steps**

1. Add `?` + **Enter**.

**Expected result**

- One item titled **?** appears; can be completed and deleted.

**Maps to AC:** Add  

---

### TC-020 — Completed filter hides active items but retains completed after delete of another

**Preconditions**

- **Buy milk** (active), **Walk the dog** (completed).

**Steps**

1. Click footer link **Completed**.  
2. Delete **Walk the dog** from the Completed view.

**Expected result**

- **Walk the dog** removed; **Completed** view shows empty state or no matching items.  
3. Click **All**.  
**Expected result (continued)**  
- Only **Buy milk** remains, still active.

**Maps to AC:** Delete, Complete (filter interaction edge)  

---

### TC-021 — Active filter excludes completed items after toggle

**Preconditions**

- **Buy milk** and **Walk the dog** both active.

**Steps**

1. Complete **Buy milk** via **Toggle Todo**.  
2. Click footer **Active**.

**Expected result**

- Only **Walk the dog** is visible.  
- **Buy milk** is not shown until **All** or **Completed** is selected.

**Maps to AC:** Complete  

---

### TC-022 — Page refresh persists todos via localStorage

**Preconditions**

- Add **Persist me**; leave it active.

**Steps**

1. Reload `https://demo.playwright.dev/todomvc/#/`.

**Expected result**

- **Persist me** still appears (stored under `localStorage` key `react-todos`).  
- Completed state is preserved if the item was completed before reload.

**Maps to AC:** Add (persistence edge—not stated in AC)  

---

### TC-023 — Rapid consecutive adds create distinct rows

**Preconditions**

- Clean session.

**Steps**

1. Quickly add `Task 1`, `Task 2`, `Task 3` via **Enter** after each, without pausing.

**Expected result**

- Three rows in order **Task 1**, **Task 2**, **Task 3**; counter **3 items left**; no merged or lost entries.

**Maps to AC:** Add  

---

## AC Coverage Matrix

| AC | Test case IDs |
|----|----------------|
| User can add a todo item to the list | TC-001, TC-002, TC-014–TC-019, TC-023 |
| User can complete an item | TC-003, TC-004, TC-007, TC-010, TC-021 |
| User can delete an item from the list | TC-005, TC-006, TC-011, TC-012, TC-020 |

Negative and edge cases explicitly extend beyond AC wording (TC-008–TC-013, TC-015–TC-022).

---

## Ambiguities and Gaps in the Acceptance Criteria

1. **Empty and whitespace input:** ACs require “add” but do not state whether blank or whitespace-only **Enter** should create an item. Observed behavior: no row is added (TC-008, TC-009).  
2. **Duplicate titles:** No rule on whether two todos with the same text are allowed. Demo allows duplicates (TC-017); product might require deduplication elsewhere.  
3. **“Complete” scope:** AC does not mention **Mark all as complete**, uncomplete (toggle off), or filter views (**Active** / **Completed**). These are core to the demo but out of explicit AC text.  
4. **Delete UX:** AC does not specify how delete is exposed (hover-only **Delete** button vs keyboard). Automation may need hover/focus before click.  
5. **Persistence:** ACs are silent on reload behavior; demo persists to `localStorage` (`react-todos`) (TC-022).  
6. **Max length / validation:** No maximum title length or error message requirement in ACs; demo accepts very long strings (TC-018).  
7. **Edit workflow:** Demo supports double-click edit (**Edit** input) and footer **Clear completed**; none are in AC scope—test depth for edit/clear should be agreed separately.  
8. **Accessibility / keyboard-only:** ACs do not define keyboard paths for add, complete, or delete beyond implicit Enter on add.  
9. **Counter grammar:** Footer uses **1 item left** vs **N items left**; ACs do not require counter accuracy when completing or deleting.  
10. **Target environment:** ACs do not mention URL, browser support, or data isolation between testers sharing the same browser profile (localStorage collision).
