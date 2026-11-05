Feature: Valeria - Create new academic program
  DS-256 — As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

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
    And the program list shows "Web Development 2026"
    And the program list shows "Full-stack web development program"

  Scenario: Create a program when Description is left empty
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I leave Description empty
    And I click "Create"
    Then the modal closes
    And the program list shows "Web Development 2026"

  # Negative

  Scenario: Validation prevents empty program name
    Given I am logged in as an admin
    And I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "Full-stack web development program"
    Then the "Create" button is disabled
    And the "New Program" modal stays open

  Scenario: Cancel does not create a program
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click "Cancel"
    Then the modal closes
    And the program list does not show "Web Development 2026"

  # Edge cases

  Scenario: Whitespace-only program name keeps Create disabled
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "   "
    Then the "Create" button is disabled
    And the "New Program" modal stays open

  Scenario: Program name with special characters is accepted
    Given I am logged in as an admin
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026 (C++ & AI)"
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the modal closes
    And the program list shows "Web Development 2026 (C++ & AI)"

  # Ambiguities and gaps
  # - Confirmed on https://test.didaxis.studio (admin, Programs, 2026-11-05).
  # - Locators: button "+ New Program"; dialog heading "New Program"; labels "Program Name *", "Description"; buttons "Cancel" and "Create" (Create disabled until Program Name is non-blank).
  # - List rows use exact name text; Edit/Delete actions are named "Edit <name>" / "Delete <name>".
  # - DS-256 ACs only cover open form, create with name+description, and empty-name Create disabled. Extra scenarios above cover empty description, cancel, whitespace, and special characters.
  # - Duplicate rejection and max length belong to DS-258 / validation tickets, not this story.
  # - Shared tenant currently has thousands of programs; tests must uniquify names with Date.now() and trackProgram for cleanup.
