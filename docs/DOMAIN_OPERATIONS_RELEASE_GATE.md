# Strategic Insights Domain Operations Release Gate

## Canonical loop

ADD DOMAIN -> SAFE DISCOVERY -> DOMAIN EXECUTION -> INDEPENDENT VALIDATOR -> RECEIPT -> NEXT DUE ACTION.

Protected actions use a separate path:

REQUEST -> DOMAIN APPROVAL -> OPERATOR DECISION -> PROTECTED EXECUTOR -> INDEPENDENT PROTECTED VALIDATOR -> RECEIPT.

## Protected actions

Sitemap submission, Search Console property or ownership changes, GA4 creation, GTM changes, DNS verification writes, and production release are blocked unless an unexpired durable approval is present.

## Persistence

The target cloud scheduler is exactly one Vercel Cron at `*/5 * * * *` calling `/api/reconcile`. The endpoint fails closed until the Base44 reconcile URL, runtime credential, and Vercel cron secret are configured through provider-native secret storage.

The old Base44 scheduled Domain Heartbeat is removed in this release candidate to prevent dual schedulers. Do not merge/release until the Vercel heartbeat binding is ready.

## Local watchdog

JARVIS-COMMAND is a read-only watchdog and working mirror. It may check source SHA, preview/runtime health, receipt freshness, and local artifacts. It must never become production authority or contain plaintext production secrets.

## Release requirements

1. Governance regression PASS.
2. Application build PASS.
3. GitHub Actions PASS on the exact PR head SHA.
4. Preview heartbeat returns BLOCKED before secrets are bound and PASS after safe runtime binding.
5. One golden-path domain produces DomainExecution + DomainReceipt.
6. A protected-action request remains pending until explicit approval.
7. An approved protected action executes once, then produces ProtectedActionReceipt.
8. No production merge, environment-variable change, Vercel project provisioning, DNS change, or external Google mutation without scoped operator approval.
