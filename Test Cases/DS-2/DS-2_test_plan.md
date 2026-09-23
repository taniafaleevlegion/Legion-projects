# Test Plan: Edit Existing Program Details

**Feature:** Edit existing academic program  
**Scope:** Program edit modal/form from Programs page (admin)  
**Reference ACs:** Open edit with pre-populated data, successful name update, partial edit preserves other fields  

> **Note:** The authoring prompt title references "Create new academic program," but the acceptance criteria below describe **edit** behavior. This plan follows the ACs.

---

## Positive Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-001 | Edit form opens with current program data pre-filled | High |
| TC-002 | Program Name update persists and list refreshes immediately | High |
| TC-003 | Description-only edit leaves Program Name and other fields unchanged | High |
| TC-004 | Admin saves Description update; modal closes and list reflects change | Medium |
| TC-005 | Cancel edit discards changes and restores list state | Medium |
| TC-006 | Updated program remains visible after Programs page reload | Medium |

### TC-001 — Edit form opens with current program data pre-filled

**Preconditions**
- User is logged in with admin role.
- Programs page is reachable.
- A program exists with Program Name "Web Development 2026" and Description "Full-stack web development program" (or equivalent stored values).

**Scenario / Steps**
```gherkin
Given I am on the Programs page
And a program "Web Development 2026" exists in the list
When I click the edit icon on "Web Development 2026"
Then I see the program edit form
And the Program Name field contains "Web Development 2026"
And the Description field contains "Full-stack web development program"
And I see a "Save" action for submitting the form
```

**Priority:** High  

**Maps to AC:** Open program for editing  

---

### TC-002 — Program Name update persists and list refreshes immediately

**Preconditions**
- User is logged in as admin.
- Program "Web Development 2026" exists.
- Edit form is open for "Web Development 2026" (via edit icon).

**Scenario / Steps**
```gherkin
Given I am editing "Web Development 2026"
When I change Program Name to "Web Development 2026 - Updated"
And I click Save
Then the edit modal closes
And the Programs list immediately shows "Web Development 2026 - Updated"
And the Programs list does not show "Web Development 2026" as the primary name for that program row
```

**Priority:** High  

**Maps to AC:** Successfully edit a program name  

---

### TC-003 — Description-only edit leaves Program Name and other fields unchanged

**Preconditions**
- User is logged in as admin.
- A program exists with Program Name "Cybersecurity 2026" and Description "Introductory security track".
- Edit form is open for that program.

**Scenario / Steps**
```gherkin
Given I am editing a program with Program Name "Cybersecurity 2026" and Description "Introductory security track"
When I change only Description to "Introductory security track — includes labs and capstone"
And I leave Program Name as "Cybersecurity 2026"
And I click Save
Then the modal closes
And the Programs list still shows Program Name "Cybersecurity 2026"
And reopening edit for that program shows Program Name "Cybersecurity 2026"
And Description is "Introductory security track — includes labs and capstone"
```

**Priority:** High  

**Maps to AC:** Edit preserves unchanged fields  

---

### TC-004 — Admin saves Description update; modal closes and list reflects change

**Preconditions**
- User is logged in as admin.
- Program "Web Development 2026" exists (description may or may not appear in list UI).

**Scenario / Steps**
```gherkin
Given I am on the Programs page
When I open edit for "Web Development 2026"
And I change Description to "Full-stack web development program (2026 cohort)"
And I click Save
Then the edit modal closes
And the program row for "Web Development 2026" remains in the list
And viewing the program details or reopening edit shows the updated Description
```

**Priority:** Medium  

---

### TC-005 — Cancel edit discards changes and restores list state

**Preconditions**
- User is logged in as admin.
- Program "Web Development 2026" exists.
- Edit form is open.

**Scenario / Steps**
```gherkin
Given I am editing "Web Development 2026"
When I change Program Name to "Should Not Persist"
And I click Cancel or close the modal without saving
Then the edit modal closes
And the Programs list still shows "Web Development 2026"
And no program named "Should Not Persist" appears in the list
```

**Priority:** Medium  

---

### TC-006 — Updated program remains visible after Programs page reload

**Preconditions**
- User is logged in as admin.
- TC-002 or equivalent rename has been performed successfully.

