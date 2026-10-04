# Test Plan: Edit Existing Program Details

**Jira:** [DS-2](https://legionqaschool.atlassian.net/browse/DS-2) — *Edit existing program details*  
**Feature:** Edit existing academic program  
**Scope:** Program edit modal/form from Programs page (admin)  
**Environment explored:** `https://test.didaxis.studio` (admin, Programs page)  
**Reference ACs:** Open edit with pre-populated data, successful name update, partial edit preserves other fields  

### UI facts (verified on test.didaxis.studio)

| Element | Real behavior |
|--------|----------------|
| Route | `/programs` after login |
| Page title | Heading **Programs** |
| Create entry | Button matching **+ New Program** (`/New Program/i`) |
| Edit entry | Row **Edit** control is a button with accessible name **`Edit {Program Name}`** (not a standalone ✏️ emoji in the a11y tree) |
| Create modal | Dialog heading **New Program**; actions **Create**, **Cancel** |
| Edit modal | Dialog heading **Edit Program**; actions **Save**, **Cancel**; collapsible **Show AI Generation Config** |
| Fields | **Program Name** (placeholder `e.g. Computer Science BSc`), **Description** textarea (placeholder `Brief description`) |
| List | Table rows in `main`; **Program Name** visible in row; **Description** not shown in list (verify via reopening edit) |
| Empty name on edit | **Save** disabled when Program Name is empty or whitespace-only |
| Empty Description on edit | **Save** remains enabled (Description optional on edit) |
| Trim | Leading/trailing spaces on Program Name are **trimmed** on save (same as create) |
| Duplicate name on edit | **Currently allowed**: PATCH succeeds, modal closes, **no** duplicate error; list can show **multiple rows** with the same display name (create flow rejects duplicates — parity gap) |
| Max length | Inputs have **no** HTML `maxlength`; edit accepts **101** and **256** character names (PATCH 200) as of exploration |
| Double-click Save | **Two** PATCH requests observed; modal still closes once |
| Scale | Programs list can contain **thousands** of rows; **New Program** create may take **60–180s** |

> **Note:** Jira ACs say “edit icon”; automation should target the **`Edit {name}`** button in the program row.

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
| TC-007 | Edit modal exposes optional AI Generation Config section | Low |

### TC-001 — Edit form opens with current program data pre-filled

**Preconditions**
- User is logged in with admin role.
- Programs page is reachable.
- A program exists with Program Name "Web Development 2026" and Description "Full-stack web development program" (or equivalent stored values).

**Scenario / Steps**
```gherkin
Given I am on the Programs page
And a program "Web Development 2026" exists in the list
When I click the Edit button labeled "Edit Web Development 2026" on that row
Then I see the "Edit Program" dialog
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

### TC-007 — Edit modal exposes optional AI Generation Config section

**Preconditions**
- User is logged in as admin.
- Edit form is open for any program.

**Scenario / Steps**
```gherkin
Given I opened edit for an existing program
Then the dialog heading is "Edit Program"
And I see a control labeled "Show AI Generation Config"
When I expand "Show AI Generation Config"
Then additional AI-related settings are visible
And Program Name and Description fields remain editable
```

**Priority:** Low  

---

## Negative Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-101 | Empty Program Name cannot be saved on edit | High |
| TC-102 | Save blocked or rejected when Program Name is cleared | High |
| TC-103 | Failed save does not update the Programs list | High |
| TC-104 | Non-admin cannot edit an existing program | High |
| TC-105 | Unauthenticated user cannot open program edit | High |
| TC-106 | Successful rename updates row in place (row count unchanged) | High |
| TC-108 | Renaming to an existing program name should be rejected (product rule; currently failing on test) | High |
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

### TC-106 — Successful rename updates row in place (row count unchanged)

**Preconditions**
- User is logged in as admin.
- Exactly one program "Web Development 2026" exists.
- Edit form is open.

**Scenario / Steps**
```gherkin
Given the Programs list contains one row for "Web Development 2026"
When I change Program Name to "Web Development 2026 - Updated"
And I click Save
Then the list contains exactly one row for that program record
And the total table row count does not increase by one
And the Edit control accessible name updates to "Edit Web Development 2026 - Updated"
```

**Priority:** High  

---

### TC-108 — Renaming to an existing program name should be rejected (product rule; currently failing on test)

**Preconditions**
- User is logged in as admin.
- Two distinct programs exist (e.g., "Cloud Computing 2026" and "Web Development 2026").

**Scenario / Steps**
```gherkin
Given I am editing "Cloud Computing 2026"
When I change Program Name to "Web Development 2026" (already used by another program)
And I click Save
Then save is rejected with a duplicate-name error
And the edit modal stays open or shows validation feedback
And the list still shows exactly one row named "Web Development 2026" and one named "Cloud Computing 2026"
```

**Priority:** High  

**Observed on test.didaxis.studio (defect):** PATCH returns success, modal closes, **two** rows can share the same display name; no duplicate error shown. Automate against desired rule above; tag as `@known-failure` until fixed.

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
| TC-213 | Automation tolerates slow create/edit on large Programs list | Medium |

### TC-201 — Program Name at 100 characters saves on edit

**Preconditions**
- User is logged in as admin.
- Edit form is open.

**Scenario / Steps**
```gherkin
Given I am editing an existing program
When I set Program Name to a unique string of exactly 100 characters
And I click Save
Then the edit modal closes
And the list shows that program name
And reopening edit shows the same 100-character Program Name
```

**Priority:** Medium  

---

### TC-202 — Program Name beyond common limits (101+ chars) on edit

**Preconditions**
- User is logged in as admin.
- Edit form is open.

**Scenario / Steps**
```gherkin
Given I am editing an existing program
When I set Program Name to a unique string of 101 characters
And I click Save
Then either save is rejected with validation (desired, parity with create policy)
Or save succeeds and the full name is stored (current behavior on test.didaxis.studio)
And behavior is documented for regression once product max length is confirmed
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
Then the list shows "Web Development 2026 - Updated" with outer spaces trimmed
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
- Two programs with **unique** names exist.

**Scenario / Steps**
```gherkin
Given I am editing program B
When I change Program Name to match program A's name exactly
And I click Save
Then duplicate-name validation matches create flow (reject with error)
And the list does not contain two rows with the same display name
```

**Priority:** Medium  

**Alias:** See **TC-108** (negative). On test.didaxis.studio today, duplicate rename **succeeds** — treat as defect vs create.

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
Then the modal closes
And ideally exactly one PATCH update is applied
And the list shows a single row with "Web Development 2026 - Updated"
And if two PATCH requests are sent, the UI must not create a second row or corrupt data (known issue: double PATCH observed)
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
And focus is on the Edit button "Edit Web Development 2026" for that row
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
- Program has non-empty Description.

**Scenario / Steps**
```gherkin
Given I am editing a program with Description "Full-stack web development program"
When I clear Description completely
And I leave Program Name unchanged
And I click Save
Then save succeeds (Save is enabled with empty Description on test.didaxis.studio)
And Program Name remains unchanged
And reopening edit shows an empty Description
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

### TC-213 — Automation tolerates slow create/edit on large Programs list

**Preconditions**
- Shared test environment with a large existing program catalog (thousands of rows).

**Scenario / Steps**
```gherkin
Given I am on the Programs page with many existing programs
When I create a new program for edit test setup
Then the create modal closes within an extended timeout (e.g., 180 seconds)
And the new program row appears with Edit button "Edit {name}"
When I open edit and save a valid change
Then the edit flow completes without timing out due to list size alone
```

**Priority:** Medium  

---

## Traceability Matrix (AC → Test Cases)

| Acceptance criterion | Test case IDs |
|----------------------|---------------|
| Open program for editing (pre-populated form) | TC-001, TC-007, TC-210 |
| Successfully edit a program name | TC-002, TC-006, TC-106, TC-208 |
| Edit preserves unchanged fields | TC-003, TC-107, TC-211 |
| Duplicate / validation parity (gap) | TC-108, TC-206, TC-201, TC-202 |

---

## Ambiguities, Assumptions, and Gaps

1. **Edit entry control** — AC says “edit icon”; live UI exposes **`Edit {Program Name}`** button (Mantine ActionIcon). Tests should use that accessible name.

2. **Field inventory** — ACs mention “other fields.” Edit modal also has **Show AI Generation Config** (TC-007). Only Program Name and Description are in scope for DS-2 AC mapping.

3. **List update semantics** — Name changes appear in the list immediately; Description changes require reopening edit (TC-004).

4. **Validation parity gap** — Create rejects duplicates (DS-3); **edit currently allows duplicate names** (TC-108). Max length is not enforced in the DOM on edit; 101–256+ chars save successfully until product limit is defined.

5. **Scale** — Large shared catalog slows create; automation needs long timeouts (TC-213).

6. **Modal dismiss** — No AC for Escape, overlay click, or unsaved-changes warning (TC-005 covers Cancel only).

7. **Success feedback** — No toast; modal close + list update are the success signals.

8. **Permissions** — Admin-only assumed; non-admin paths not verified on test (TC-104).

9. **Double submit** — Double-click Save issues duplicate PATCH (TC-208); ideal guard not yet implemented.

10. **Program identity** — Internal ID not surfaced in UI; tests use display name and Edit button label after rename.

---

**Suggested execution order:** TC-001 → TC-002 → TC-003 → TC-101 → TC-102 → TC-104 → TC-002 (regression) → remaining by priority.
