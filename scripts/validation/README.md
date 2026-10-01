# Strategic Minds Independent Validator v2

This validator is the deterministic code gate for Strategic Insights Domain Operations.

## Separation

The implementation agent may write only to an isolated branch. The validator executes in GitHub Actions with read-only repository permissions and binds evidence to the exact checked-out SHA.

The validator cannot merge, deploy, alter DNS, alter secrets, mutate production data, change Google permissions, spend money, publish, or override a failed check.

## Two gates

### Branch gate

Blocks new implementation when the exact SHA, changed-line integrity, changed-source syntax/lint, build, or Domain Operations governance/API contract fails.

### Release gate

Adds whole-repository lint, whole-repository typecheck, and high/critical dependency audit. Existing technical debt may therefore block release without preventing a validated repair branch from reducing that debt.

A release PASS still does not authorize production. Protected actions require explicit operator approval.

## Bootstrap rule

Validator installation is itself untrusted until GitHub executes the workflow against the installation SHA and emits a validation receipt. Missing or stale evidence is never PASS.
