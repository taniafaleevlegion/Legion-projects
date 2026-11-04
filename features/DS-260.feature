Feature: Program list filtering and display
  DS-260 — As an admin user, I want to see all programs in a clear list so that I can quickly find and manage them.

  # Happy paths

  Scenario: Display program list with key details
    Given I am logged in as an admin
    And programs exist in the system
    When I navigate to the Programs page
    Then I see a list showing each program's name and description

  Scenario: Empty state when no programs exist
    Given I am logged in as an admin
    And no programs exist
    When I navigate to the Programs page
    Then I see a message indicating no programs have been created
    And I see a prompt to create the first program

  # Negative

  Scenario: Unauthenticated user cannot view the program list
    Given I am not signed in
    When I navigate to the Programs page
    Then I am redirected to the login page
    And I see the Sign In button

  # Edge cases

  Scenario: Program with empty description still shows its name in the list
    Given I am logged in as an admin
    And a program named "Web Development 2026" exists with an empty description
    When I navigate to the Programs page
    Then I see "Web Development 2026" in the program list

  Scenario: Multiple programs each show their own name and description
    Given I am logged in as an admin
    And programs "Web Development 2026" with description "Full-stack web curriculum" and "Data Science 2026" with description "Statistics and ML foundations" exist
    When I navigate to the Programs page
    Then the row for "Web Development 2026" shows "Full-stack web curriculum"
    And the row for "Data Science 2026" shows "Statistics and ML foundations"

  Scenario: Empty list via mocked GET [] shows empty-state copy and create prompt
    Given I am logged in as an admin
    And GET /api/programs is fulfilled with an empty array
    When I navigate to the Programs page
    Then I see a message indicating no programs have been created
    And I see a prompt to create the first program

  # Ambiguities and gaps
  # - Confirmed on https://test.didaxis.studio (admin, Programs, 2026-11-04).
  # - List is a table under main; columnheader "Program"; each data row shows name (paragraph) and optional description (paragraph); actions "Edit <name>" / "Delete <name>".
  # - Heading "Programs" (level 2); subtitle "Manage academic programs and semesters"; primary CTA "+ New Program".
  # - Shared tenant is never empty; empty-state scenario must use page.route to fulfill GET /api/programs with [] (see programs-api-edges). Match empty-state copy from live UI / ProgramsPage.emptyStateMessage pattern.
  # - Ticket title mentions "filtering" but ACs only cover list display and empty state — no filter/search control scenarios unless observed on the page.
  # - Uniquify created names; trackProgram for cleanup.
