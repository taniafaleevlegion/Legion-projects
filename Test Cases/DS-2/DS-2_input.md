DS-2

## Role
You are a senior QA engineer reviewing the feature described below.

## Task
Create a detailed test plan for the "Create new academic program" feature.

## Acceptance Criteria
Scenario: Open program for editing
  Given I am on the Programs page
  And a program "Web Development 2026" exists
  When I click the edit icon on "Web Development 2026"
  Then I see the edit form pre-populated with the program's current data

Scenario: Successfully edit a program name
  Given I am editing "Web Development 2026"
  When I change the Name to "Web Development 2026 - Updated"
  And I click Save
  Then the modal closes
  And the program list immediately shows "Web Development 2026 - Updated"

Scenario: Edit preserves unchanged fields
  Given I am editing a program
  When I only change the Description
  And I click Save
  Then the Name and other fields remain unchanged
## Requirements for the Test Plan
- Cover every Acceptance Criterion (AC) with at least one test case.
- Add edge cases not explicitly mentioned in the ACs (e.g., boundary values, empty inputs, special characters, duplicates, maximum length).
- Add negative test cases (what should NOT happen).
- Structure each test case with the following fields:
  - ID (e.g., TC-001, TC-002)
  - Title (focus on expected behavior, not UI actions)
  - Preconditions
  - Scenario / Steps (written in Gherkin format using Given / When / Then)
  - Priority (High / Medium / Low)
- Group test cases into sections: Positive Flows, Negative Flows, Edge Cases.

## Output Format
- Deliver a structured test plan in Markdown format.
- Use actual field names and realistic values rather than generic placeholders.
- At the end of the test plan, include a section listing any ambiguities, missing assumptions, or gaps found in the ACs.
