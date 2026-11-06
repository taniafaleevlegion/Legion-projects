Feature: Mark - Program list filtering and display
  DS-294 — As an admin user, I want to see all programs in a clear list so that I can quickly find and manage them.

  # Happy paths

  Scenario: Display program list with key details
    Given I am logged in as an admin
    And a program named "Web Development 2026" with description "Full-stack web development program" exists
    When I navigate to the Programs page
    Then I see the heading "Programs"
    And the program row for "Web Development 2026" shows "Full-stack web development program"

  Scenario: Several programs each show name and description
    Given I am logged in as an admin
    And these programs exist:
      | name                 | description                                      |
      | Web Development 2026 | Full-stack web curriculum for 2026 cohort        |
      | Data Science 2026    | Statistics, Python, and machine learning foundations |
      | Cybersecurity 2026   | Network security and incident response track     |
    When I navigate to the Programs page
    Then each program row shows that program's name and description

  Scenario: Empty state when no programs exist
    Given I am logged in as an admin
    And the programs list API returns `{ "data": [] }`
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And I see the "Create Program" button
    And I see the "+ New Program" button

  Scenario: Create Program on the empty page opens the form
    Given I am logged in as an admin
    And the programs list API returns `{ "data": [] }`
    And I am on the Programs page
    When I click "Create Program"
    Then I see the "New Program" dialog
    And the dialog has a "Program Name" field
    And the dialog has a "Description" field

  Scenario: Program list remains accurate after reload
    Given I am logged in as an admin
    And a program named "Cloud Engineering 2026" with description "Cloud-native architecture and DevOps" exists
    When I reload the Programs page
    Then the row for "Cloud Engineering 2026" still shows "Cloud-native architecture and DevOps"

  # Negative

  Scenario: Populated list must not show the empty-state message
    Given I am logged in as an admin
    And a program named "Web Development 2026" with description "Listed program with description" exists
    When I view the Programs page
    Then I see the row for "Web Development 2026"
    And I do not see "No programs yet. Create your first program to get started."

  Scenario: Unauthenticated user must not see the admin program list
    Given I am not logged in
    When I navigate to the Programs page
    Then I am taken to the login page
    And I see "Sign In"
    And I do not see the "Programs" heading

  Scenario: Deleted program must not remain in the list
    Given I am logged in as an admin
    And a program named "Test Program" with description "To be removed from list display" exists
    When I delete "Test Program" and confirm
    Then the Programs page does not show "Test Program"
    And the Programs page does not show "To be removed from list display"

  Scenario: Programs list error responses show the empty-state copy
    Given I am logged in as an admin
    And GET /api/programs returns 401, 403, 404, 500, 501, or 502
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."
    And I do not see a separate error message such as "Unauthorized" or "Internal Server Error"

  # Edge cases

  Scenario: Special characters in name and description render in the list
    Given I am logged in as an admin
    And a program named "Informatique & IA - Niveau 2" with description "Track A/B: C++ & Python (2026)" exists
    When I view the Programs page
    Then that row shows "Informatique & IA - Niveau 2" and "Track A/B: C++ & Python (2026)"

  Scenario: Unicode and accented characters display in the list
    Given I am logged in as an admin
    And a program named "Programme Été 2026" with description "Cursus français — débutant" exists
    When I view the Programs page
    Then that row shows "Programme Été 2026" and "Cursus français — débutant"

  Scenario: HTML-like description is shown as text
    Given I am logged in as an admin
    And a program named "Security Awareness 2026" with description "<script>alert('x')</script> & <b>Bold</b>" exists
    When I view the Programs page
    Then that row shows the description as text
    And no alert dialog runs

  Scenario: A program with an empty description still shows its name
    Given I am logged in as an admin
    And a program named "Data Science 2026" was created with an empty description
    When I view the Programs page
    Then I see "Data Science 2026"
    And that row does not show a fabricated description

  Scenario: Similar program names stay distinguishable
    Given I am logged in as an admin
    And "Web Development 2026" with description "2026 full-stack curriculum track" exists
    And "Web Development 2027" with description "2027 full-stack curriculum track" exists
    When I view the Programs page
    Then both rows are visible with their own descriptions

  Scenario: Empty list body that is a bare array does not invent an error string
    Given I am logged in as an admin
    And GET /api/programs returns HTTP 200 with body `[]`
    When I navigate to the Programs page
    Then the Programs heading is not rendered
    And the page does not show an invented error message

  Scenario: Malformed programs list JSON does not invent an error string
    Given I am logged in as an admin
    And GET /api/programs returns HTTP 200 with body `{`
    When I navigate to the Programs page
    Then the Programs heading is not rendered
    And the page does not show an invented error message

  Scenario: A JSON object instead of a program array does not invent an error string
    Given I am logged in as an admin
    And GET /api/programs returns HTTP 200 with body `{ "data": { "name": "Web Development 2026" } }`
    When I navigate to the Programs page
    Then the Programs heading is not rendered
    And the page does not show an invented error message

  Scenario: Redirect status on the programs list does not invent an error string
    Given I am logged in as an admin
    And GET /api/programs returns HTTP 300
    When I navigate to the Programs page
    Then I see "No programs yet. Create your first program to get started."

  Scenario: Keyboard opens New Program from the Programs page
    Given I am logged in as an admin
    And I am on the Programs page
    When I tab to "+ New Program"
    And I press Enter
    Then the "New Program" dialog is open

  Scenario: Programs page meets WCAG 2 A and 2 AA
    Given I am logged in as an admin
    And I am on the Programs page
    When the page is scanned for WCAG 2 A and 2 AA
    Then there are no accessibility violations

  # Ambiguities and gaps
  # - The summary says "filtering and display", but the acceptance criteria only cover list display and the empty state. The live Programs page (2026-11-06) has a heading "Programs", subtitle "Manage academic programs and semesters", "+ New Program", and a table whose header is "Program". There is no search box, filter, or sort control.
  # - Live rows show the program name, the description when one was saved, and buttons "Edit <name>" and "Delete <name>". A program created with an empty description shows the name only.
  # - GET /api/programs returns `{ "data": [ { id, name, description, ... } ] }`. `{ "data": [] }` renders "No programs yet. Create your first program to get started." plus a "Create Program" button, which opens the "New Program" dialog.
  # - GET 401, 403, 500, and 502 render that same empty-state copy. The UI does not show "Unauthorized" or "Internal Server Error".
  # - GET 200 with `[]`, invalid JSON `{`, or `{ "data": { ... } }` throws TypeError reading `length` and renders a blank page. No error string is shown. These scenarios record that blank page instead of inventing copy.
  # - The shared tenant already has thousands of programs, so the empty state cannot be reached without mocking GET /api/programs. Happy-path display still uses real creates.
  # - "Quickly find" is not defined. No filter behavior is specified, so none is asserted.
  # - How much of a long description is visible as a preview is not specified.
