# Strategic Insights — Domain Operations Control Plane

Canonical intake: `ADD DOMAIN: example.com`.

Deterministic loop: DomainRegistry -> due DomainAction -> safe executor -> independent Domain Validator -> DomainReceipt -> next due action.

One Vercel heartbeat should wake the system every five minutes at `/api/reconcile`. The heartbeat is not the queue; durable truth lives in the registry, action queue, metrics, index history, competitor history, and receipts.

Safe automatic classes: READ, DRAFT, BRANCH_WRITE, PREVIEW_WRITE.

Approval-gated classes: EXTERNAL_WRITE and PROTECTED. This includes Search Console property changes or sitemap submission, site-verification/DNS writes, GA4 provisioning, GTM publishing, production releases, secrets, spend, destructive actions, and public/customer actions.

Every execution must enter VALIDATING. Only an independent validator can emit PASS, FAIL, BLOCKED, or UNKNOWN and create the durable receipt. Implementers never self-certify.

Existing Strategic Insights analytics/CRM features are preserved and reused. The current Google Search Console and Google Analytics connector scopes remain read-only until an explicit permission-expansion approval and re-consent step.

Evolution is DRAFT_ONLY: the system may propose tests, routes, repair signatures, and branch-safe improvements, but cannot change governance, permissions, secrets, or approval policy autonomously.
