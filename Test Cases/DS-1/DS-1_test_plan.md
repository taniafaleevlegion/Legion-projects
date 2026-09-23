# Test Plan: Create New Academic Program

**Feature:** Create new academic program  
**Scope:** Program creation modal/form from Programs page (admin)  
**Reference ACs:** Navigation to form, successful create, empty Program Name validation  

---

## Positive Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-001 | Admin opens program creation form with required fields | High |
| TC-002 | Admin creates program with name and description; list updates | High |
| TC-003 | Create button disabled when Program Name is empty | High |
| TC-004 | Admin creates program with name only (Description empty) | Medium |
| TC-005 | Admin cancels creation; no new program in list | Medium |
| TC-006 | New program appears in list without full page reload | Medium |

### TC-001 — Admin opens program creation form with required fields

**Preconditions**
- User is logged in with admin role.
- At least one program may exist in the system (list is reachable).

**Scenario / Steps**
```gherkin
Given I am logged in as admin
When I navigate to the Programs page
And I click "+ New Program"
Then I see the program creation form
And the form displays a "Program Name" field
And the form displays a "Description" field
And I see a "Create" action for submitting the form
```

**Priority:** High  

**Maps to AC:** Navigate to program creation form  

---

### TC-002 — Admin creates program with name and description; list updates

**Preconditions**
- User is logged in as admin.
- Program creation form is open (via Programs → "+ New Program").
- No existing program named exactly "Web Development 2026" (or test uses a unique suffix if duplicates are allowed).

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "Web Development 2026"
And I fill in Description with "Full-stack web development program"
And I click Create
Then the creation modal closes
And the Programs list includes "Web Development 2026"
And the listed program reflects the saved name (visible in the primary program label/title)
```

**Priority:** High  

**Maps to AC:** Successfully create a program  

---

### TC-003 — Create button disabled when Program Name is empty

**Preconditions**
- User is logged in as admin.
- Program creation form is open.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I leave the Program Name field empty
And I may optionally fill Description with "Any description"
Then the Create button is disabled
And I cannot submit the form via the Create button
```

**Priority:** High  

**Maps to AC:** Validation prevents empty program name  

---

### TC-004 — Admin creates program with name only (Description empty)

**Preconditions**
- User is logged in as admin.
- Program creation form is open.
- Product treats Description as optional (assumption—see Gaps).

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "Data Science Fundamentals"
And I leave Description empty
And the Create button is enabled
And I click Create
Then the modal closes
And the Programs list shows "Data Science Fundamentals"
```

**Priority:** Medium  

---

### TC-005 — Admin cancels creation; no new program in list

**Preconditions**
- User is logged in as admin.
- Program creation form is open.
- Note current program count or names on the Programs list.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "Temporary Program Name"
And I fill in Description with "Should not be saved"
And I dismiss the modal (Cancel, Close, or Escape—whichever the UI provides)
Then the modal closes
And the Programs list does not include "Temporary Program Name"
And no duplicate or partial record was created
```

**Priority:** Medium  

---

### TC-006 — New program appears in list without full page reload

**Preconditions**
- User is logged in as admin.
- Programs page is open; creation form available.

**Scenario / Steps**
```gherkin
Given I am on the Programs page with the program list visible
When I open "+ New Program"
And I create a program named "Cloud Computing 2026" with Description "AWS and Azure basics"
And I click Create
Then the modal closes
And "Cloud Computing 2026" appears in the current list view without manually refreshing the browser
```

**Priority:** Medium  

---

## Negative Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-101 | Non-admin cannot open or use program creation | High |
| TC-102 | Empty Program Name cannot result in a saved program | High |
| TC-103 | Create remains disabled after clearing a previously entered name | High |
| TC-104 | Failed or blocked create does not close modal or add phantom list entry | Medium |
| TC-105 | Unauthenticated user cannot reach program creation | High |

### TC-101 — Non-admin cannot open or use program creation

**Preconditions**
- User is logged in as a non-admin role (e.g., instructor, student, read-only admin—per product RBAC).

**Scenario / Steps**
```gherkin
Given I am logged in as a user who is not an admin
When I navigate to the Programs page
Then I do not see "+ New Program"
Or when I attempt to reach the creation URL directly
Then I am denied access (redirect, 403, or equivalent)
And I cannot create a program named "Unauthorized Program"
```

