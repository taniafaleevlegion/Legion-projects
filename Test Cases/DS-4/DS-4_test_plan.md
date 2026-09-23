# Test Plan: Delete Program with Confirmation

**Feature:** Delete academic program with confirmation dialog  
**Scope:** Programs page (admin), delete icon per program row, confirmation modal/dialog  
**Reference ACs:** Confirm deletion removes program from list; Cancel preserves program  

---

## Positive Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-001 | Delete action opens confirmation dialog for the selected program | High |
| TC-002 | Confirmed deletion removes program from Programs list | High |
| TC-003 | Cancel on confirmation dialog leaves program in the list | High |
| TC-004 | Deleted program does not reappear after Programs page reload | Medium |
| TC-005 | Confirmation dialog references the program being deleted | Medium |
| TC-006 | Other programs remain in the list when one program is deleted | Medium |

### TC-001 — Delete action opens confirmation dialog for the selected program

**Preconditions**
- User is logged in with admin role.
- Programs page is reachable.
- A program named **Test Program** exists in the list.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
And the program "Test Program" is listed
When I click the delete icon for "Test Program"
Then I see a confirmation dialog
And the dialog offers a way to confirm deletion
And the dialog offers a way to cancel deletion
```

**Priority:** High  

**Maps to AC:** Delete program with confirmation (dialog appears)  

---

### TC-002 — Confirmed deletion removes program from Programs list

**Preconditions**
- User is logged in as admin.
- Program **Test Program** exists on the Programs page.
- Confirmation dialog is open after clicking delete for **Test Program**.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
And I have opened the delete confirmation for "Test Program"
When I confirm deletion in the dialog
Then the confirmation dialog closes
And the Programs list no longer includes "Test Program"
And the remaining list reflects one fewer program than before deletion
```

**Priority:** High  

**Maps to AC:** Delete program with confirmation (program removed)  

---

### TC-003 — Cancel on confirmation dialog leaves program in the list

**Preconditions**
- User is logged in as admin.
- At least one program exists (e.g., **Web Development 2026**).
- Delete confirmation dialog is visible for that program.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
And I clicked the delete icon for "Web Development 2026"
And I see the confirmation dialog
When I click Cancel in the dialog
Then the confirmation dialog closes
And the Programs list still includes "Web Development 2026"
And no success message indicates deletion occurred
```

**Priority:** High  

**Maps to AC:** Cancel program deletion  

---

### TC-004 — Deleted program does not reappear after Programs page reload

**Preconditions**
- User is logged in as admin.
- TC-002 has been executed successfully for **Test Program**, or **Test Program** was deleted via the same confirm flow.

**Scenario / Steps**
```gherkin
Given the Programs list no longer shows "Test Program"
When I reload the Programs page
Then "Test Program" is still absent from the list
And the deletion is persisted in the backend
```

**Priority:** Medium  

---

### TC-005 — Confirmation dialog references the program being deleted

**Preconditions**
- User is logged in as admin.
- Program **Cybersecurity 2026** exists in the list.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
When I click the delete icon for "Cybersecurity 2026"
Then the confirmation dialog is visible
And the dialog text or title identifies "Cybersecurity 2026" or clearly states which program will be deleted
And confirming affects only that program row
```

**Priority:** Medium  

---

### TC-006 — Other programs remain in the list when one program is deleted

