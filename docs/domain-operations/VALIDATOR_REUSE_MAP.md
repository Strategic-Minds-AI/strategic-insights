# Domain Operations — Validator Reuse Map

Date: 2026-10-01
Source donor: Strategic-Minds-AI/strategic-digital-dominance @ ca78546518599afc7701e6cba072f3d246d0b34d
Target: Strategic-Minds-AI/strategic-insights
Mode: EXTRACT / ADAPT, not wholesale copy

## Decision

Do not invent a second validator framework.

Reuse the proven Digital Dominance validation architecture as the donor contract for Strategic Insights Domain Operations.

## Donor Components

### ValidationReceipt entity
Source:
`base44/entities/ValidationReceipt.jsonc`

Preserve:
- deterministic receipt_id
- work_packet_id
- check_name
- expected
- actual
- PASS / FAIL / BLOCKED / MISSING_EVIDENCE / PENDING
- evidence
- validator identity
- category
- timestamp

Adapt:
- add source_repo
- source_branch
- source_sha
- file_path
- hunk_anchor / line identity when code validation is involved
- provider resource identity for Google lifecycle checks
- evidence freshness

### Validation Constitution
Source:
`base44/shared/validationConstitution.ts`

Preserve:
- HARD vs SOFT gates
- build/lint/type/security/data/e2e/mobile gates
- no UNKNOWN/FAIL/BLOCKED for verified state
- implementer != validator
- branch/sandbox repair
- release authority separate from implementer

Domain Operations extensions:
- GOOGLE_API_CONTRACT hard gate
- GOOGLE_SCOPE hard gate
- DOMAIN_IDEMPOTENCY hard gate
- SITEMAP_VALIDITY hard gate
- INDEX_POLICY hard gate
- ANALYTICS_NORMALIZATION hard gate
- PROVIDER_RATE_LIMIT hard gate
- CONNECTOR_IDENTITY hard gate

### Control Plane Contracts
Source:
`base44/shared/control-plane/contracts.ts`

Preserve:
- OperatorIntent
- Job / job lineage
- ApprovalPacket
- ArtifactReference
- FleetHeartbeat
- AgentDefinition
- queue -> job -> worker -> result -> validator -> receipt lineage

Adapt:
- add domain_id
- google_resource_ref
- action_class
- next_due_at
- lease / retry / dead-letter contract for domain workers

### Broken Twin Scenarios
Source:
`base44/shared/brokenTwinScenarios.ts`

Reuse directly as a fault-pattern donor.

Required new Domain Operations broken twins:
1. GA properties.list missing required filter.
2. GA totals assumed without explicit total aggregation.
3. Search Console avgPosition response-shape mismatch.
4. duplicate ADD_DOMAIN creates duplicate registry row.
5. duplicate onboarding creates duplicate GA property.
6. sitemap includes redirected URL.
7. sitemap includes noindex URL.
8. sitemap canonical mismatch.
9. robots blocks sitemap URL.
10. Search Console property bound to wrong domain.
11. OAuth identity differs from expected owner identity.
12. rate limit returns 429 and retry ignores Retry-After/backoff.
13. competitor private-data claim appears without evidence.
14. ordinary local-service URL routed to restricted Google Indexing API.
15. validator attempts to certify its own implementation.

## Required Independence

The implementation worker cannot write its own PASS receipt.

Validator must:
1. re-fetch exact target branch SHA;
2. re-fetch changed files;
3. reconstruct expected behavior from the approved Build Packet;
4. run contract tests independently;
5. record actual evidence;
6. emit PASS / FAIL / BLOCKED.

## Immediate Use

Before the first code patch to Strategic Insights:
- materialize the donor validation contracts in the target branch;
- add Domain Operations broken-twin tests;
- make CI reject any implementation without independent validation evidence;
- keep main and production unchanged.