**Priority:** High  

---

### TC-102 — Empty Program Name cannot result in a saved program

**Preconditions**
- User is logged in as admin.
- Program creation form is open.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
And Program Name is empty
When I attempt to submit via Create (button disabled)
Or if submission is forced via keyboard/API bypass in exploratory testing
Then no new program is created
And the Programs list is unchanged
And the user sees validation feedback or the action remains blocked
```

**Priority:** High  

---

### TC-103 — Create remains disabled after clearing a previously entered name

**Preconditions**
- User is logged in as admin.
- Program creation form is open.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "Initial Name"
Then the Create button becomes enabled
When I clear Program Name completely
Then the Create button is disabled again
And clicking Create (if somehow triggered) does not create a program
```

**Priority:** High  

---

### TC-104 — Failed or blocked create does not close modal or add phantom list entry

**Preconditions**
- User is logged in as admin.
- Simulate or trigger a server/network error on create (test env stub or offline).

**Scenario / Steps**
```gherkin
Given I am on the program creation form
And I fill in Program Name with "Network Failure Test"
And I fill in Description with "Error handling check"
When I click Create
And the server returns an error or the request times out
Then the modal does not close silently without feedback
Or the modal stays open with entered values preserved
And "Network Failure Test" does not appear in the list unless the server confirms success
And the user sees an error message or retry path
```

**Priority:** Medium  

---

### TC-105 — Unauthenticated user cannot reach program creation

**Preconditions**
- No active session (logged out or session expired).

**Scenario / Steps**
```gherkin
Given I am not logged in
When I navigate to the Programs page or direct creation entry point
Then I am redirected to login
And I cannot submit a new program
```

**Priority:** High  

---

## Edge Cases

| ID | Title | Priority |
|----|--------|----------|
| TC-201 | Program Name at minimum valid length (single character) | Medium |
| TC-202 | Program Name at documented maximum length | Medium |
| TC-203 | Program Name one character over maximum length | Medium |
| TC-204 | Program Name with leading and trailing whitespace | High |
| TC-205 | Program Name containing only whitespace | High |
| TC-206 | Special characters and Unicode in Program Name | Medium |
| TC-207 | Duplicate Program Name | High |
| TC-208 | Description at maximum length | Low |
| TC-209 | Description with line breaks and rich text | Low |
| TC-210 | HTML/script-like content in Description (display safety) | Medium |
| TC-211 | Very long Description when no max is documented | Low |
| TC-212 | Rapid double-click on Create | Medium |

### TC-201 — Program Name at minimum valid length (single character)

**Preconditions**
- Admin on program creation form.
- Minimum length rule is 1 non-whitespace character (if stricter min exists, use that value).

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "A"
And I fill in Description with "Single-letter name test"
And I click Create
Then the modal closes
And the Programs list shows "A"
```

**Priority:** Medium  

---

### TC-202 — Program Name at documented maximum length

**Preconditions**
- Admin on program creation form.
- Known max length N (e.g., 255)—replace N in steps when spec is available.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with a string of exactly N characters (e.g., 255 × "x")
And I fill in Description with "Max length name test"
And I click Create
Then the modal closes
And the program appears in the list with the full name stored and displayed correctly (or truncated per UI spec with full value on hover)
```

**Priority:** Medium  

---

### TC-203 — Program Name one character over maximum length

**Preconditions**
- Admin on program creation form.
- Max length N is defined.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter N+1 characters in Program Name
Then the field prevents additional input or shows validation
And Create is disabled or submit fails with clear message
And no program is created with a truncated name without user confirmation
```

**Priority:** Medium  

---

### TC-204 — Program Name with leading and trailing whitespace

**Preconditions**
- Admin on program creation form.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "  Web Development 2026  "
And I fill in Description with "Whitespace trimming test"
And I click Create
Then the system either trims to "Web Development 2026" in the list
Or rejects the input with validation
And behavior matches product rule consistently on create and display
```

**Priority:** High  

---

### TC-205 — Program Name containing only whitespace

**Preconditions**
- Admin on program creation form.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "   " (spaces only)
Or with tab characters only
Then the Create button is disabled
Or validation treats the name as empty
And no program is created
```

**Priority:** High  

---

### TC-206 — Special characters and Unicode in Program Name

**Preconditions**
- Admin on program creation form.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "Développement Web — 2026 (Phase 1)"
And I fill in Description with "Accents, em dash, parentheses"
And I click Create
Then the modal closes
And the list shows the name exactly as stored (encoding preserved)
```

