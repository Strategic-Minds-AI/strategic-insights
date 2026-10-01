# Strategic Insights Domain Operations Release Gate

## Canonical loop

ADD DOMAIN -> SAFE DISCOVERY -> DOMAIN EXECUTION -> INDEPENDENT VALIDATOR -> RECEIPT -> NEXT DUE ACTION.

Protected actions use a separate path:

REQUEST -> DOMAIN APPROVAL -> OPERATOR DECISION -> PROTECTED EXECUTOR -> INDEPENDENT PROTECTED VALIDATOR -> RECEIPT.

## Protected actions

Sitemap submission, bulk or single Search Console property changes, GA4 property/stream creation and related configuration, GTM changes, DNS verification writes, and production release are blocked unless an unexpired durable approval is present.

## Persistence

The authoritative scheduler is the existing ZERO control-plane Vercel Cron at `*/5 * * * *` calling `/api/cron/auto-builder`. Strategic Insights is a managed child reconcile target; it must not declare its own Base44 or Vercel cron. The child target fails closed until a dedicated non-admin Base44 machine user is mapped to an active `RuntimePrincipal` with `DOMAIN_RUNTIME`, and ZERO has a provider-managed bearer-token binding for that identity.

The old Base44 scheduled Domain Heartbeat and the app-specific Vercel cron are removed to prevent a cron forest. Do not merge/release until the ZERO child-dispatch branch and binding are validated.

## Local watchdog

JARVIS-COMMAND is a read-only watchdog and working mirror. It may check source SHA, preview/runtime health, receipt freshness, and local artifacts. It must never become production authority or contain plaintext production secrets.

## Release requirements

1. Governance regression PASS.
2. Application build PASS.
3. GitHub Actions PASS on the exact PR head SHA.
4. Dedicated Base44 machine identity exists without reusing a personal admin credential.
5. `RuntimePrincipal` grants only `DOMAIN_RUNTIME`, is active, and has an expiry/revocation path.
6. Durable Base44 access-token lifetime/refresh behavior is independently verified.
7. ZERO managed-target preview returns BLOCKED before binding and PASS after safe runtime binding.
8. One golden-path domain produces DomainExecution + DomainReceipt.
9. A protected-action request remains pending until explicit approval.
10. An approved protected action executes once, then produces ProtectedActionReceipt.
11. No production merge, ZERO production release, environment-variable/secret change, permission escalation, DNS change, or external Google mutation without scoped operator approval.
