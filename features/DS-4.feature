Feature: Delete program with confirmation
  DS-4 — As an admin user, I want to delete a program I no longer need, with a confirmation step to prevent accidental deletion.

  # Happy paths

  Scenario: Delete program with confirmation
    Given I am logged in as an admin
    And a program "Test Program" exists on the Programs page
    When I click the delete icon for "Test Program"
    Then I see a native browser confirmation dialog
    And the confirmation message references "Test Program"
    When I confirm deletion
    Then "Test Program" is removed from the program list without a manual page refresh

  Scenario: Cancel program deletion
    Given I am logged in as an admin
    And a program "Web Development 2026" exists on the Programs page
    When I click the delete icon for "Web Development 2026"
    And I see the confirmation dialog
    And I dismiss the confirmation (Cancel)
    Then "Web Development 2026" still appears in the program list

  Scenario: Deleted program stays gone after reload
    Given I am logged in as an admin
    And a program "Test Program" exists on the Programs page
    When I delete "Test Program" and confirm
    And I reload the Programs page
    Then "Test Program" does not appear in the program list

  Scenario: Deleting one program leaves other programs in the list
    Given I am logged in as an admin
    And programs "Test Program", "Data Science 2026", and "Cloud Engineering 2026" exist on the Programs page
    When I delete "Test Program" and confirm
    Then "Test Program" is not in the program list
    And "Data Science 2026" is still in the program list
    And "Cloud Engineering 2026" is still in the program list

  # Negative

  Scenario: Program is not removed when deletion is not confirmed
    Given I am logged in as an admin
    And a program "Test Program" exists on the Programs page
    When I click the delete icon for "Test Program"
    And I dismiss the confirmation dialog
    Then "Test Program" remains in the program list
    And the row count on the Programs page is unchanged

  Scenario: Dismiss confirmation does not show deletion success
    Given I am logged in as an admin
    And a program "Data Analytics 2026" exists on the Programs page
    When I click the delete icon for "Data Analytics 2026"
    And I dismiss the confirmation dialog
    Then "Data Analytics 2026" remains in the program list
    And no "deleted successfully" message is shown

  Scenario: Unauthenticated user cannot reach program delete actions
    Given I am not signed in
    When I navigate to the Programs page
    Then I am redirected to the login page
    And I see the Sign In button

  Scenario: Confirming deletion removes only the targeted program
    Given I am logged in as an admin
    And programs "Program Alpha" and "Program Beta" exist on the Programs page
    When I delete "Program Alpha" and confirm
    Then "Program Alpha" is not in the program list
    And "Program Beta" is still in the program list

  # Edge cases

  Scenario: Delete program whose name contains special characters and Unicode
    Given I am logged in as an admin
    And a program "Informatique & IA — Niveau 2 ( été )" exists on the Programs page
    When I delete that program and confirm
    Then it is removed from the program list

  Scenario: Delete the correct row when two programs have similar names
    Given I am logged in as an admin
    And programs "Test Program" and "Test Program (Archive)" exist on the Programs page
    When I delete "Test Program" and confirm
    Then "Test Program" is not in the program list
    And "Test Program (Archive)" is still in the program list

  Scenario: Rapid double-click on delete opens at most one confirmation flow
    Given I am logged in as an admin
    And a program "Test Program" exists on the Programs page
    When I double-click the delete icon for "Test Program"
    Then at most one confirmation dialog is shown
    And "Test Program" remains in the program list if I dismiss confirmation

  Scenario: No undo is offered after confirmed deletion
    Given I am logged in as an admin
    And a program "No Undo Program" exists on the Programs page
    When I delete "No Undo Program" and confirm
    Then "No Undo Program" is not in the program list
    And no Undo control is shown

  # Ambiguities and gaps
  # - Confirmation is a native browser confirm dialog, not an in-app Mantine modal. Copy includes semesters/courses warning and "This cannot be undone."
  # - Exact OK/Cancel button labels are browser-controlled; tests use accept/dismiss on the native dialog.
  # - Role permissions (editor/viewer delete access) are not specified in DS-4 ACs; only admin flows are covered here.
  # - Whether delete is available from empty state or only from populated list rows is not specified.
  # - Double-click delete behavior (one vs two dialogs) is not specified; observed behavior allows one or two dialog events.
