Feature: Valeria - Edit existing program details
  DS-257 — As an admin user, I want to edit an existing program's details so that I can correct or update program information after creation.

  # Happy paths

  Scenario: Open program for editing
    Given I am logged in as an admin
    And I am on the Programs page
    And a program "Web Development 2026" exists
    When I click the edit icon on "Web Development 2026"
    Then I see the "Edit Program" form
    And the Program Name field is pre-populated with "Web Development 2026"
    And the Description field is pre-populated with the program's current description

  Scenario: Successfully edit a program name
    Given I am logged in as an admin
    And I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Updated"
    And I click "Save"
    Then the modal closes
    And the program list immediately shows "Web Development 2026 - Updated"
    And the program list does not show "Web Development 2026"

  Scenario: Edit preserves unchanged fields
    Given I am logged in as an admin
    And I am editing a program named "Cybersecurity 2026"
    When I only change the Description to "Introductory security track — includes labs and capstone"
    And I click "Save"
    Then the modal closes
    And the Program Name remains "Cybersecurity 2026"
    And reopening edit shows the updated Description

  # Negative

  Scenario: Cancel discards edit changes
    Given I am logged in as an admin
    And I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 - Discarded"
    And I click "Cancel"
    Then the modal closes
    And the program list still shows "Web Development 2026"
    And the program list does not show "Web Development 2026 - Discarded"

  Scenario: Empty program name keeps Save disabled
    Given I am logged in as an admin
    And I am editing "Web Development 2026"
    When I clear the Program Name field
    Then the "Save" button is disabled
    And the "Edit Program" modal stays open

  # Edge cases

  Scenario: Edit program name with special characters
    Given I am logged in as an admin
    And I am editing "Web Development 2026"
    When I change the Name to "Web Development 2026 (C++ & AI)"
    And I click "Save"
    Then the modal closes
    And the program list shows "Web Development 2026 (C++ & AI)"

  Scenario: Description-only edit leaves list name unchanged
    Given I am logged in as an admin
    And a program "Data Science 2026" exists with description "Original description"
    When I edit only the Description to "Updated cohort description"
    And I click "Save"
    Then the program list still shows "Data Science 2026"
    And reopening edit shows Description "Updated cohort description"

  # Ambiguities and gaps
  # - Confirmed on https://test.didaxis.studio (admin, Programs, 2026-11-05).
  # - Locators: row action "Edit <name>"; dialog heading "Edit Program"; labels "Program Name *", "Description"; buttons "Cancel" and "Save".
  # - Edit dialog also exposes AI Generation Config fields (Total Program Hours, Default Session Hours, Default Exam Hours, Target Audience, Focus Areas). DS-257 ACs only cover Name and Description.
  # - Exact behaviour when Program Name is cleared on edit is not in the ticket; assert Save stays disabled or the rename does not persist.
  # - Duplicate-name behaviour on edit is covered by validation tickets (e.g. DS-258 / DS-249), not this story.
  # - Tests must create their own programs with unique Date.now() names and trackProgram for cleanup; do not rely on shared tenant seed data.
