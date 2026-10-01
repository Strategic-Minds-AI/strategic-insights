# Strategic Insights Domain Operations — Build Packet

Date: 2026-10-01
Status: BRANCH-ONLY / IMPLEMENTATION-READY AFTER VALIDATOR BOOTSTRAP
Canonical repo: Strategic-Minds-AI/strategic-insights
Branch: feature/domain-operations-control-plane-20261001
Production mutation: NONE

## Mission

Turn Strategic Insights into the single multi-domain Google lifecycle and growth control plane.

Operator input:

```
ADD DOMAIN: example.com
```

Target lifecycle:

REGISTER -> DISCOVER -> VERIFY -> CONNECT -> MEASURE -> CRAWL -> INDEX-HEALTH -> COMPETITOR-INTELLIGENCE -> DIAGNOSE -> QUEUE -> SAFE-REPAIR -> INDEPENDENT-VALIDATE -> RECEIPT -> RECONCILE

## Source Truth

1. Strategic Insights is the implementation home.
2. Digital Dominance remains the donor SEO/AEO/GEO intelligence and execution engine.
3. GitHub is code/config authority.
4. Supabase/Base44 entities hold operational state until a canonical runtime store is explicitly selected.
5. Google Drive is durable human-readable business/source documentation.
6. The system uses one scheduler heartbeat. No cron forest.
7. Implementer does not certify itself.
8. Production, DNS, secrets, permissions, billing/spend, destructive operations, and live publishing remain approval-gated.

## Verified Existing Strategic Insights Capabilities

- Existing `strategic_scan` function.
- Existing Google Analytics connector.
- Existing Google Search Console connector.
- Existing Google Sheets, Drive, Supabase, and GitHub connector surfaces.
- Existing `Business`, `AnalyticsSnapshot`, and `Gap` entities.
- Existing MCP tool surface for strategic scan and connected data sources.
- Existing automatic domain matching between GA and Search Console.

## Critical Pre-Build Defects

### D1 — GA property discovery is not contract-valid

Current code calls:

`GET https://analyticsadmin.googleapis.com/v1beta/properties?pageSize=100`

Google's current `properties.list` contract requires a `filter` such as `parent:accounts/{id}` or `ancestor:accounts/{id}`.

Repair:
- list accessible accounts/account summaries first;
- enumerate properties per accessible account with the required filter;
- paginate deterministically;
- dedupe by property resource name.

### D2 — GA totals are read without requesting totals

Current code reads `data.totals` from `runReport`, but the request does not request metric aggregation totals.

Repair:
- add `metricAggregations: ["TOTAL"]`; or
- deterministically aggregate rows when appropriate and record the aggregation method.

### D3 — Search Console fallback ranking path is incorrect

Current fallback checks `scData.metrics.avgPosition`, while `scQuery()` returns `avgPosition` at the root.

Repair:
- use `scData.avgPosition`;
- add a regression test for positions 11-20 and >20.

### D4 — Current Google scopes are read-only

Current connectors use:
- Analytics: `analytics.readonly`
- Search Console: `webmasters.readonly`

Those scopes support observation but not full lifecycle provisioning.

Required split:
- READ PLANE: current read-only connectors.
- WRITE PLANE: separately governed Google lifecycle adapter with minimum required write scopes and protected-action policy.

The write plane must never silently inherit broader permissions from the read plane.

## Canonical Domain Registry

Additive model: `DomainRegistry`

Required fields:

- id
- domain
- canonical_url
- lifecycle_state
- business_id
- owner_identity
- dns_provider
- dns_verification_state
- repository_full_name
- deployment_provider
- deployment_project
- production_url
- ga_account_id
- ga_property_id
- ga_stream_id
- ga_measurement_id_ref
- search_console_property
- search_console_permission_level
- sitemap_urls
- robots_url
- index_health_state
- competitor_set_version
- target_geography
- target_services
- target_query_set_version
- last_google_sync_at
- last_competitor_scan_at
- last_validation_at
- next_due_at
- last_receipt_id
- status
- created_at
- updated_at

Never store secret values in this entity.

## Additive Models

