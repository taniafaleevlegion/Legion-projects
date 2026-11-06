Feature: Program name validation and duplicate prevention
  DS-258 — As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained.

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

  # Negative

  Scenario: Reject program name with only whitespace
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter "   " as the Program Name
    And I click "Create"
    Then the form is not submitted (name is trimmed, treated as empty)
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

  # Edge cases

  Scenario: Empty program name keeps Create disabled
    Given I am logged in as an admin
    And I am on the program creation form
    When I leave the Program Name field empty
    Then the "Create" button is disabled
    And the "New Program" modal stays open

  Scenario: Special-character name is accepted when Description is left empty
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I leave Description empty
    And I click "Create"
    Then the "New Program" modal closes
    And the program list shows "Informatique & IA - Niveau 2"

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
  # - Confirmed on https://test.didaxis.studio (admin, Programs, 2026-11-04).
  # - Locators: button "+ New Program"; dialog heading "New Program"; textbox "Program Name"; textbox "Description"; button "Create" (disabled until Program Name is non-blank); button "Cancel". List rows use exact name text; actions "Edit <name>" / "Delete <name>".
  # - Whitespace-only "   " leaves Create disabled and does not POST. Ticket says name is trimmed and treated as empty.
  # - Only Program Name is required to enable Create. "Fill other required fields" adds no second required field.
  # - Duplicate rejection may still be unimplemented on the shared tenant (see DS-3 / DS-249). Specs must assert the AC; uniquify names and trackProgram for cleanup.
  # - Exact duplicate error copy is unspecified; match already exists / duplicate / unique / taken.
