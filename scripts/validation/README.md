# Strategic Minds Independent Validator

This directory is the deterministic validator root for Strategic Insights.

## Authority

The validator may:
- read repository state;
- compare exact SHAs;
- run deterministic tests;
- create validation artifacts;
- return PASS / FAIL / BLOCKED.

The validator may not:
- modify implementation files;
- merge pull requests;
- deploy;
- change DNS;
- change secrets;
- change permissions;
- mutate production databases;
- publish externally;
- override failed checks.

## Trust model

The GitHub Actions job runs with read-only repository permissions. Its evidence is tied to the exact commit SHA.

A PASS means only that the checks encoded in this validator passed for that SHA. It does not authorize production release.

A missing, stale, unknown, or failed receipt is never a PASS.

## Validation order

1. exact SHA binding;
2. changed-file integrity;
3. changed-line ledger and secret-pattern screening;
4. lint;
5. typecheck;
6. build;
7. Domain Operations contract tests;
8. immutable workflow artifact.

## Root-of-trust bootstrap

The first workflow installation is a bootstrap operation. It is not considered product-code validation until the GitHub-hosted workflow has executed against its own installation SHA and produced a receipt. Product implementation remains blocked until that proof exists.
