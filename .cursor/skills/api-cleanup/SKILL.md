---
name: api-cleanup
description: Ensures Playwright tests clean up the data they create.
  Use whenever generating or reviewing tests that create programs (or
  any persistent records) in Didaxis, so test data does not accumulate.
  Apply this to every test that creates data — even if cleanup isn't
  explicitly requested.
---

# API Cleanup for Test Data

Tests that create data must remove it. Leftover data slows the app and
makes test runs unreliable. Every test that creates a program must track
its UUID and delete it via the API afterwards.

## Steps

1. Use the shared cleanup fixture in `fixtures/cleanup.fixture.ts`.
   Import `test` from there, not from `@playwright/test`.
2. When a test creates a program, capture the program's UUID and call
   `trackProgram(uuid)` immediately.
3. Do not write manual `afterAll` blocks for cleanup — the fixture
   handles teardown for every test that uses it.
4. Cleanup uses the DELETE API, not the UI:
   `DELETE /api/programs/<uuid>` with a Bearer token from
   `process.env.DIDAXIS_API_TOKEN`.
5. Never hardcode the token. Never delete data the test did not create.

## Reference

- Endpoint: DELETE https://test.didaxis.studio/api/programs/<uuid>
- Auth: Authorization: Bearer ${DIDAXIS_API_TOKEN}

### Expired token

If DELETE returns 401/403, the env token is stale. After a successful UI login in the same test run, capture a fresh Bearer token from network traffic (e.g. any authenticated `fetch`/XHR to `test.didaxis.studio` with an `Authorization: Bearer …` header) and use that for cleanup only. Prefer fixing `DIDAXIS_API_TOKEN` in CI/local env long term; do not commit tokens.
