# Test Plan: Program List Filtering and Display

**Feature:** Program list filtering and display  
**Scope:** Programs page (admin), program list view, empty state, create-first-program prompt  
**Reference ACs:** List shows each program’s name and description; empty state when no programs exist  

---

## Positive Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-001 | Programs list displays name and description for every existing program | High |
| TC-002 | Single program in the system shows its name and description on the Programs page | High |
| TC-003 | Empty state shows no-program message and prompt to create the first program | High |
| TC-004 | Create-first-program prompt opens or navigates to program creation | High |
| TC-005 | Program list remains accurate after browser reload | Medium |
| TC-006 | Programs with special characters in name and description render correctly in the list | Medium |
| TC-007 | Newly created program appears in the list with name and description | Medium |

### TC-001 — Programs list displays name and description for every existing program

**Preconditions**
- User is logged in with admin role.
- At least three programs exist, for example:
  - **Web Development 2026** — "Full-stack web curriculum for 2026 cohort"
  - **Data Science 2026** — "Statistics, Python, and machine learning foundations"
  - **Cybersecurity 2026** — "Network security and incident response track"

**Scenario / Steps**
```gherkin
Given the programs above exist in the system
When I navigate to the Programs page
Then I see a list of programs
And the list includes "Web Development 2026" with description "Full-stack web curriculum for 2026 cohort"
And the list includes "Data Science 2026" with description "Statistics, Python, and machine learning foundations"
And the list includes "Cybersecurity 2026" with description "Network security and incident response track"
And each visible program row or card shows both a name and a description
```

**Priority:** High  

**Maps to AC:** Display program list with key details  

---

### TC-002 — Single program in the system shows its name and description on the Programs page

**Preconditions**
- User is logged in as admin.
- Exactly one program exists: **Cloud Engineering 2026** with description "Cloud-native architecture and DevOps".

**Scenario / Steps**
```gherkin
Given only "Cloud Engineering 2026" exists in the system
When I navigate to the Programs page
Then I see a list containing one program
And I see the name "Cloud Engineering 2026"
And I see the description "Cloud-native architecture and DevOps"
And I do not see the empty-state no-programs message
```

**Priority:** High  

**Maps to AC:** Display program list with key details  

---

### TC-003 — Empty state shows no-program message and prompt to create the first program

**Preconditions**
- User is logged in as admin.
- No programs exist in the system (fresh tenant, test database reset, or all programs removed).

**Scenario / Steps**
```gherkin
Given no programs exist in the system
When I navigate to the Programs page
Then I see a message indicating no programs have been created
And I see a prompt or call-to-action to create the first program
And I do not see a populated program list with program names
```

**Priority:** High  

**Maps to AC:** Empty state when no programs exist  

---

### TC-004 — Create-first-program prompt opens or navigates to program creation

**Preconditions**
- User is logged in as admin.
- No programs exist.
- User is on the Programs page empty state.

**Scenario / Steps**
```gherkin
Given no programs exist
And I am on the Programs page
When I activate the create-first-program prompt (button or link labeled e.g. "Create program" or "+ New Program")
Then I reach the program creation flow (modal, form, or dedicated create page)
And I can enter Program Name and Description
```

**Priority:** High  

**Maps to AC:** Empty state — prompt to create the first program  

---

### TC-005 — Program list remains accurate after browser reload

