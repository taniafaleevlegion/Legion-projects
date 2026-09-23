# Test Plan: Program Name Validation and Duplicate Prevention

**Feature:** Program name validation and duplicate prevention

**Scope:** Program creation form (admin), submit via **Create**  
**Reference ACs:** Whitespace-only rejection, special characters accepted, duplicate name rejected  

---

## Positive Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-001 | Valid program name with special characters creates program successfully | High |
| TC-002 | Program Name with leading and trailing spaces trims to unique value and creates program | High |
| TC-003 | Alphanumeric Program Name with hyphen creates program when name is unique | Medium |
| TC-004 | Unicode and accented characters in Program Name are accepted when unique | Medium |

### TC-001 — Valid program name with special characters creates program successfully

**Preconditions**
- User is logged in with admin role.
- Program creation form is open (Programs page → **Create program** or equivalent).
- No existing program is named exactly `Informatique & IA - Niveau 2` (after any server-side normalization used for uniqueness).
- Required fields besides Program Name are known (e.g., **Description**, **Start date**, **Status**) and can be filled with valid values.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter "Informatique & IA - Niveau 2" in the Program Name field
And I fill Description with "Second-year informatics and AI track"
And I fill all other required fields with valid values
And I click Create
Then the program is created successfully
And I see confirmation or the Programs list includes "Informatique & IA - Niveau 2"
And no validation error is shown for Program Name
```

**Priority:** High  

**Maps to AC:** Accept program name with special characters  

---

### TC-002 — Program Name with leading and trailing spaces trims to unique value and creates program

**Preconditions**
- User is logged in as admin.
- Program creation form is open.
- No program exists named `Data Science 2026` (trimmed).

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter "  Data Science 2026  " in the Program Name field
And I fill all other required fields with valid values
And I click Create
Then the program is created successfully
And the stored or displayed Program Name is "Data Science 2026" without leading or trailing spaces
```

**Priority:** High  

**Maps to AC:** Implicit trim behavior (contrast with whitespace-only AC)  

---

### TC-003 — Alphanumeric Program Name with hyphen creates program when name is unique

**Preconditions**
- User is logged in as admin.
- Program creation form is open.
- Name `Cloud Engineering 2026` is not already in use.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter "Cloud Engineering 2026" in the Program Name field
And I fill Description with "Cloud-native architecture and DevOps"
And I fill all other required fields with valid values
And I click Create
Then the program is created successfully
And the Programs list shows "Cloud Engineering 2026"
```

**Priority:** Medium  

**Maps to AC:** Baseline happy path for name validation (supports duplicate AC preconditions)  

---

### TC-004 — Unicode and accented characters in Program Name are accepted when unique

**Preconditions**
- User is logged in as admin.
- Program creation form is open.
- No program named `Programme Été 2026 — Montréal` exists.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter "Programme Été 2026 — Montréal" in the Program Name field
And I fill all other required fields with valid values
And I click Create
Then the program is created successfully
And the Programs list displays the name with accents and em dash preserved
```

**Priority:** Medium  

**Maps to AC:** Extension of special-character acceptance  

---

## Negative Flows

| ID | Title | Priority |
|----|--------|----------|
| TC-101 | Whitespace-only Program Name prevents form submission | High |
| TC-102 | Duplicate Program Name shows error and does not create second program | High |
| TC-103 | Empty Program Name prevents submission | High |
| TC-104 | Duplicate after trim is rejected when stored name matches trimmed input | High |
| TC-105 | Client must not create duplicate when error is shown | High |
| TC-106 | Duplicate error is specific to Program Name, not a generic failure | Medium |

### TC-101 — Whitespace-only Program Name prevents form submission

