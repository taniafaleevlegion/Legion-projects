---
name: programs-api-edges
description: >-
  Mocks the Didaxis programs API with page.route for deterministic
  list and save edge cases. Use when generating or reviewing Playwright
  tests for programs empty state, save failures, malformed payloads, or
  HTTP error statuses — even if the user does not say "mock".
---

# Programs API edge cases

Harden programs-flow edge cases with `page.route` on `/api/programs`. Each case is its own test. Drive the UI through `ProgramsPage`, `NewProgramModal`, and `EditProgramModal`.

Before writing the assertions, open the real page (use agent-browser / PW MCP) and read the actual error and empty-state copy the app renders — do not invent strings. If the app renders nothing for a case, say so instead of guessing.

Never mock the endpoint the test is actually verifying.

Route all interactions through the existing POMs. One tag per test.

Fulfill only the method that case needs (`GET` list, `POST` create, `PATCH` edit). Let every other method through with `route.continue()`. A test that checks create, edit, or delete really happened must not fulfill that write. A mocked case creates no program, so do not call `trackProgram`.

## Cases

| Status | Request | Assert |
|--------|---------|--------|
| 503 | save (`POST` or `PATCH`) | the UI's error state |
| 200 | `GET` list, body `[]` | the empty-state message |
| 200 | `GET` list, malformed body (invalid JSON, or a JSON object instead of an array) | the app doesn't crash |
| 401 | `GET` list, or save | the UI's error state |
| 403 | `GET` list, or save | the UI's error state |
| 404 | `GET` `/api/programs/<uuid>`, or save | the UI's error state |
| 500 | save | the UI's error state |
| 501 | save | the UI's error state |
| 502 | `GET` list, or save | the UI's error state |
| 300 | `GET` list, or save | the app doesn't crash |

Use the copy you read from the live page for every error and empty-state assertion. If that case renders nothing, record that and do not invent a string.

```ts
await page.route('**/api/programs', async (route) => {
  if (route.request().method() !== 'POST') {
    await route.continue();
    return;
  }
  await route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Service Unavailable' }),
  });
});
// Then act through the POM and assert the copy read from the live UI.
```