**Preconditions**
- User is logged in as admin.
- Programs **Web Development 2026** and **Data Science 2026** exist with known descriptions.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
And both programs are visible with their descriptions
When I reload the browser page
Then "Web Development 2026" and "Data Science 2026" still appear
And each still shows the correct description text
```

**Priority:** Medium  

---

### TC-006 — Programs with special characters in name and description render correctly in the list

**Preconditions**
- User is logged in as admin.
- Program **Informatique & IA - Niveau 2** exists with description "Track A/B: C++ & Python (2026)".

**Scenario / Steps**
```gherkin
Given the program above exists
When I navigate to the Programs page
Then I see the name "Informatique & IA - Niveau 2" displayed legibly
And I see the description "Track A/B: C++ & Python (2026)" displayed legibly
And characters such as &, -, /, and parentheses are not corrupted or HTML-encoded in a way that hides meaning from the user
```

**Priority:** Medium  

---

### TC-007 — Newly created program appears in the list with name and description

**Preconditions**
- User is logged in as admin.
- At least zero or more programs may exist; user can open program creation from Programs page.

**Scenario / Steps**
```gherkin
Given I am on the Programs page
When I create a program named "Mobile Development 2026" with Description "iOS and Android fundamentals"
And creation succeeds
Then the Programs list includes "Mobile Development 2026"
And the list shows description "iOS and Android fundamentals"
```

**Priority:** Medium  

---

## Negative Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-101 | Populated list must not show empty-state no-programs messaging | High |
| TC-102 | Empty state must not display fabricated or sample program rows | High |
| TC-103 | Unauthenticated user must not see the admin program list | High |
| TC-104 | Non-admin must not see programs intended only for admin management | High |
| TC-105 | Program list must not show name without description or description without name | High |
| TC-106 | Deleted program must not remain visible in the list | Medium |
| TC-107 | Failed or partial create must not add a row missing name or description | Medium |

### TC-101 — Populated list must not show empty-state no-programs messaging

**Preconditions**
- User is logged in as admin.
- At least one program exists (e.g., **Web Development 2026**).

**Scenario / Steps**
```gherkin
Given "Web Development 2026" exists
When I navigate to the Programs page
Then I see the program in the list
And I do not see the empty-state message that no programs have been created
And I do not see the create-first-program empty-state prompt as the primary content
```

**Priority:** High  

---

### TC-102 — Empty state must not display fabricated or sample program rows

**Preconditions**
- User is logged in as admin.
- No programs exist.

**Scenario / Steps**
```gherkin
Given no programs exist
When I navigate to the Programs page
Then I do not see placeholder program names such as "Sample Program" or "Lorem ipsum program"
And I do not see list rows with blank names pretending to be real programs
```

**Priority:** High  

---

### TC-103 — Unauthenticated user must not see the admin program list

**Preconditions**
- User is not logged in.
- Programs may or may not exist in the backend.

**Scenario / Steps**
```gherkin
Given I am logged out
When I navigate to the Programs page URL directly
Then I am redirected to login or receive an access-denied response
And I do not see program names or descriptions from the system
```

**Priority:** High  

---

### TC-104 — Non-admin must not see programs intended only for admin management

**Preconditions**
- User is logged in as a non-admin role (e.g., instructor or student—per product RBAC).
- Admin-only programs exist in the system.

**Scenario / Steps**
```gherkin
Given programs exist that are managed only on the admin Programs page
When I navigate to the Programs page or equivalent URL as a non-admin
Then I am denied access or see a role-appropriate view without full admin list details
And I cannot infer private program descriptions I am not authorized to view
```

**Priority:** High  

---

### TC-105 — Program list must not show name without description or description without name

**Preconditions**
- User is logged in as admin.
- Multiple programs exist; data integrity allows only complete records in the list (per product rules).

**Scenario / Steps**
```gherkin
Given I am on the Programs page with a populated list
When I review each visible program entry
Then no entry shows a description with a missing or blank program name
And no entry shows a program name with a missing description field unless product explicitly allows optional descriptions (if allowed, document as exception)
```

**Priority:** High  

---

### TC-106 — Deleted program must not remain visible in the list

**Preconditions**
- User is logged in as admin.
- Program **Test Program** exists and can be deleted via the standard delete flow (see DS-4).

**Scenario / Steps**
```gherkin
Given "Test Program" is listed on the Programs page
When I delete "Test Program" and confirm deletion
Then "Test Program" no longer appears in the program list
And no stale row shows only a description or only a name for "Test Program"
```

**Priority:** Medium  

---

### TC-107 — Failed or partial create must not add a row missing name or description

**Preconditions**
- User is logged in as admin.
- Program creation can be triggered from Programs page.
- Environment can simulate validation failure (e.g., duplicate name blocked per DS-3).

**Scenario / Steps**
```gherkin
Given I attempt to create a program with a duplicate name "Web Development 2026"
When creation is rejected
Then the Programs list is unchanged
And no new row appears with an empty name or empty description
```

**Priority:** Medium  

---

## Edge Cases

| ID | Title | Priority |
|----|--------|----------|
| TC-201 | Very long program name and description display without breaking layout | Medium |
| TC-202 | Maximum-length name and description at system limits appear in the list | Medium |
| TC-203 | Unicode and accented characters in name and description display correctly | Medium |
| TC-204 | Large number of programs lists all entries or paginates consistently | Medium |
| TC-205 | HTML-like or script-like text in description is shown safely (escaped), not executed | High |
| TC-206 | Leading and trailing spaces in stored name display trimmed in the list | Low |
| TC-207 | Transition from empty state to first program replaces empty messaging | High |
| TC-208 | Deleting the last program restores empty state with create prompt | Medium |
| TC-209 | List does not briefly flash empty state while programs are loading | Medium |
| TC-210 | Two programs with similar names remain distinguishable in the list | Low |
| TC-211 | Whitespace-only description (if ever stored) does not break list layout | Low |
| TC-212 | Concurrent create: two admins see updated list without duplicate ghost rows | Low |

### TC-201 — Very long program name and description display without breaking layout

**Preconditions**
- User is logged in as admin.
- Program exists with name of approximately 200 characters and description of approximately 2000 characters (or product maxima).

**Scenario / Steps**
```gherkin
Given a program with an intentionally long name and long description exists
When I navigate to the Programs page
Then the program appears in the list
And the name and description are readable via truncation with ellipsis, wrapping, or expand control per design
And the list layout does not overlap adjacent rows or break page scrolling
```

**Priority:** Medium  

---

### TC-202 — Maximum-length name and description at system limits appear in the list

**Preconditions**
- User is logged in as admin.
- Known field max lengths from DS-1/DS-3 (e.g., name 255 chars, description 5000 chars—adjust to actual limits).

**Scenario / Steps**
```gherkin
Given a program was created with Program Name at maximum allowed length
And Description at maximum allowed length
When I open the Programs page
Then both fields appear for that program without server error
And content is not silently truncated below stored values unless UI spec defines truncation
```

**Priority:** Medium  

---

### TC-203 — Unicode and accented characters in name and description display correctly

**Preconditions**
- User is logged in as admin.
- Program **Programme Été 2026** exists with description "Cursus français — débutant".

**Scenario / Steps**
```gherkin
Given the program above exists
When I navigate to the Programs page
Then I see "Programme Été 2026" and the accented description correctly
And encoding does not show mojibake sequences
```

**Priority:** Medium  

---

### TC-204 — Large number of programs lists all entries or paginates consistently

**Preconditions**
- User is logged in as admin.
- At least 50 programs exist (or above pagination threshold if defined).

**Scenario / Steps**
```gherkin
Given many distinct programs exist with unique names and descriptions
When I navigate to the Programs page
Then I can access every program via scrolling, "Load more", or pagination controls
And no program is silently omitted without a way to reach it
And each visible page or segment still shows name and description per row
```

**Priority:** Medium  

---

### TC-205 — HTML-like or script-like text in description is shown safely (escaped), not executed

**Preconditions**
- User is logged in as admin.
- Program **Security Awareness 2026** exists with description `<script>alert('x')</script> & <b>Bold</b>`.

**Scenario / Steps**
```gherkin
Given the program above exists
When I navigate to the Programs page
Then the description is displayed as plain text or sanitized markup per spec
And no script executes in the browser
And the list row does not render unexpected HTML layout from injected tags
```

**Priority:** High  

---

### TC-206 — Leading and trailing spaces in stored name display trimmed in the list

**Preconditions**
- User is logged in as admin.
- Program was created with name entered as `  Data Science 2026  ` (stored/displayed as **Data Science 2026** per DS-3 trim behavior).

**Scenario / Steps**
```gherkin
Given "Data Science 2026" exists after trim on create
When I view the Programs page
Then the list shows "Data Science 2026" without leading or trailing spaces
And I do not see a duplicate row for a space-padded variant
```

**Priority:** Low  

---

### TC-207 — Transition from empty state to first program replaces empty messaging

**Preconditions**
- User is logged in as admin.
- No programs exist initially.

**Scenario / Steps**
```gherkin
Given I see the empty state on the Programs page
When I create the first program "First Program 2026" with Description "Initial cohort"
Then the empty-state message disappears
And the list shows "First Program 2026" with its description
And the create-first-program empty-state prompt is no longer the sole content
```

**Priority:** High  

---

### TC-208 — Deleting the last program restores empty state with create prompt

**Preconditions**
- User is logged in as admin.
- Exactly one program **Only Program** exists.

**Scenario / Steps**
```gherkin
Given only "Only Program" is in the system
When I delete "Only Program" and confirm
Then the Programs page shows the no-programs message
And I see the prompt to create the first program
```

**Priority:** Medium  

---

### TC-209 — List does not briefly flash empty state while programs are loading

**Preconditions**
- User is logged in as admin.
- Multiple programs exist.
- Network can be throttled (devtools slow 3G) if needed.

**Scenario / Steps**
```gherkin
Given programs exist in the backend
When I navigate to the Programs page with slow network
Then I see a loading indicator or stable layout while data loads if the product provides one
And I do not see the definitive empty-state message unless the loaded result is actually zero programs
```

**Priority:** Medium  

---

### TC-210 — Two programs with similar names remain distinguishable in the list

**Preconditions**
- User is logged in as admin.
- Programs **Web Development 2026** and **Web Development 2027** exist with different descriptions.

**Scenario / Steps**
```gherkin
Given both programs exist
When I view the Programs page
Then both names appear as separate entries
And each description matches the correct program year
And I can tell which row is 2026 versus 2027 without opening edit
```

**Priority:** Low  

---

### TC-211 — Whitespace-only description (if ever stored) does not break list layout

**Preconditions**
- User is logged in as admin.
- A program exists whose description is only spaces or is empty if validation ever allowed it (negative data scenario).

**Scenario / Steps**
```gherkin
Given such a program record exists or can be seeded in test data
When I open the Programs page
Then the row still shows the program name
And the UI handles blank description gracefully (placeholder, em dash, or validation message)
And the list does not collapse or misalign
```

**Priority:** Low  

---

### TC-212 — Concurrent create: two admins see updated list without duplicate ghost rows

**Preconditions**
- Two admin sessions (Admin A and Admin B).
- Both start on Programs page with the same initial program count.

**Scenario / Steps**
```gherkin
Given Admin A creates "Parallel Program A" successfully
When Admin B refreshes or waits for live list update
Then Admin B sees "Parallel Program A" once with correct description
And the list does not show duplicate rows for the same program id or name
```

**Priority:** Low  

---

## Traceability Matrix (AC → Test Cases)

| Acceptance criterion | Test case IDs |
|----------------------|---------------|
| List shows each program’s name and description | TC-001, TC-002, TC-005, TC-006, TC-007, TC-105, TC-201, TC-203, TC-204 |
| Empty state when no programs exist | TC-003, TC-102, TC-207, TC-208 |
| Prompt to create the first program | TC-003, TC-004, TC-208 |

---

## Ambiguities, Assumptions, and Gaps

1. **Filtering not specified in ACs** — The feature title includes "filtering," but the supplied acceptance criteria cover only list display and empty state. No requirements for search box, status filter, date filter, or sort order. This plan does not define filter test cases until product specs exist (related gap noted in DS-1 item 5 and DS-4 item 8).

2. **Empty-state exact copy** — ACs require a message and a create prompt but not exact wording, iconography, or whether **+ New Program** in the header satisfies the empty-state prompt alone.

3. **List presentation** — Unclear whether programs appear as a table, cards, or list items; which column order applies; and whether description is full text, truncated, or tooltip-only (TC-201, TC-202 depend on design).

4. **Optional description** — ACs imply every program has a description in the list. DS-1 may treat Description as required on create; if optional, TC-105 and TC-211 need a documented rule for blank descriptions.

5. **Sort order** — No AC for alphabetical sort, created-date order, or manual reorder. TC-210 assumes names are shown distinctly but not a specific sort.

6. **Permissions** — ACs say "navigate to the Programs page" without role. This plan assumes an admin Programs page consistent with DS-1–DS-4 (TC-103, TC-104).

7. **Fields beyond name and description** — No AC for status, start date, enrollment count, or row actions (edit/delete icons). Those may appear on the same page but are out of scope for the given ACs.

8. **Real-time updates** — No AC that the list updates without reload when another user creates or deletes a program (TC-007, TC-212 are recommended smoke).

9. **Loading and error states** — ACs silent on spinner, skeleton, or error banner when the programs API fails; TC-209 only guards against incorrect empty-state flash.

10. **Accessibility** — No AC for screen reader announcement of list count, empty state, or heading structure for program name vs description.

11. **Internationalization** — Empty-state message localization and RTL layout for long descriptions are undefined (TC-203 covers character display only).

12. **Input file gap** — `DS-5_input.md` in the repo contains folder-setup instructions only, not the feature AC text; this plan uses the ACs supplied in the authoring prompt.

---

**Suggested execution order:** TC-003 → TC-001 → TC-002 → TC-101 → TC-102 → TC-004 → TC-007 → TC-207 → TC-103 → TC-105 → TC-205 → TC-208 → remaining cases by priority.
