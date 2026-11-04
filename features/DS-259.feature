Feature: Delete program with confirmation
  DS-259 — As an admin user, I want to delete a program I no longer need, with a confirmation step to prevent accidental deletion.

  # Happy paths

  Scenario: Delete program with confirmation
    Given I am logged in as an admin
    And a program "Test Program" exists on the Programs page
    When I click the delete icon for "Test Program"
    Then I see a confirmation dialog
    When I confirm deletion
    Then "Test Program" is removed from the program list

  Scenario: Cancel program deletion
    Given I am logged in as an admin
    And a program "Web Development 2026" exists on the Programs page
    When I click the delete icon for "Web Development 2026"
    And I see the confirmation dialog
    And I click Cancel
    Then "Web Development 2026" still appears in the program list

  # Negative

  Scenario: Program is not removed when deletion is not confirmed
    Given I am logged in as an admin
    And a program "Test Program" exists on the Programs page
    When I click the delete icon for "Test Program"
    And I dismiss the confirmation dialog
    Then "Test Program" remains in the program list

  Scenario: Unauthenticated user cannot reach program delete actions
    Given I am not signed in
    When I navigate to the Programs page
    Then I am redirected to the login page
    And I see the Sign In button

  # Edge cases

  Scenario: Deleting one program leaves other programs in the list
    Given I am logged in as an admin
    And programs "Test Program" and "Data Science 2026" exist on the Programs page
    When I delete "Test Program" and confirm
    Then "Test Program" is not in the program list
    And "Data Science 2026" is still in the program list

  Scenario: Deleted program stays gone after reload
    Given I am logged in as an admin
    And a program "Test Program" exists on the Programs page
    When I delete "Test Program" and confirm
    And I reload the Programs page
    Then "Test Program" does not appear in the program list

  # Ambiguities and gaps
  # - Confirmed on https://test.didaxis.studio (admin, Programs, 2026-11-04).
  # - Delete control accessible name is "Delete <program name>" on the program row.
  # - Confirmation is a native browser confirm dialog (not an in-app Mantine modal). Tests use page dialog accept/dismiss.
  # - Confirmation message references the program name and warns deletion cannot be undone.
  # - DS-4 previously marked confirmed-delete removal as a known failure in some runs; re-verify against live app. Assert the AC.
  # - Uniquify program names; trackProgram for any created rows; do not delete programs the test did not create.