**Preconditions**
- User is logged in as admin.
- Programs **Test Program**, **Data Science 2026**, and **Cloud Engineering 2026** all exist.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
And all three programs are visible in the list
When I delete "Test Program" and confirm in the dialog
Then "Test Program" is removed from the list
And "Data Science 2026" remains in the list
And "Cloud Engineering 2026" remains in the list
```

**Priority:** Medium  

---

## Negative Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-101 | Program is not removed when delete icon is clicked but deletion is not confirmed | High |
| TC-102 | Failed delete request does not remove program from the list | High |
| TC-103 | Non-admin user cannot delete a program | High |
| TC-104 | Unauthenticated user cannot delete a program | High |
| TC-105 | Dismissing dialog without Confirm does not delete the program | High |
| TC-106 | Cancel must not remove the program or show deletion success | High |
| TC-107 | Confirming deletion must not remove a different program | High |
| TC-108 | Delete must not occur when confirmation dialog never appeared | Medium |

### TC-101 — Program is not removed when delete icon is clicked but deletion is not confirmed

**Preconditions**
- User is logged in as admin.
- Program **Test Program** exists.
- Confirmation dialog is open for **Test Program**.

**Scenario / Steps**
```gherkin
Given I clicked the delete icon for "Test Program"
And the confirmation dialog is displayed
When I take no confirm action and leave the dialog open
Then "Test Program" remains in the Programs list behind or beside the dialog
And the program count has not decreased
```

**Priority:** High  

---

### TC-102 — Failed delete request does not remove program from the list

**Preconditions**
- User is logged in as admin.
- Program **Web Development 2026** exists.
- Test environment can simulate API/network failure on delete (mock, proxy, or fault injection).

**Scenario / Steps**
```gherkin
Given I am on the Programs page
And the delete API for "Web Development 2026" will return an error or timeout
When I click the delete icon for "Web Development 2026"
And I confirm deletion in the dialog
Then the Programs list still includes "Web Development 2026"
And I see an error indication (toast, inline message, or dialog error)
And reopening the Programs page after reload still shows "Web Development 2026"
```

**Priority:** High  

---

### TC-103 — Non-admin user cannot delete a program

**Preconditions**
- User is logged in with a non-admin role (e.g., instructor or read-only viewer).
- Program **Test Program** exists on the Programs page.

**Scenario / Steps**
```gherkin
Given I am logged in as a non-admin user
And I am on the Programs page
When I view the row for "Test Program"
Then I do not see a delete icon or the delete action is disabled
And I cannot complete a flow that removes "Test Program" from the list
```

**Priority:** High  

---

### TC-104 — Unauthenticated user cannot delete a program

**Preconditions**
- User session is expired or the user is logged out.
- A program **Test Program** exists in the system.

**Scenario / Steps**
```gherkin
Given I am not authenticated
When I attempt to open the Programs page or invoke a direct delete endpoint for "Test Program"
Then I am redirected to login or receive forbidden access
And "Test Program" remains in the system for an authenticated admin
```

**Priority:** High  

---

### TC-105 — Dismissing dialog without Confirm does not delete the program

**Preconditions**
- User is logged in as admin.
- Program **Data Analytics 2026** exists.
- Product supports dismiss via close control, Escape key, or click-outside (document which apply).

**Scenario / Steps**
```gherkin
Given I opened the delete confirmation for "Data Analytics 2026"
When I dismiss the dialog without choosing Confirm (Cancel, Close, Escape, or click-outside per spec)
Then the dialog closes
And "Data Analytics 2026" remains in the Programs list
And no deletion success feedback is shown
```

**Priority:** High  

---

### TC-106 — Cancel must not remove the program or show deletion success

**Preconditions**
- User is logged in as admin.
- Program **Test Program** exists.
- Note program count before the test.

**Scenario / Steps**
```gherkin
Given I am on the Programs page with "Test Program" present
When I open delete confirmation for "Test Program"
And I click Cancel
Then "Test Program" is still listed
And the program count is unchanged
And no toast or banner states that "Test Program" was deleted
```

**Priority:** High  

**Maps to AC:** Cancel program deletion (negative assertions)  

---

### TC-107 — Confirming deletion must not remove a different program

**Preconditions**
- User is logged in as admin.
- Programs **Program Alpha** and **Program Beta** both exist.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
When I click the delete icon on the row for "Program Alpha"
And the confirmation dialog references "Program Alpha"
And I confirm deletion
Then "Program Alpha" is removed from the list
And "Program Beta" remains in the list unchanged
```

**Priority:** High  

---

### TC-108 — Delete must not occur when confirmation dialog never appeared

**Preconditions**
- User is logged in as admin.
- Program **Test Program** exists.
- Ability to block or intercept UI so confirmation does not render (or use automated check that no confirm handler ran without dialog).

**Scenario / Steps**
```gherkin
Given I am on the Programs page
When I attempt to trigger delete without the confirmation dialog being shown (blocked UI or direct API call without admin token)
Then "Test Program" remains in the list for normal UI users
And the application does not silently delete programs without confirmation in the admin UI
```

**Priority:** Medium  

---

## Edge Cases