### GoogleConnectionBinding
Maps domain -> GA/GSC/GTM/Site Verification resources and permission state.

### SitemapRecord
Tracks sitemap URL, discovery state, validation result, submitted state, last readback, URL counts, and errors.

### IndexInspectionRecord
URL-level index evidence with source timestamp, coverage state, canonical state, robots/noindex state, and next action.

### SearchConsoleDaily
One-day extraction by domain/page/query/device/country as bounded normalized rows.

### GA4Daily
Daily property/domain metrics with dimensions, source timestamp, and data-quality flags.

### CompetitorRecord
Domain-scoped competitor identity with evidence, discovery source, relevance reason, and active/inactive state.

### CompetitorSnapshot
Public-only competitor observations. Never claim access to competitor private analytics.

### DomainIssue
Deterministic issue model with severity, category, source evidence, repair class, approval requirement, and status.

### DomainAction
Queued action with idempotency key, eligibility, lease, retry count, approval class, validator state, and rollback pointer.

### DomainReceipt
Immutable execution/validation evidence.

## Google Lifecycle Workers

### domain_intake
Normalize domain, reject malformed input, discover existing Business/GA/GSC records, create registry row idempotently.

### ga_discovery
Enumerate accessible GA accounts/properties correctly and bind exact domain evidence.

### ga_provision
Protected write worker. Create/attach property and stream only when authorized. Never duplicate a matching existing property.

### gsc_discovery
List accessible Search Console properties and bind exact domain/URL-prefix evidence.

### site_verification
Protected write worker. Generate verification method/token and prepare DNS or supported verification action. DNS mutation remains protected.

### sitemap_audit
Discover sitemap(s), validate XML/HTTP/canonicals/noindex/robots conflicts, compare against crawlable canonical set.

### sitemap_submit
Protected Google write. Submit only validated sitemap URLs to a verified property.

### url_inspection
Bounded URL Inspection jobs prioritized by new/changed/high-value URLs and failures.

### analytics_ingest
Daily bounded extraction from GA4 + GSC into normalized historical rows.

### competitor_discovery
Discover actual SERP/public-web competitors by geography/service/query; preserve evidence and timestamp.

### competitor_scan
Collect public site structure, metadata, content patterns, schema, offers/pricing where public, performance, and change deltas.

### diagnosis
Rule-first deterministic diagnosis. AI may enrich or prioritize, but raw evidence and deterministic rules remain available when AI budget is zero.

### action_router
Classify SAFE_AUTOMATIC vs PROTECTED_APPROVAL_REQUIRED.

### validator
Independent readback and verification. Implementer output cannot self-pass.

## 5-Minute Reconciler

One heartbeat only:

```
Vercel Cron */5
  -> /api/reconcile
  -> read due DomainAction / DomainRegistry rows
  -> acquire leases
  -> dispatch bounded workers
  -> persist evidence
  -> validator
  -> receipt
  -> compute next_due_at
```

Suggested due classes:
- 5 min: urgent failures / unhealthy connectors / incomplete onboarding
- hourly: new-domain onboarding and retries
- daily: GA4, GSC, sitemap/index deltas, anomaly scan
- weekly: deep competitor crawl and technical audit
- monthly: strategy recalculation and stale-binding audit

## Deterministic Intake Contract

Input:

```json
{"command":"ADD_DOMAIN","domain":"example.com"}
```

Expected output:

```json
{
  "domain":"example.com",
  "registry_state":"REGISTERED",
  "google_bindings":"PENDING_OR_VERIFIED",
  "sitemap_state":"UNKNOWN_OR_VALIDATED",
  "index_state":"UNKNOWN_OR_BASELINED",
  "competitor_state":"QUEUED_OR_COMPLETE",
  "next_action":"...",
  "approval_required":false,
  "receipt_id":"..."
}
```

## Action Classes

SAFE_AUTOMATIC:
- read APIs
- crawl public pages
- analyze GA/GSC data
- validate sitemap/robots/canonicals
- create branch/draft repair
- run tests
- queue work
- produce reports/receipts