**Priority:** Medium  

---

### TC-207 — Duplicate Program Name

**Preconditions**
- Admin logged in.
- A program named "Web Development 2026" already exists.

**Scenario / Steps**
```gherkin
Given a program "Web Development 2026" already exists in the list
When I open the program creation form
And I fill in Program Name with "Web Development 2026"
And I fill in Description with "Duplicate name attempt"
And I click Create
Then the system either allows two programs with the same display name
Or blocks creation with a clear duplicate error
And the list state matches the rule (one or two entries, never corrupted)
```

**Priority:** High  

---

### TC-208 — Description at maximum length

**Preconditions**
- Admin on program creation form.
- Max description length M known (if unknown, use exploratory large paste).

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "Long Description Program"
And I fill in Description with exactly M characters
And I click Create
Then the program is created successfully
And detail/list views show description per UI rules (full, truncated, or tooltip)
```

**Priority:** Low  

---

### TC-209 — Description with line breaks and rich text

**Preconditions**
- Admin on program creation form.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "Multiline Description Program"
And I fill in Description with "Line one\nLine two\nLine three"
And I click Create
Then the program is created
And line breaks render safely (plain text or formatted per spec), not as broken layout
```

**Priority:** Low  

---

### TC-210 — HTML/script-like content in Description (display safety)

**Preconditions**
- Admin on program creation form.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "XSS Check Program"
And I fill in Description with "<script>alert('test')</script> and <img src=x onerror=alert(1)>"
And I click Create
Then the program is created if input is allowed
And viewing the program does not execute script
And content is escaped or sanitized in the UI
```

**Priority:** Medium  

---

### TC-211 — Very long Description when no max is documented

**Preconditions**
- Admin on program creation form.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "Huge Description Program"
And I paste a Description of 10,000+ characters
And I click Create
Then the system accepts, rejects, or truncates per backend limits
And the user receives clear feedback if rejected
And the application remains stable
```

**Priority:** Low  

---

### TC-212 — Rapid double-click on Create

**Preconditions**
- Admin on program creation form.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I fill in Program Name with "Double Submit Program"
And I fill in Description with "Idempotency test"
And I double-click Create quickly
Then exactly one program "Double Submit Program" exists in the list
And the modal closes once
```

**Priority:** Medium  

---

## Traceability Matrix (AC → Test Cases)

| Acceptance criterion | Test case IDs |
|----------------------|---------------|
| Navigate to program creation form | TC-001 |
| Successfully create a program | TC-002, TC-006 |
| Validation prevents empty program name | TC-003, TC-102, TC-103, TC-205 |

---

## Ambiguities, Assumptions, and Gaps

1. **Description required vs optional** — ACs show both fields on the form but only require Program Name for enabling Create. Unclear whether Description is optional on submit; TC-004 assumes optional.

2. **Modal vs full page** — AC says "modal closes"; no spec for Cancel/Close control labels, Escape key, or click-outside dismiss (TC-005).

3. **Field constraints** — No max/min length, character set, or duplicate-name policy for Program Name; edge cases (TC-202, TC-203, TC-207) need product limits.

4. **Whitespace normalization** — Unknown whether leading/trailing spaces are trimmed or rejected (TC-204, TC-205).

5. **List behavior** — Unclear sort order, search/filter interaction, and whether description appears in the list after create (TC-002 only asserts name visibility).

6. **Success feedback** — No AC for toast, inline success message, or focus return after create.

7. **Edit after create** — No requirement to open or edit the new program from the list.

8. **Admin definition** — "Logged in as admin" is not tied to a specific role name or permission flag (TC-101).

9. **Accessibility** — No AC for keyboard-only flow, focus trap in modal, or screen reader labels for Program Name and Description.

10. **Concurrency** — Two admins creating the same name simultaneously is not covered beyond TC-207 and TC-212.

11. **API/error handling** — ACs assume happy path; TC-104 depends on test environment support for failures.

12. **Persistence** — No AC that reloading the Programs page still shows the new program (recommended smoke check alongside TC-002).

---

**Suggested execution order:** TC-001 → TC-003 → TC-002 → TC-103 → TC-101 → remaining edge cases by priority.
