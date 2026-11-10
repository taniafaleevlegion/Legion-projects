---
name: exploratory-charter
description: >
  Turns a feature and a risk the human names into an exploratory charter
  and an empty findings template. Use when the user asks for an exploratory
  charter, a test charter, a session charter, or a findings template from a
  feature and a risk. The human explores; this skill only keeps the format.
  Do not use it to invent tests, crawl the UI, write Gherkin, or file bugs.
---

# Exploratory charter

Think the new Skill — exploratory-charter: a tiny procedure that turns a feature + a risk into a charter and a findings template. The thinking is human; the skill just keeps the format.

## Procedure

1. Take the feature and the risk from the user. If either is missing, ask for that one. Do not invent it.
2. Fill the charter below. The mission restates the feature and the risk. Leave every other line blank.
3. Hand back the findings template with no rows filled in.
4. Stop. Do not suggest what to try, crawl the app, write scenarios, or file a bug.

## Charter

```markdown
# Charter

Feature: <feature>
Risk: <risk>
Mission: Explore <feature> for problems related to <risk>.
Timebox:
Tester:
Date:
Setup:
```

## Findings

```markdown
# Findings

Charter: Explore <feature> for problems related to <risk>.

| # | Type | What I saw | Evidence |
|---|------|------------|----------|
|   |      |            |          |
```

Type is one of: bug, question, idea, note. The human writes the rows.