**Preconditions**
- User is logged in as admin.
- Program creation form is open.
- Other required fields may be filled or left empty for this scenario; focus is Program Name behavior on **Create**.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter "   " in the Program Name field
And I click Create
Then the form is not submitted
And no new program record is created
And I remain on the program creation form
And I see a validation message indicating Program Name is required or cannot be empty
```

**Priority:** High  

**Maps to AC:** Reject program name with only whitespace  

---

### TC-102 — Duplicate Program Name shows error and does not create second program

**Preconditions**
- User is logged in as admin.
- A program named `Web Development 2026` already exists in the system (visible on Programs page).
- Program creation form is open.

**Scenario / Steps**
```gherkin
Given a program "Web Development 2026" already exists
And I am on the program creation form
When I enter "Web Development 2026" in the Program Name field
And I fill Description with "Alternate cohort description"
And I fill all other required fields with valid values
And I click Create
Then the program is not created
And I see an error indicating the program name already exists
And the Programs list still contains exactly one program named "Web Development 2026"
```

**Priority:** High  

**Maps to AC:** Reject duplicate program name  

---

### TC-103 — Empty Program Name prevents submission

**Preconditions**
- User is logged in as admin.
- Program creation form is open.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I leave the Program Name field empty
And I fill all other required fields with valid values
And I click Create
Then the form is not submitted
And I see a validation message that Program Name is required
And no new program appears in the Programs list
```

**Priority:** High  

**Maps to AC:** Related to whitespace-only (empty after trim)  

---

### TC-104 — Duplicate after trim is rejected when stored name matches trimmed input

**Preconditions**
- User is logged in as admin.
- A program `Web Development 2026` already exists (stored without extra spaces).
- Program creation form is open.

**Scenario / Steps**
```gherkin
Given a program "Web Development 2026" already exists
And I am on the program creation form
When I enter "  Web Development 2026  " in the Program Name field
And I fill all other required fields with valid values
And I click Create
Then the program is not created
And I see an error indicating the program name already exists
```

**Priority:** High  

**Maps to AC:** Duplicate prevention combined with trim behavior  

---

### TC-105 — Client must not create duplicate when error is shown

**Preconditions**
- User is logged in as admin.
- Program `Web Development 2026` exists.
- Network tab or API logging is available (optional, for verification).

**Scenario / Steps**
```gherkin
Given a program "Web Development 2026" already exists
And I am on the program creation form
When I submit the form with Program Name "Web Development 2026" and all required fields valid
Then I see a duplicate-name error
And no second program with the same canonical name exists after refresh
And if a create API is invoked, the response is a client-visible error (e.g., 409 Conflict) rather than success
```

**Priority:** High  

**Maps to AC:** Negative — duplicate must not persist despite UI interaction  

---

### TC-106 — Duplicate error is specific to Program Name, not a generic failure

**Preconditions**
- User is logged in as admin.
- Program `Web Development 2026` exists.
- Program creation form is open.

**Scenario / Steps**
```gherkin
Given a program "Web Development 2026" already exists
And I am on the program creation form
When I enter "Web Development 2026" in Program Name and valid values in all other required fields
And I click Create
Then the error message references the program name or states that the name already exists
And the error is associated with the Program Name field or clearly identifies name duplication
And other field values I entered remain populated so I can correct the name without re-entering everything
```

**Priority:** Medium  

**Maps to AC:** Quality of duplicate rejection UX  

---

## Edge Cases

| ID | Title | Priority |
|----|--------|----------|
| TC-201 | Tabs and newlines only in Program Name treated as empty after trim | High |
| TC-202 | Mixed whitespace and visible characters trims outer whitespace only | Medium |
| TC-203 | Case-variant duplicate name behavior (if case-insensitive uniqueness) | Medium |
| TC-204 | Program Name at maximum allowed length is accepted when unique | Medium |
| TC-205 | Program Name exceeding maximum length is rejected | Medium |
| TC-206 | Minimum-length name (single visible character) accepted when unique | Low |
| TC-207 | Duplicate check applies to create only; editing another program to duplicate name | Medium |
| TC-208 | Special characters that resemble HTML or script are stored safely | Medium |
| TC-209 | Very long whitespace padding around valid name still deduplicates correctly | Medium |
| TC-210 | Concurrent duplicate create requests: only one succeeds | Low |

### TC-201 — Tabs and newlines only in Program Name treated as empty after trim