**Scenario / Steps**
```gherkin
Given the Programs list shows "Web Development 2026 - Updated"
When I reload the Programs page
Then "Web Development 2026 - Updated" is still listed
And "Web Development 2026" is not listed under that program's identity
```

**Priority:** Medium  

---

## Negative Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-101 | Empty Program Name cannot be saved on edit | High |
| TC-102 | Save blocked or rejected when Program Name is cleared | High |
| TC-103 | Failed save does not update the Programs list | High |
| TC-104 | Non-admin cannot edit an existing program | High |
| TC-105 | Unauthenticated user cannot open program edit | High |
| TC-106 | Edit save must not create a duplicate program row | High |
| TC-107 | Save with invalid data does not partially corrupt stored fields | Medium |

### TC-101 — Empty Program Name cannot be saved on edit

**Preconditions**
- User is logged in as admin.
- Edit form is open for "Web Development 2026".

**Scenario / Steps**
```gherkin
Given I am editing "Web Development 2026"
When I clear the Program Name field
And I click Save
Then the program is not saved with an empty name
And the modal remains open or validation is shown
And the Programs list still shows "Web Development 2026"
```

**Priority:** High  

---

### TC-102 — Save blocked or rejected when Program Name is cleared

**Preconditions**
- User is logged in as admin.
- Edit form is open.

**Scenario / Steps**
```gherkin
Given I am editing a program with a valid Program Name
When I delete all characters in Program Name
Then the Save button is disabled or Save shows a validation error
And I cannot successfully submit until Program Name is non-empty
```

**Priority:** High  

---

### TC-103 — Failed save does not update the Programs list

**Preconditions**
- User is logged in as admin.
- Edit form is open for "Web Development 2026".
- Test environment can simulate API/network failure (mock or proxy).

**Scenario / Steps**
```gherkin
Given I am editing "Web Development 2026"
And the save request will fail (network error or 5xx)
When I change Program Name to "Web Development 2026 - Failed Save"
And I click Save
Then the Programs list still shows "Web Development 2026"
And the user sees an error indication (message or inline error)
And reopening edit shows the original Program Name "Web Development 2026"
```

**Priority:** High  

---

### TC-104 — Non-admin cannot edit an existing program

**Preconditions**
- User is logged in with a non-admin role (e.g., instructor or read-only).
- Program "Web Development 2026" exists on Programs page.

**Scenario / Steps**
```gherkin
Given I am logged in as a non-admin user
And I am on the Programs page
When I view the row for "Web Development 2026"
Then I do not see an edit icon or edit action is disabled
And I cannot open the edit form with pre-populated data
And I cannot change the program name to "Unauthorized Edit"
```

**Priority:** High  

---

### TC-105 — Unauthenticated user cannot open program edit

**Preconditions**
- User session is expired or user is logged out.

**Scenario / Steps**
```gherkin
Given I am not authenticated
When I attempt to navigate to the Programs page or a direct edit URL
Then I am redirected to login or receive forbidden access
And I cannot save changes to "Web Development 2026"
```

**Priority:** High  

---

### TC-106 — Edit save must not create a duplicate program row

**Preconditions**
- User is logged in as admin.
- Exactly one program "Web Development 2026" exists.
- Edit form is open.

**Scenario / Steps**
```gherkin
Given the Programs list contains one row for "Web Development 2026"
When I change Program Name to "Web Development 2026 - Updated"
And I click Save
Then the list contains exactly one program representing that record
And the count of programs does not increase by one
```

**Priority:** High  

---

### TC-107 — Save with invalid data does not partially corrupt stored fields

**Preconditions**
- User is logged in as admin.
- Program has Program Name "Data Analytics 2026" and Description "SQL and Python focus".
- Validation rejects an invalid Name (e.g., empty after trim).

**Scenario / Steps**
```gherkin
Given I am editing "Data Analytics 2026"
When I set Program Name to only whitespace characters
And I change Description to "New description attempt"
And I attempt Save
Then save fails validation
And stored Program Name remains "Data Analytics 2026"
And stored Description remains "SQL and Python focus"
```

**Priority:** Medium  

---

## Edge Cases

