Feature: Tania - Create new academic program
  DS-254 — As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

  # Happy paths

  Scenario: Navigate to program creation form
    Given I am logged in as admin
    When I navigate to the Programs page
    And I click "+ New Program"
    Then I see the "New Program" creation form with fields: Program Name, Description
    And I see a "Create" button
    And I see a "Cancel" button

  Scenario: Successfully create a program
    Given I am logged in as admin
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026"

  # Negative

  Scenario: Validation prevents empty program name
    Given I am logged in as admin
    And I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "Full-stack web development program"
    Then the Create button is disabled

  Scenario: Cancel discards unsaved program
    Given I am logged in as admin
    And I am on the program creation form
    When I fill in Program Name with "Temporary Program Name"
    And I fill in Description with "Should not be saved"
    And I click Cancel
    Then the modal closes
    And the program list does not show "Temporary Program Name"

  # Edge cases

  Scenario: Whitespace-only program name keeps Create disabled
    Given I am logged in as admin
    And I am on the program creation form
    When I fill in Program Name with "   "
    Then the Create button is disabled

  Scenario: Create stays disabled after clearing a previously entered name
    Given I am logged in as admin
    And I am on the program creation form
    When I fill in Program Name with "Initial Name"
    Then the Create button is enabled
    When I clear the Program Name field
    Then the Create button is disabled

  # Ambiguities and gaps
  # - Ticket ACs mention only Program Name and Description; the live form also exposes Total Program Hours, Default Session Hours, Default Exam Hours, Target Audience, Focus Areas, and AI Generation Config — out of scope unless product expands ACs.
  # - Ticket does not specify whether Description is required; live Create enables with name only (Description optional).
  # - Duplicate program names and max-length behaviour are not specified in DS-254 ACs.
