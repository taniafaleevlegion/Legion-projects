Feature: Program name validation and duplicate prevention
  DS-3 — As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained.

  # Happy paths

  Scenario: Program name with special characters is accepted
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I fill in Description with "Artificial intelligence and informatics curriculum"
    And I click "Create"
    Then the program is created successfully
    And the program list shows "Informatique & IA - Niveau 2"
    And the program list shows "Artificial intelligence and informatics curriculum"

  # Negative

  Scenario: Program name with only whitespace is not submitted
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter "   " as the Program Name
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the form is not submitted
    And the "New Program" form stays open
    And the program list does not show "   "

  Scenario: Empty program name is not submitted
    Given I am logged in as an admin
    And I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then the form is not submitted
    And the "New Program" form stays open

  Scenario: Duplicate program name is rejected
    Given I am logged in as an admin
    And a program named "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "Web Development 2026" as the Program Name
    And I fill in Description with "Full-stack web development program"
    And I click "Create"
    Then I see an error indicating the name already exists
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
    And the "New Program" form stays open

  Scenario: Leading and trailing spaces are trimmed before the program is created
    Given I am logged in as an admin
    And I am on the program creation form
    When I enter "  Informatique & IA - Niveau 2  " as the Program Name
    And I fill in Description with "Artificial intelligence and informatics curriculum"
    And I click "Create"
    Then the program is created successfully
    And the program list shows "Informatique & IA - Niveau 2"
    And the program list does not show "  Informatique & IA - Niveau 2  "

  Scenario: A name that trims to an existing program name is rejected as a duplicate
    Given I am logged in as an admin
    And a program named "Web Development 2026" already exists
    And I am on the program creation form
    When I enter "  Web Development 2026  " as the Program Name
    And I fill in Description with "Alternate cohort description"
    And I click "Create"
    Then I see an error indicating the name already exists
    And the program list shows "Web Development 2026" once

  Scenario: Creating the special-character name a second time is rejected
    Given I am logged in as an admin
    And a program named "Informatique & IA - Niveau 2" already exists
    And I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I fill in Description with "Artificial intelligence and informatics curriculum"
    And I click "Create"
    Then I see an error indicating the name already exists
    And the program list shows "Informatique & IA - Niveau 2" once

  Scenario: Double-clicking Create creates the program only once
    Given I am logged in as an admin
    And I am on the program creation form
    And no program named "Informatique & IA - Niveau 2" exists
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I fill in Description with "Artificial intelligence and informatics curriculum"
    And I double-click "Create"
    Then the program list shows "Informatique & IA - Niveau 2" once

  # Ambiguities and gaps
  # - Duplicate AC says "an error indicating the name already exists" but not the exact copy, whether it is inline or a toast, or whether the New Program form stays open.
  # - Whitespace AC says the form is not submitted. It does not say an error is shown. DS-1 expects "Create" to be disabled when Program Name is empty, which may mean the click in these scenarios never fires.
  # - "Name is trimmed" is stated for a whitespace-only name. These scenarios also expect a valid name's leading and trailing spaces to be trimmed, and a trimmed collision to count as a duplicate. Internal double spaces and non-breaking spaces (U+00A0) are not defined.
  # - Case sensitivity is not defined for "Web Development 2026" versus "web development 2026" or "WEB DEVELOPMENT 2026".
  # - Uniqueness scope is not defined (organization, tenant, or global). No organization is named.
  # - "Other required fields" is not listed. The creation form's other field is Description, and DS-1 allows Description to be empty. These scenarios fill Description with a concrete value.
  # - Maximum and minimum Program Name length are not in DS-3. DS-1 scenarios use a 100-character maximum and accept a one-character name.
  # - Allowed characters beyond "Informatique & IA - Niveau 2" (quotes, slashes, emoji, control characters) are not listed. Unicode normalization (accents, NFC/NFD) is not defined.
  # - The duplicate rule is specified for create only. Edit, delete-then-reuse, and two in-flight creates are not specified. The double-click scenario states the integrity outcome only.
  # - "Created successfully" does not name a toast or redirect. These scenarios check the program list, consistent with DS-1.