| ID | Title | Priority |
|----|--------|----------|
| TC-201 | Program Name at maximum allowed length saves on edit | Medium |
| TC-202 | Program Name exceeding maximum length is rejected | Medium |
| TC-203 | Description at maximum allowed length saves on edit | Low |
| TC-204 | Leading and trailing whitespace in Program Name handled consistently | Medium |
| TC-205 | Special characters and Unicode in Program Name persist correctly | Medium |
| TC-206 | Duplicate Program Name when another program already uses that name | Medium |
| TC-207 | HTML/script in Description is stored safely and not executed | High |
| TC-208 | Rapid double-click Save does not duplicate updates or errors | Medium |
| TC-209 | Concurrent edits by two admins last-write-wins or conflict handling | Low |
| TC-210 | Edit icon accessibility: keyboard activation opens pre-populated form | Medium |
| TC-211 | Clearing optional Description (if allowed) behavior on save | Low |
| TC-212 | Very long unchanged session: edit still loads fresh data | Low |

### TC-201 — Program Name at maximum allowed length saves on edit

**Preconditions**
- User is logged in as admin.
- Product defines max length N for Program Name (document N from spec).
- Edit form is open.

**Scenario / Steps**
```gherkin
Given I am editing an existing program
When I set Program Name to a string of exactly N characters (e.g., "A" repeated N times)
And I click Save
Then the modal closes
And the list displays the updated name per UI truncation rules
And reopening edit shows the full N-character name in the field
```

**Priority:** Medium  

---

### TC-202 — Program Name exceeding maximum length is rejected

**Preconditions**
- User is logged in as admin.
- Max length N is known.
- Edit form is open.

**Scenario / Steps**
```gherkin
Given I am editing an existing program
When I set Program Name to a string of N+1 characters
And I click Save
Then save is prevented or validation error is shown
And the previous program name remains in the list
```

**Priority:** Medium  

---

### TC-203 — Description at maximum allowed length saves on edit

**Preconditions**
- User is logged in as admin.
- Max length M for Description is known (if any).
- Edit form is open.

**Scenario / Steps**
```gherkin
Given I am editing "Web Development 2026"
When I set Description to exactly M characters of valid text
And I click Save
Then the save succeeds
And reopening edit shows the full M-character Description
```

**Priority:** Low  

---

### TC-204 — Leading and trailing whitespace in Program Name handled consistently

**Preconditions**
- User is logged in as admin.
- Edit form is open for "Web Development 2026".

**Scenario / Steps**
```gherkin
Given I am editing "Web Development 2026"
When I set Program Name to "  Web Development 2026 - Updated  "
And I click Save
Then the system either trims to "Web Development 2026 - Updated" in the list
Or rejects whitespace-only padding with validation
And behavior matches create-flow normalization (see DS-1 TC-204)
```

**Priority:** Medium  

---

### TC-205 — Special characters and Unicode in Program Name persist correctly

**Preconditions**
- User is logged in as admin.
- Edit form is open.

**Scenario / Steps**
```gherkin
Given I am editing an existing program
When I set Program Name to "Développement Web — Cohort #2 (50%)"
And I click Save
Then the modal closes
And the list shows "Développement Web — Cohort #2 (50%)"
And reopening edit shows the same value in Program Name
```

**Priority:** Medium  

---

### TC-206 — Duplicate Program Name when another program already uses that name

**Preconditions**
- User is logged in as admin.
- Programs "Web Development 2026" and "Cloud Computing 2026" exist.

**Scenario / Steps**
```gherkin
Given I am editing "Cloud Computing 2026"
When I change Program Name to "Web Development 2026"
And I click Save
Then the system either rejects with a duplicate-name error
Or allows duplicate display names per product policy
And behavior is documented and consistent with create flow
```

**Priority:** Medium  

---

### TC-207 — HTML/script in Description is stored safely and not executed

**Preconditions**
- User is logged in as admin.
- Edit form is open.

**Scenario / Steps**
```gherkin
Given I am editing "Web Development 2026"
When I set Description to "<script>alert('xss')</script>Safe text"
And I click Save
Then the modal closes
And viewing the description does not execute script
And stored value is escaped or sanitized per security policy
```

**Priority:** High  

---

### TC-208 — Rapid double-click Save does not duplicate updates or errors

**Preconditions**
- User is logged in as admin.
- Edit form is open for "Web Development 2026".

**Scenario / Steps**
```gherkin
Given I am editing "Web Development 2026"
When I change Program Name to "Web Development 2026 - Updated"
And I double-click Save quickly
Then the modal closes once
And exactly one update is applied
And the list shows a single row with "Web Development 2026 - Updated"
```