**Preconditions**
- User is logged in as admin.
- Program creation form is open.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter a Program Name consisting only of tab characters and newline characters (e.g., "\t\n\t")
And I click Create
Then the form is not submitted
And Program Name is treated as empty after trim
And I see a required-field or empty-name validation message
```

**Priority:** High  

**Maps to AC:** Extension of whitespace-only rejection  

---

### TC-202 — Mixed whitespace and visible characters trims outer whitespace only

**Preconditions**
- User is logged in as admin.
- Program creation form is open.
- No program named `Informatique & IA - Niveau 2` exists.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter "  Informatique & IA - Niveau 2  " in the Program Name field
And I fill all other required fields with valid values
And I click Create
Then the program is created with name "Informatique & IA - Niveau 2"
And internal spaces around "&" and "-" are preserved
```

**Priority:** Medium  

**Maps to AC:** Trim vs. special-character preservation  

---

### TC-203 — Case-variant duplicate name behavior (if case-insensitive uniqueness)

**Preconditions**
- User is logged in as admin.
- Program `Web Development 2026` exists.
- Product rule for case sensitivity is unknown — execute and document actual behavior.

**Scenario / Steps**
```gherkin
Given a program "Web Development 2026" already exists
And I am on the program creation form
When I enter "web development 2026" in the Program Name field
And I fill all other required fields with valid values
And I click Create
Then either the program is rejected with a duplicate-name error
Or the program is created with exact casing "web development 2026" as a distinct record
And the observed behavior matches documented product rules for case sensitivity
```

**Priority:** Medium  

**Maps to AC:** Gap — AC does not specify case-insensitive duplicates  

---

### TC-204 — Program Name at maximum allowed length is accepted when unique

**Preconditions**
- User is logged in as admin.
- Maximum Program Name length is defined in requirements or UI (e.g., 255 characters); if unknown, use the maxlength attribute on the field or API schema as source of truth.
- Generated name is exactly at that limit and unique.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
And I have a unique Program Name string of exactly the maximum allowed character count
When I enter that string in the Program Name field
And I fill all other required fields with valid values
And I click Create
Then the program is created successfully
And the full name is visible in the Programs list without truncation beyond any documented display ellipsis rules
```

**Priority:** Medium  

**Maps to AC:** Boundary value — not in AC  

---

### TC-205 — Program Name exceeding maximum length is rejected

**Preconditions**
- User is logged in as admin.
- Maximum length N is known (from field maxlength or API).

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter a unique Program Name of N+1 characters
And I fill all other required fields with valid values
And I click Create
Then the form is not submitted successfully
And I see a validation error for Program Name length
And no partial or truncated program is created without user confirmation
```

**Priority:** Medium  

**Maps to AC:** Boundary value — not in AC  

---

### TC-206 — Minimum-length name (single visible character) accepted when unique

