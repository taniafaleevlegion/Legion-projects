# Explore: Dashboard
# Chosen flow: From the Dashboard, open Programs through the Programs card.
# Why this one: The sidebar Dashboard button is the way onto this page, and the Programs card is the first action and the only one that shows live program data. Nothing in tests/ asserts it. If the card fails, the admin can see a count and still cannot reach the program list from the page built for that.
# Already covered: create, edit, name validation, delete, list, and Programs accessibility, all by opening /programs directly.
# Left for later: Calendar card and the Calendar program/semester picker; Validation card and disabled Re-validate; AI Assist card; Export formats JSON, CSV, PDF, and Excel with Export disabled; Settings visible days, password, and users; Sign out.

Feature: Dashboard — open Programs from the Programs card

  # Positive path

  Scenario: Programs card opens the Programs page
    Given I am logged in as an admin
    And I click "📊 Dashboard"
    Then the URL is "/"
    And I see the heading "Dashboard"
    And I see "Welcome to Didaxis Studio"
    And I see "Manage academic programs"
    And the Programs card shows a numeric count
    When I click "Manage academic programs"
    Then the URL is "/programs"
    And I see the heading "Programs"
    And I see the button "+ New Program"

  # Edge case

  Scenario: /dashboard does not show the Dashboard Programs card
    Given I am logged in as an admin
    When I open "/dashboard" directly
    Then the URL is "/dashboard"
    And I do not see the heading "Dashboard"
    And I do not see "Manage academic programs"
