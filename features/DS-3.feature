Feature: Program name validation and duplicate prevention
  DS-3 — As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained.

  # Happy paths

  Scenario: Accept program name with special characters
    Given I am logged in as an admin
    And I am on the Programs page
    When I click "+ New Program"
    And I enter "Informatique & IA - Niveau 2" as the Program Name
    And I fill in Description with "Artificial intelligence and informatics curriculum"
    And I click "Create"
    Then the "New Program" modal closes
    And the program list shows "Informatique & IA - Niveau 2"
    And the program list shows "Artificial intelligence and informatics curriculum"

  Scenario: Special-character name is accepted when Description is left empty
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I leave Description empty
    And I click "Create"
    Then the "New Program" modal closes
    And the program list shows "Informatique & IA - Niveau 2"

  Scenario: Leading and trailing spaces are trimmed before the name is saved
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter "  Informatique & IA - Niveau 2  " as the Program Name
    And I fill in Description with "Artificial intelligence and informatics curriculum"
    And I click "Create"
    Then the "New Program" modal closes
    And the program list shows "Informatique & IA - Niveau 2"
    And the program list does not show "  Informatique & IA - Niveau 2  "

  # Negative

  Scenario: Reject program name with only whitespace
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter "   " as the Program Name
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the form is not submitted
    And the "Create" button is disabled
    And no error message is shown
    And the "New Program" modal stays open
    And the program list does not show "   "

  Scenario: Empty program name is not submitted
    Given I am logged in as an admin
    And I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the form is not submitted
    And the "Create" button is disabled
    And the "New Program" modal stays open

  Scenario: Reject duplicate program name
    Given I am logged in as an admin
    And a program named "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "Web Development 2026" as the Program Name
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then I see an error indicating the name already exists
    And the "New Program" modal stays open
    And the program list shows "Web Development 2026" once

  Scenario: Same program name with a different description is still rejected
    Given I am logged in as an admin
    And a program named "Web Development 2026" already exists with description "Full-stack web development program"
    And I am on the program creation form
    When I enter "Web Development 2026" as the Program Name
    And I fill in Description with "Alternate cohort description"
    And I click "Create"
    Then I see an error indicating the name already exists
    And the program list shows "Web Development 2026" once
    And the program list does not show "Alternate cohort description"

  # Edge cases

  Scenario: A single space is treated as an empty program name
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter " " as the Program Name
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the form is not submitted
    And the "Create" button is disabled
    And the "New Program" modal stays open

  Scenario: Tabs and newlines only are treated as an empty program name
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter a Program Name made only of a tab and a newline
    And I click "Create"
    Then the form is not submitted
    And the "Create" button is disabled
    And the "New Program" modal stays open

  Scenario: A name that trims to an existing program name is rejected as a duplicate
    Given I am logged in as an admin
    And a program named "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "  Web Development 2026  " as the Program Name
    And I fill in Description with "Alternate cohort description"
    And I click "Create"
    Then I see an error indicating the name already exists
    And the "New Program" modal stays open
    And the program list shows "Web Development 2026" once

  Scenario: Creating the special-character name a second time is rejected
    Given I am logged in as an admin
    And a program named "Informatique & IA - Niveau 2" already exists
    And I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I fill in Description with "Artificial intelligence and informatics curriculum"
    And I click "Create"
    Then I see an error indicating the name already exists
    And the "New Program" modal stays open
    And the program list shows "Informatique & IA - Niveau 2" once

  Scenario: Whitespace-only name can be corrected and then created
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter "   " as the Program Name
    Then the "Create" button is disabled
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I fill in Description with "Artificial intelligence and informatics curriculum"
    And I click "Create"
    Then the "New Program" modal closes
    And the program list shows "Informatique & IA - Niveau 2"

  # Ambiguities and gaps
  # - Confirmed on https://test.didaxis.studio (admin, Programs, 2026-10-27).
  # - Locators: button "+ New Program"; dialog heading "New Program"; textbox "Program Name" (placeholder "e.g. Computer Science BSc", required); textbox "Description" (placeholder "Brief description", not required); button "Create"; button "Cancel". List name is exact text in the row. Row actions are "Edit <name>" and "Delete <name>".
  # - Whitespace-only "   " leaves Create disabled, shows no error, and sends no POST. The ticket says the form is not submitted because the name is trimmed and treated as empty. It does not require an error message. A normal click cannot land on the disabled Create button.
  # - Only Program Name is required. "Fill other required fields" does not add another required field. Description may be empty.
  # - Trim is implemented. "  Informatique & IA - Niveau 2 DS3-trim-20261027  " was stored and listed as "Informatique & IA - Niveau 2 DS3-trim-20261027".
  # - Duplicate rejection is not implemented. Creating the same name twice returned POST /api/programs 201 both times, closed the modal, showed no alert, and listed the name twice. These scenarios still assert the acceptance criterion. Known bugs already linked to DS-3 include DS-249, DS-13, and DS-201. Exact error copy is still unspecified; match an error that the name already exists (already exists / duplicate / unique / taken).
  # - Case sensitivity is not defined ("Web Development 2026" versus "web development 2026").
  # - Uniqueness on edit, delete-then-reuse, and two in-flight creates is not in DS-3. Double-click Create is a separate create-path defect (DS-189) and is not a scenario here.
  # - No maximum length is specified. The Program Name input has no maxlength attribute. Do not invent a 100-character rule in this file.
  # - Internal repeated spaces, non-breaking spaces, and Unicode normalization are not defined.
  # - The shared tenant already contains many "Informatique & IA - Niveau 2 ..." and "Web Development 2026 ..." rows. Automated tests must uniquify names and delete only programs they create.
  # - The dialog close control in the banner has no accessible name. AI Generation Config is on the form and is out of scope.
