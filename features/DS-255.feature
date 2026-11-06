Feature: Tania - new academic program
  DS-255 — As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

  # Happy paths

  Scenario: Navigate to program creation form
    Given I am logged in as admin
    When I navigate to the Programs page
    And I click "+ New Program"
    Then I see the program creation form with fields: Program Name, Description

  Scenario: Successfully create a program
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026"

  Scenario: Create a program when Description is left empty
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I leave Description empty
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026"

  # Negative

  Scenario: Validation prevents empty program name
    Given I am on the program creation form
    When I leave the Program Name field empty
    Then the Create button is disabled

  Scenario: Whitespace-only program name keeps Create disabled
    Given I am on the program creation form
    When I fill in Program Name with "   "
    Then the Create button is disabled
    And the New Program modal stays open

  Scenario: Cancel does not create a program
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Cancel
    Then the modal closes
    And the program list does not show "Web Development 2026"

  # Edge cases

  Scenario: Leading and trailing spaces are trimmed from the program name
    Given I am on the program creation form
    When I fill in Program Name with "  Web Development 2026  "
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026"

  Scenario: Program name with special characters is accepted
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026 (C++ & AI)"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026 (C++ & AI)"

  # Ambiguities and gaps
  # - Ticket ACs match DS-1 create-program ACs; uniqueness, max lengths, and RBAC are not in the embedded Gherkin.
  # - Live UI uses "+ New Program", dialog heading "New Program", labels "Program Name" / "Description", and "Create" (disabled until name is non-empty).
  # - Exact error copy for rejected creates is unspecified; scenarios assert observable UI state only.