| ID | Title | Priority |
|----|--------|----------|
| TC-201 | Deleting the only program in the list shows appropriate empty state | Medium |
| TC-202 | Delete program whose name contains special characters and Unicode | Medium |
| TC-203 | Delete correct row when two programs have similar display names | Medium |
| TC-204 | Delete while list is filtered or searched | Medium |
| TC-205 | Rapid double-click delete icon opens one dialog | Medium |
| TC-206 | Rapid double-click Confirm deletes program once | High |
| TC-207 | Delete program with maximum-length Program Name | Low |
| TC-208 | Keyboard and screen reader flow for delete and confirmation | Medium |
| TC-209 | Two admins: one deletes while another has confirmation open | Low |
| TC-210 | Delete program that has Description or metadata not shown in list row | Low |
| TC-211 | Stale tab: deleted program removed after refresh in second tab | Medium |
| TC-212 | Undo is not offered unless product specifies it | Low |

### TC-201 — Deleting the only program in the list shows appropriate empty state

**Preconditions**
- User is logged in as admin.
- Exactly one program **Solo Program 2026** exists (or test data isolated to single program).

**Scenario / Steps**
```gherkin
Given the Programs list contains only "Solo Program 2026"
When I delete "Solo Program 2026" and confirm
Then "Solo Program 2026" is removed
And the Programs list shows an empty state message or zero programs
And the page remains usable (e.g., Create program action still available if supported)
```

**Priority:** Medium  

---

### TC-202 — Delete program whose name contains special characters and Unicode

**Preconditions**
- User is logged in as admin.
- Program **Informatique & IA — Niveau 2 ( été )** exists.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
And "Informatique & IA — Niveau 2 ( été )" is listed
When I click the delete icon for that program
And I confirm in the dialog
Then that program is removed from the list
And the confirmation dialog displayed the name correctly without broken encoding
```

**Priority:** Medium  

---

### TC-203 — Delete correct row when two programs have similar display names

**Preconditions**
- User is logged in as admin.
- Programs **Test Program** and **Test Program (Archive)** exist (distinct records).

**Scenario / Steps**
```gherkin
Given both programs appear in the list
When I click delete on the row for "Test Program" only
And I confirm deletion
Then "Test Program" is removed
And "Test Program (Archive)" remains in the list
```

**Priority:** Medium  

---

### TC-204 — Delete while list is filtered or searched

**Preconditions**
- User is logged in as admin.
- Multiple programs exist including **Test Program**.
- Programs page supports search or filter (if not supported, mark N/A and skip).

**Scenario / Steps**
```gherkin
Given I filter or search the list so "Test Program" is visible
When I delete "Test Program" and confirm
Then "Test Program" is removed
And clearing the filter shows the full list without "Test Program"
And other programs unaffected by the filter remain listed correctly
```

**Priority:** Medium  

---

### TC-205 — Rapid double-click delete icon opens one dialog

**Preconditions**
- User is logged in as admin.
- Program **Test Program** exists.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
When I double-click the delete icon for "Test Program" quickly
Then at most one confirmation dialog is visible
And I can Cancel or Confirm without duplicate stacked dialogs breaking the UI
```

**Priority:** Medium  

---

### TC-206 — Rapid double-click Confirm deletes program once

**Preconditions**
- User is logged in as admin.
- Program **Double Delete Test** exists.
- Delete confirmation is open.

**Scenario / Steps**
```gherkin
Given I opened delete confirmation for "Double Delete Test"
When I double-click Confirm quickly
Then "Double Delete Test" is removed from the list once
And no error occurs from duplicate delete requests
And the program does not reappear as a duplicate row or ghost entry
```

**Priority:** High  

---

### TC-207 — Delete program with maximum-length Program Name

**Preconditions**
- User is logged in as admin.
- A program exists whose Program Name is exactly N characters (max length N from product spec).

**Scenario / Steps**
```gherkin
Given the Programs list shows the max-length-named program (truncated in UI if applicable)
When I delete that program via delete icon and confirm
Then the program is removed successfully
And the confirmation dialog identifies the program per truncation rules
```

**Priority:** Low  

---

### TC-208 — Keyboard and screen reader flow for delete and confirmation

**Preconditions**
- User is logged in as admin.
- Program **Accessibility Test Program** exists.
- Keyboard-only or assistive technology testing setup available.

**Scenario / Steps**
```gherkin
Given I focus the delete control for "Accessibility Test Program" via keyboard
When I activate delete and move focus into the confirmation dialog
Then Confirm and Cancel are reachable by keyboard
And activating Cancel keeps the program in the list
And activating Confirm removes the program from the list
And focus is managed sensibly after the dialog closes (not lost to body without context)
```

**Priority:** Medium  

---

### TC-209 — Two admins: one deletes while another has confirmation open

**Preconditions**
- Two admin sessions (Admin A and Admin B).
- Program **Shared Delete Target** exists.

