# Base44 Runtime Discovery — Domain Operations Convergence Addendum

Date: 2026-10-01
Mode: READ-ONLY discovery; documentation-only branch write
Target repo: Strategic-Minds-AI/strategic-insights
Target branch: feature/domain-operations-control-plane-20261001

## Newly Verified Runtime Candidate

Accessible Base44 app:
- Name: Strategic Minds AI
- App ID: 6abae414a929d6dc5a55b9cc
- Connection surface: personal Base44 link
- This app is NOT yet proven to be the Base44 runtime backing the strategic-insights GitHub repository.

## Existing Domain Models

The app already contains an admin-only `Domain` entity with:
- domain
- canonical_url
- status
- gsc_property
- ga4_property_id
- sitemap_url
- competitors
- target_keywords
- target_geography
- last_analyzed_at
- next_action
- notes

The app also contains an admin-only `DomainMetric` entity with:
- domain_id
- snapshot_date
- GSC clicks/impressions/CTR/position/top queries
- GA4 users/sessions/pageviews/conversions
- sitemap URL count/errors
- competitor summary
- strategic insight

## Existing Connected Data Plane

Verified active connectors on this Base44 app:
- Google Drive — jeremy@strategicmindsai.com
- Google Sheets — jeremy@strategicmindsai.com
- Google Analytics — jeremy@strategicmindsai.com — analytics.readonly
- Google Search Console — jeremy@strategicmindsai.com — webmasters.readonly
- GitHub — xps-admin
- Supabase — connected with project/database read/write capability

No secret values were read or recorded.

## Runtime Evidence

A non-sample `Domain` record exists for:
- example.com
- canonical_url: https://example.com
- sitemap_url: https://example.com/sitemap.xml
- last_analyzed_at: 2026-10-01T09:09:02.361Z
- next_action: sitemap not found/inaccessible

A matching `DomainMetric` snapshot exists for 2026-10-01 with:
- zero GSC/GA4 metrics because no GSC/GA4 property was bound to that Domain record
- sitemap error: sitemap not found
- fallback insight identifying missing sitemap, GSC property, GA4 property, and competitor configuration

This proves a Domain Operations seed/runtime has executed in Base44.

## Convergence Decision

DO NOT create a second domain registry blindly.

Before implementing `DomainRegistry` in Strategic Insights:
1. resolve whether Base44 app 6abae414a929d6dc5a55b9cc is the intended runtime, a donor, or a parallel/legacy app;
2. preserve the existing `Domain` and `DomainMetric` semantics;
3. compare them field-by-field with the proposed Strategic Insights Domain Registry;
4. classify each as PRESERVE / MERGE / MIGRATE / RETIRE;
5. select one canonical owner before any schema write.

## Important Source Mismatch

The current Strategic Insights GitHub default branch does not contain `Domain` or `DomainMetric` source definitions according to code search, while the accessible Base44 app does contain them.

Therefore the GitHub repo and this Base44 app are NOT YET PROVEN to be the same runtime/source lineage.

State: CONFLICT / UNRESOLVED SOURCE IDENTITY.

## Safe Reuse Recommendation

Preserve:
- `Domain` as the compact operator-facing domain identity if the runtime is selected.
- `DomainMetric` as a compact daily summary layer.

Extend only after canonical ownership is resolved:
- GoogleConnectionBinding
- SitemapRecord
- IndexInspectionRecord
- SearchConsoleDaily
- GA4Daily
- CompetitorRecord / CompetitorSnapshot
- DomainIssue
- DomainAction
- DomainReceipt

The detailed normalized tables should reference the preserved Domain ID rather than replace it unless a migration is explicitly approved.

## Read/Write Plane Finding

The currently verified GA and Search Console connectors are read-only:
- analytics.readonly
- webmasters.readonly

This is sufficient for analytics/discovery but NOT full autonomous lifecycle provisioning.

Maintain:
- READ PLANE = current connectors.
- PROTECTED WRITE PLANE = separately authorized lifecycle adapter for property/site management, sitemap submission, verification, GTM publishing, or DNS changes.

## Current Gate

BLOCKED from schema/code convergence until:
- Base44 app identity is resolved;
- independent validator is callable;
- exact runtime/data authority is selected.

No production, schema, DNS, secrets, Google permission, or deployment change is authorized by this addendum.
