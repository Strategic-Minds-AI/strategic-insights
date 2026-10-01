# Domain Operations — Independent Validation Contract

Date: 2026-10-01
Status: ACTIVE FOR THIS BRANCH

## Governing rule

The implementer may not certify its own work.

For autonomous code generation in this project, each accepted code line must have an independent line-ledger result before it is considered trusted. In addition, validation must occur at the smallest complete syntactic unit and then again at file, patch, workflow, integration, and release levels.

## Line Ledger

For every changed code line record:
- repository
- branch
- commit/patch identity
- file path
- line number or stable hunk anchor
- line hash
- implementer identity
- validator identity
- parser/type context
- result: PASS / FAIL / BLOCKED
- evidence
- timestamp

A line-level PASS does not replace file/build/integration validation.

## Mandatory validation mesh

1. Syntax/parser
2. Typecheck where applicable
3. Lint
4. Unit tests
5. Contract tests
6. Google API mocked tests
7. Idempotency tests
8. Retry/dead-letter tests
9. Permission/scope tests
10. Sitemap/robots/canonical tests
11. GA/GSC normalization tests
12. Golden-path integration test
13. Exact-SHA readback
14. Independent validator verdict
15. Rollback proof

## Fail-closed states

- missing evidence -> BLOCKED
- unknown connector permission -> BLOCKED
- unverified Google resource match -> BLOCKED
- implementer self-validation -> INVALID
- failed line ledger -> FAIL
- failed broader regression -> FAIL
- production change without approval -> BLOCKED

## Known regression cases to add first

- GA Admin properties.list without required filter must fail the test.
- GA Data totals must not be assumed unless requested/derived explicitly.
- Search Console avgPosition root-path regression.
- duplicate ADD_DOMAIN request must not duplicate state or Google resources.
- sitemap with redirected/noindex/noncanonical URLs must be rejected for submission until resolved.
- ordinary local-service URLs must never be sent to Google's restricted Indexing API.