**Scenario / Steps**
```gherkin
Given Admin A opened delete confirmation for "Shared Delete Target"
And Admin B deletes "Shared Delete Target" and confirms first
When Admin A confirms deletion in the already-open dialog
Then the UI handles the already-deleted state gracefully (success, not found, or refresh message)
And the Programs list does not show "Shared Delete Target"
And the application does not crash or show inconsistent duplicate rows
```

**Priority:** Low  

---

### TC-210 — Delete program that has Description or metadata not shown in list row

**Preconditions**
- User is logged in as admin.
- Program **Test Program** exists with Description **Full-stack curriculum with capstone project** stored but not visible in the list row.

**Scenario / Steps**
```gherkin
Given I see only "Test Program" in the list row label
When I delete "Test Program" and confirm
Then "Test Program" is removed from the list
And associated description data is removed or orphaned per product rules (no orphan breaks edit/create flows)
```

**Priority:** Low  

---

### TC-211 — Stale tab: deleted program removed after refresh in second tab

**Preconditions**
- User is logged in as admin in two browser tabs on the Programs page.
- Program **Test Program** exists.

**Scenario / Steps**
```gherkin
Given Tab 1 and Tab 2 both show "Test Program"
When I delete "Test Program" in Tab 1 and confirm
Then Tab 1 no longer lists "Test Program"
When I refresh Tab 2
Then Tab 2 no longer lists "Test Program"
And attempting edit or delete on the stale row in Tab 2 before refresh fails safely or refreshes data
```

**Priority:** Medium  

---

### TC-212 — Undo is not offered unless product specifies it

**Preconditions**
- User is logged in as admin.
- Program **No Undo Program** exists.
- ACs do not mention undo or soft delete.

**Scenario / Steps**
```gherkin
Given I delete "No Undo Program" and confirm
When the dialog closes and the list updates
Then there is no Undo control that restores "No Undo Program" unless documented as a feature
And "No Undo Program" cannot be recreated automatically without using Create program
```

**Priority:** Low  

---

## Traceability Matrix (AC → Test Cases)

| Acceptance criterion | Test case IDs |
|----------------------|---------------|
| Delete icon shows confirmation dialog | TC-001, TC-005 |
| Confirm deletion removes program from list | TC-002, TC-004, TC-006, TC-206 |
| Cancel keeps program in list | TC-003, TC-106, TC-105 |

---

## Ambiguities, Assumptions, and Gaps

1. **Dialog copy and controls** — ACs require a confirmation dialog and Cancel but do not specify Confirm button label (Delete, OK, Yes), presence of a Close (X) control, Escape key, or click-outside dismiss. TC-105 assumes these should not delete; product must define allowed dismiss paths.

2. **Destructive styling** — No requirement for warning icon, red Confirm button, or irreversibility message; TC-005 only checks that the target program is identifiable.

3. **Success feedback** — ACs assert list removal only. Unclear whether a toast, banner, or audit log entry is expected after successful delete.

4. **Soft delete vs hard delete** — ACs state the program is removed from the list; unknown whether records are archived in the database or permanently purged (TC-212).

5. **Dependencies** — No AC for programs linked to courses, cohorts, enrollments, or reports. TC-210 flags possible cascade or block rules that are undefined.

6. **Empty list UX** — Not in ACs; TC-201 assumes a sensible empty state when the last program is deleted.

7. **Permissions model** — "Admin" role name and permission flag are assumed consistent with DS-1/DS-2 (TC-103, TC-104).

8. **List interactions** — Search, filter, sort, and pagination behavior after delete are unspecified (TC-204).

9. **Idempotency** — Confirming delete twice or deleting an already-deleted program is not in ACs (TC-206, TC-209).

10. **Accessibility** — No AC for keyboard-only delete, focus trap in dialog, or ARIA labels on delete icon (TC-208).

11. **API/error handling** — Happy path only in ACs; TC-102 depends on environment support for failed deletes.

12. **Persistence** — AC implies list update; explicit reload persistence is recommended smoke (TC-004) but not stated in ACs.

13. **Input file gap** — `DS-4_input.md` in the repo contains folder-setup instructions only, not the feature AC text; this plan uses the ACs supplied in the authoring prompt.

---

**Suggested execution order:** TC-001 → TC-002 → TC-003 → TC-106 → TC-101 → TC-103 → TC-102 → TC-004 → TC-206 → remaining edge cases by priority.