**Preconditions**
- User is logged in as admin.
- No program named `A` exists (unless product forbids single-character names).

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter "A" in the Program Name field
And I fill all other required fields with valid values
And I click Create
Then either the program is created successfully with name "A"
Or the form shows a minimum-length validation error
And the outcome matches documented minimum-length rules
```

**Priority:** Low  

**Maps to AC:** Boundary value  

---

### TC-207 — Duplicate check on create vs. edit collision (out of create AC scope but same rule)

**Preconditions**
- User is logged in as admin.
- Programs `Web Development 2026` and `Mobile Development 2026` exist.
- Edit flow for programs is available on the same page.

**Scenario / Steps**
```gherkin
Given a program "Web Development 2026" already exists
And I am editing "Mobile Development 2026"
When I change Program Name to "Web Development 2026"
And I click Save
Then the update is rejected with a duplicate-name error
And "Mobile Development 2026" remains unchanged in the Programs list
```

**Priority:** Medium  

**Maps to AC:** Negative — duplicate rule should be consistent beyond create (assumption)  

---

### TC-208 — Special characters that resemble HTML or script are stored safely

**Preconditions**
- User is logged in as admin.
- Program creation form is open.
- Name `<script>alert('x')</script> Test 2026` is unique.

**Scenario / Steps**
```gherkin
Given I am on the program creation form
When I enter "<script>alert('x')</script> Test 2026" in the Program Name field
And I fill all other required fields with valid values
And I click Create
Then the program is created or rejected per security policy
And if created, the Programs list displays the name as plain text without executing script
And no XSS occurs in the list or detail view
```

**Priority:** Medium  

**Maps to AC:** Negative — must not interpret name as markup  

---

### TC-209 — Very long whitespace padding around valid name still deduplicates correctly

**Preconditions**
- User is logged in as admin.
- Program `Web Development 2026` exists.

**Scenario / Steps**
```gherkin
Given a program "Web Development 2026" already exists
And I am on the program creation form
When I enter a Program Name with 50 leading spaces and 50 trailing spaces around "Web Development 2026"
And I click Create
Then the duplicate-name error is shown
And no duplicate program is created
```

**Priority:** Medium  

**Maps to AC:** Trim + duplicate interaction  

---

### TC-210 — Concurrent duplicate create requests: only one succeeds

**Preconditions**
- User is logged in as admin.
- No program named `Parallel Test 2026` exists.
- Ability to send two create requests in quick succession (two browser tabs or API tool).

**Scenario / Steps**
```gherkin
Given I am on the program creation form in two sessions with the same valid payload for Program Name "Parallel Test 2026"
When both sessions click Create within a short interval
Then at most one program named "Parallel Test 2026" exists after both requests complete
And the other request receives a duplicate-name or conflict error
```

**Priority:** Low  

**Maps to AC:** Negative — must not allow double insert  

---

## Traceability Matrix (AC → Test Cases)

| Acceptance criterion | Test case IDs |
|----------------------|---------------|
| Reject program name with only whitespace | TC-101, TC-201, TC-103 (related) |
| Accept program name with special characters | TC-001, TC-002, TC-004, TC-202 |
| Reject duplicate program name | TC-102, TC-104, TC-105, TC-106, TC-209, TC-210 |

---

## Ambiguities, Missing Assumptions, and Gaps

1. **Required fields on create** — ACs mention filling "other required fields" only for the special-character scenario. The exact field set (Description, dates, department, capacity, status, etc.), defaults, and whether any are optional are not specified. Test data assumes a stable set of required fields documented elsewhere.

2. **Trim semantics** — AC states whitespace-only names are trimmed and treated as empty. It does not define whether trim is Unicode-aware, whether internal consecutive spaces are collapsed, or whether non-breaking spaces (U+00A0) count as whitespace.

3. **Uniqueness scope** — Unclear whether duplicate names are forbidden globally, per institution/tenant, per academic year, or per status (draft vs. published). TC-102 assumes global uniqueness within the admin's visible Programs list.

4. **Case sensitivity** — AC uses exact string `Web Development 2026`. No rule for `WEB DEVELOPMENT 2026` or `web development 2026`. TC-203 requires a product decision.

5. **Normalization for duplicates** — Unknown whether comparison ignores punctuation, accents, or Unicode normalization (NFC/NFD). Could affect `Informatique & IA` vs. `Informatique and IA`.

6. **Maximum and minimum length** — Not in ACs. TC-204 and TC-205 depend on schema or UI constraints.

7. **Error presentation** — AC requires an error for duplicates but not exact copy, HTTP status, inline vs. toast, or field-level highlighting. TC-106 assumes name-specific messaging.

8. **Edit and delete interactions** — Duplicate AC is create-only. TC-207 assumes the same uniqueness rule on edit; soft-deleted programs reusing names is not defined.

9. **Allowed special characters** — One positive example is given (`&`, `-`, spaces, accented letters in other TCs). Restrictions on quotes, slashes, emojis, or control characters are not listed.

10. **Timing of validation** — Unknown whether duplicate check runs on blur, on submit, or asynchronously; affects whether TC-105 observes multiple API calls.

11. **Success criteria after create** — AC says "created successfully" but does not specify redirect target, toast message, or immediate list refresh. Positive cases assume list or confirmation reflects the new name.

12. **Permissions** — Assumes admin on program creation form; role-based differences (e.g., instructor cannot create) are out of scope unless specified.