**Priority:** Medium  

---

### TC-209 — Concurrent edits by two admins last-write-wins or conflict handling

**Preconditions**
- Two admin sessions (Admin A and Admin B).
- Same program "Web Development 2026" exists.

**Scenario / Steps**
```gherkin
Given Admin A opens edit for "Web Development 2026"
And Admin B opens edit for "Web Development 2026"
When Admin A saves Program Name as "Name From Admin A"
And Admin B saves Description as "Description From Admin B" without refreshing
Then the system either merges changes, shows a conflict error, or applies last save
And the final stored state matches documented concurrency rules
And the list does not show inconsistent name vs. detail view
```

**Priority:** Low  

---

### TC-210 — Edit icon accessibility: keyboard activation opens pre-populated form

**Preconditions**
- User is logged in as admin.
- Programs page loaded; keyboard-only or screen reader testing.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
And focus is on the edit control for "Web Development 2026"
When I activate the control via keyboard (Enter or Space)
Then the edit form opens
And Program Name and Description fields are pre-populated with current values
And focus moves into the modal per accessibility guidelines
```

**Priority:** Medium  

---

### TC-211 — Clearing optional Description (if allowed) behavior on save

**Preconditions**
- User is logged in as admin.
- Program has non-empty Description.
- Product allows empty Description on edit (assumption).

**Scenario / Steps**
```gherkin
Given I am editing a program with Description "Full-stack web development program"
When I clear Description completely
And I leave Program Name unchanged
And I click Save
Then save succeeds or validation fails per product rules
And Program Name remains unchanged
And Description is empty or save is blocked consistently with create rules
```

**Priority:** Low  

---

### TC-212 — Very long unchanged session: edit still loads fresh data

**Preconditions**
- User is logged in as admin.
- Edit form was opened and left idle beyond typical session timeout threshold (if any).

**Scenario / Steps**
```gherkin
Given I opened edit for "Web Development 2026" and idle time elapsed
When I attempt to Save a valid change
Then either save succeeds with current server state
Or session expiry prompts re-login without silent data loss
And the list does not show stale name after successful save
```

**Priority:** Low  

---

## Traceability Matrix (AC → Test Cases)

| Acceptance criterion | Test case IDs |
|----------------------|---------------|
| Open program for editing (pre-populated form) | TC-001, TC-210 |
| Successfully edit a program name | TC-002, TC-006, TC-106, TC-208 |
| Edit preserves unchanged fields | TC-003, TC-107 |

---

## Ambiguities, Assumptions, and Gaps

1. **Feature title vs. ACs** — Task text says "Create new academic program," but all ACs describe **edit**. This plan targets edit; confirm ticket DS-2 scope with product.

2. **Field inventory** — ACs mention Name, Description, and "other fields." Only Program Name and Description are assumed (aligned with DS-1 create form). Additional fields (code, status, dates, department) are not specified; TC-003 cannot verify unnamed fields.

3. **Label naming** — AC uses "Name"; DS-1 uses "Program Name." Assumed same field; confirm UI label in implementation.

4. **List update semantics** — AC requires immediate list update after name change. Unclear whether Description changes must appear in the list or only in edit/detail (TC-004).

5. **Validation parity** — No AC stating edit uses the same rules as create (empty name, max length, duplicates). Edge and negative cases assume parity with DS-1 unless spec differs.

6. **Modal dismiss** — No AC for Escape, click-outside, or unsaved-changes warning when closing edit (TC-005 partial coverage).

7. **Success feedback** — No toast or inline "Saved" message; only modal close and list update are asserted.

8. **Edit entry point** — AC specifies edit icon only; no AC for row click, context menu, or bulk edit.

9. **Persistence** — ACs do not require browser reload after save; TC-006 is recommended smoke, not AC-mapped.

10. **Permissions** — "Admin" role definition and audit logging for edits are not in ACs (TC-104).

11. **Optimistic UI** — Immediate list update may be optimistic; TC-103 needed if rollback on failure is required but not documented.

12. **Program identity** — After rename, unclear whether internal ID, URL, or deep links change; only display name in list is covered.

---

**Suggested execution order:** TC-001 → TC-002 → TC-003 → TC-101 → TC-102 → TC-104 → TC-002 (regression) → remaining by priority.