PROTECTED_APPROVAL_REQUIRED:
- DNS changes
- production deploy/cutover
- production database/schema/RLS mutation
- Google permission escalation
- write-scope OAuth authorization
- GTM production publishing
- secret creation/replacement/rotation
- paid provisioning/spend
- destructive operations
- public/customer messaging

## Digital Dominance Reuse Contract

Strategic Insights owns:
- canonical domain registry
- connector health
- Google resource bindings
- analytics history
- lifecycle state
- action queue
- approval queue
- receipts
- operator UI

Digital Dominance donates:
- SEO/AEO/GEO analysis
- recognition-first opportunity logic
- competitor research patterns
- technical SEO checks
- content/keyword opportunity scoring
- indexing/sitemap validation methods

Do not fork a second copy of Digital Dominance logic unless a documented extraction contract requires it.

## Frontend

Add a Domain Operations surface with:
- Add Domain command/input
- onboarding state machine
- Google connection state
- GA/GSC/sitemap/index status
- competitor set
- KPI deltas
- open issues
- proposed actions
- approval-required actions
- validation receipts
- next scheduled run

No production UI release until preview validation passes.

## Backend

Required handler families:
- domain lifecycle API
- Google discovery adapters
- Google write adapters
- crawl/sitemap/index workers
- ingestion workers
- competitor workers
- action router
- validator
- receipts
- reconciler

Every mutating worker requires:
- idempotency key
- explicit action class
- lease
- retry policy
- durable receipt
- rollback metadata where applicable

## Supabase / Runtime State

Before any production schema mutation:
1. inspect current project/table authority;
2. determine whether Base44 entity state or Supabase is canonical for Domain Operations;
3. create migration only in sandbox/branch;
4. validate RLS separately;
5. require explicit production migration approval.

## AI Gateway

AI is enrichment, not source truth.
- budget per domain/run
- deterministic fallback
- no AI-generated metric can overwrite observed metric
- store model/prompt/version metadata for material recommendations
- abstain when evidence is insufficient

## Vercel Agents / Codex

Implementer role:
- accepts bounded WorkPacket
- branch only
- cannot merge/release
- emits patch + tests + receipt
- line-level validation policy applies before acceptance

Independent validator:
- separate agent/context
- re-fetches exact branch SHA
- validates expected behavior from source
- returns PASS/FAIL/BLOCKED
- UNKNOWN is never PASS

## n8n

Optional adapter only. Do not introduce a second scheduler. n8n may execute event-driven integration jobs if needed, but the canonical due-state remains in the single reconciler.

## Google Chat

Notification-only lane for operator alerts after connector availability is verified. No autonomous customer messaging.

## Auto Social

Out of scope for Domain Operations core. Any future social action consumes approved insights and remains governed by the existing publishing gate.

## Smoke Tests

Minimum golden-path test domain:
1. input normalized;
2. no duplicate registry record;
3. GA discovery succeeds or returns explicit blocked reason;
4. GSC discovery succeeds or returns explicit blocked reason;
5. sitemap discovered and parsed;
6. robots/canonical conflicts detected;
7. URL inspection bounded correctly;
8. analytics snapshot persisted;
9. competitor discovery produces evidence;
10. action queue classifies SAFE vs PROTECTED;
11. validator re-fetches state;
12. receipt is durable;
13. second identical run is idempotent;
14. no production mutation occurred without gate.

## Rollback

Branch work:
- close draft PR;
- delete branch after operator decision if desired;
- main/production remains unchanged.

Runtime mutation:
- each action must carry pre-state evidence and reversal instructions before execution.

## Environment Checklist

Never place values in repo/docs.

Required logical credentials/connections:
- Google user delegated identity
- GA read access
- GSC read access
- governed Google lifecycle write adapter
- site verification authority
- DNS provider authority for protected verification changes
- Supabase/Base44 operational state access
- GitHub branch access
- deployment read access
- competitor research/browser source

## Release Gate

No release until:
- GA discovery defect fixed and tested
- totals regression fixed and tested
- Search Console fallback bug fixed and tested
- write-plane scopes separated from read plane
- exact Google resource bindings proven on a golden-path domain
- sitemap/index flow passes
- independent validation passes
- rollback exists
- operator explicitly approves protected release actions
