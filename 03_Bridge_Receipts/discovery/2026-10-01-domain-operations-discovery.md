# Discovery Receipt — Strategic Insights Domain Operations

Date: 2026-10-01
Scope: read-only discovery plus branch-only documentation
Production mutation: NONE

## VERIFIED

- Canonical implementation repo is accessible: Strategic-Minds-AI/strategic-insights.
- Latest observed commit before branch creation: 3656df09f8db65f92c222c1ce8aff3a7214f7e57.
- Recent commit integrates Supabase, Google Drive, and GitHub data sources.
- Strategic Insights contains a working `strategic_scan` implementation surface.
- Strategic Insights declares connectors for Google Analytics and Search Console.
- Those connector scopes are read-only.
- Strategic Insights has `Business`, `AnalyticsSnapshot`, and `Gap` entities.
- Strategic Insights MCP config exposes strategic scan, data-source listing, Supabase, GitHub read, and Drive read.
- Digital Dominance canonical donor repo is accessible: Strategic-Minds-AI/strategic-digital-dominance.
- Latest observed Digital Dominance commit: ca78546518599afc7701e6cba072f3d246d0b34d.
- Drive source truth states the deterministic NearMe/NearYou loop and Google lifecycle requirements.
- Drive source truth preserves Admin/control-plane primitives and independent validation.

## VERIFIED DEFECTS / RISKS

1. GA properties.list call is missing Google's required filter.
2. GA report code reads totals without explicitly requesting total aggregation.
3. Search Console fallback references `scData.metrics.avgPosition` although the local response shape stores `avgPosition` at root.
4. Current Google connectors are insufficient for full autonomous provisioning because they are read-only.
5. The previously referenced Base44 AUTO BUILDER ORCHESTRATOR app ID could not be accessed from the currently selected Strategic Minds Base44 link.
6. Base44 personal link currently exposes Auto Builder and Xtreme Auto Builder, not the previously referenced canonical orchestrator ID.

## INFERRED

- Strategic Insights is now the correct place to converge the domain/Google lifecycle system.
- Digital Dominance should be reused as an intelligence/execution donor rather than duplicated.
- A separate governed Google write plane is required alongside the existing read plane.

## COULD NOT VERIFY

- Current runtime connector health for every Strategic Insights connector.
- Exact Base44 app ID backing Strategic Insights.
- Canonical production Supabase tables for Domain Operations.
- Canonical Google Cloud project for write-plane OAuth/service accounts.
- Current DNS write binding for all domains.
- GTM write authorization.
- Exact golden-path domain for first autonomous provisioning test.

## BLOCKERS

- Line-level independent validator must be bootstrapped before autonomous code changes are accepted.
- Full Google lifecycle provisioning needs governed write scopes/authority.

## NEXT SAFE ACTION

Implement branch-only validator/bootstrap tests first, then repair the three verified `strategic_scan` defects, then add DomainRegistry and lifecycle workers behind the single reconciler.
