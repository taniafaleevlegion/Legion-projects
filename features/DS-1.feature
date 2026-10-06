Feature: Create new academic program
  DS-1 — As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

  # Happy paths

  Scenario: Navigate to program creation form
    Given I am logged in as an admin
    When I navigate to the Programs page
    And I click "+ New Program"
    Then I see the "New Program" creation form
    And the form has a "Program Name" field
    And the form has a "Description" field

  Scenario: Successfully create a program
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the modal closes
    And the program list shows "Web Development 2026" without a manual page refresh
    And the program list shows "Full-stack web development program"

  Scenario: Editor can create a program
    Given I am logged in as an editor
    And I am on the Programs page
    When I click "+ New Program"
    And I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the modal closes
    And the program list shows "Web Development 2026"

  Scenario: Create a program when Description is left empty
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I leave Description empty
    And I click "Create"
    Then the modal closes
    And the program list shows "Web Development 2026"

  Scenario: Empty programs page offers program creation
    Given I am logged in as an admin
    And no programs exist
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And I see "Create Program"

  Scenario: Create Program on the empty page opens the form
    Given I am logged in as an admin
    And no programs exist
    And I am on the Programs page
    When I click "Create Program"
    Then I see the "New Program" creation form
    And the form has a "Program Name" field
    And the form has a "Description" field

  # Negative

  Scenario: Validation prevents empty program name
    Given I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "Full-stack web development program"
    Then the "Create" button is disabled
    And no error message is shown
    And the program list does not show "Web Development 2026"

  Scenario: Whitespace-only program name is not submitted
    Given I am on the program creation form
    When I fill in Program Name with "   "
    And I click "Create"
    Then the "New Program" modal stays open
    And no program is created

  Scenario: Viewer cannot start program creation
    Given I am logged in as a viewer
    When I navigate to the Programs page
    Then I do not see "+ New Program"

  Scenario: Cancel does not create a program
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click "Cancel"
    Then the modal closes
    And the program list does not show "Web Development 2026"

  Scenario: Closing with X does not create a program
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click the X button
    Then the modal closes
    And the program list does not show "Web Development 2026"

  Scenario: Clicking outside the modal does not create a program
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click outside the modal
    Then the modal closes
    And the program list does not show "Web Development 2026"

  Scenario: Duplicate program name is rejected
    Given a program named "Web Development 2026" already exists in the organization
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then an error is displayed
    And the program list shows "Web Development 2026" once

  Scenario: Program name longer than 100 characters is rejected
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026 cohort for full-stack students entering the spring term at Legion QA School 2026"
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then an error is displayed
    And the program list does not show "Web Development 2026 cohort for full-stack students entering the spring term at Legion QA School 2026"

  Scenario: Description longer than 500 characters is rejected
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development progra"
    And I click "Create"
    Then an error is displayed
    And the program list does not show "Web Development 2026"

  # Edge cases

  Scenario: Program name of exactly 100 characters is accepted
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026 cohort for full-stack students entering the spring term at Legion QA School 202"
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the modal closes
    And the program list shows "Web Development 2026 cohort for full-stack students entering the spring term at Legion QA School 202"

  Scenario: Description of exactly 500 characters is accepted
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development program. Full-stack web development progr"
    And I click "Create"
    Then the modal closes
    And the program list shows "Web Development 2026"

  Scenario: Leading and trailing spaces are trimmed from the program name
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "  Web Development 2026  "
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the modal closes
    And the program list shows "Web Development 2026"
    And the program list does not show "  Web Development 2026  "

  Scenario: Program name with special characters is accepted
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026 (C++ & AI)"
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the modal closes
    And the program list shows "Web Development 2026 (C++ & AI)"

  Scenario: A one-character program name is accepted
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "W"
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the modal closes
    And the program list shows "W"

  # Ambiguities and gaps
  # - Program Setup — Overview says the create flow confirms with "Save". DS-1 and Program Setup — UI Behavior say "Create". These scenarios use "Create".
  # - Exact error text is not specified for a duplicate name (400 or 409), a name over 100 characters (400), or a description over 500 characters (400). Scenarios only check that an error is displayed.
  # - Uniqueness is "per organization", but no organization is named, and case sensitivity is not defined for "Web Development 2026" versus "web development 2026".
  # - The modal is specified to stay open only for a whitespace-only name. It is not specified whether the modal stays open when a duplicate or an over-length value is rejected.
  # - Double-clicking "Create", or clicking it again while the request is in flight, is not specified.
  # - DS-1 lists only Program Name and Description. Field Definitions also include a collapsible "AI Generation Config" section (Total Hours, Default Session Hours, Default Exam Hours, Target Audience, Focus Areas, Sync/Async Ratio). Those fields are not covered here.
  # - The empty state uses a "Create Program" button and the header uses "+ New Program". It is not explicit that both open the same modal. Viewer visibility is specified for "+ New Program" only, not for "Create Program".
  # - The list shows a "description preview", but not how much of a 500-character description is visible.
  # - No character is listed as invalid. "Web Development 2026 (C++ & AI)" is treated as allowed.
  # - The only minimum for Program Name is non-empty after trim. A one-character name is included on that reading.
  # - Trim-versus-length order is not specified. The 101-character name has no leading or trailing spaces, so a trim cannot turn it into 100 characters.
