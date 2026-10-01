import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));

const pipeline = read("base44/functions/domain_run_pipeline/entry.ts");
const gaProvision = read("base44/functions/provision_ga4_properties/entry.ts");
const sitemapPush = read("base44/functions/push_sitemap_to_gsc/entry.ts");
const heartbeat = json("base44/workflows/Domain Heartbeat.jsonc");
const sitemapWorkflow = json("base44/workflows/Sitemap Push.jsonc");
const agent = json("base44/agents/domain_operations.jsonc");
const domainApproval = json("base44/entities/DomainApproval.jsonc");
const domainReceipt = json("base44/entities/DomainReceipt.jsonc");
const protectedReceipt = json("base44/entities/ProtectedActionReceipt.jsonc");
const mcp = json("base44/mcp/config.json");

const findings = [];
function gate(id, pass, message, severity = "HARD") {
  findings.push({ id, status: pass ? "PASS" : "FAIL", severity, message });
}

const agentTools = agent.tool_configs || [];
const agentFunctionNames = agentTools.map((item) => item.function_name).filter(Boolean);
const agentEntityOps = agentTools
  .filter((item) => item.entity_name)
  .flatMap((item) => item.allowed_operations || []);

gate(
  "GOV_AGENT_GOVERNED_RUNNER",
  agent.instructions.includes("ALWAYS call domain_agent_run") &&
    !agentFunctionNames.includes("domain_run_pipeline"),
  "Domain Operations agent must enter through the governed runner, never the raw pipeline."
);
gate(
  "GOV_AGENT_NO_DELETE",
  !agentEntityOps.includes("delete"),
  "Domain Operations agent must not be able to delete domain/action history."
);

gate(
  "GOV_SITEMAP_REQUIRES_APPROVAL",
  sitemapPush.includes("approval_id") &&
    sitemapPush.includes("VALID_EXECUTING_APPROVAL_REQUIRED"),
  "Search Console sitemap submission must require a valid executing approval."
);
gate(
  "GOV_GA_WRITE_REQUIRES_APPROVAL",
  gaProvision.includes("approval_id") &&
    gaProvision.includes("VALID_EXECUTING_APPROVAL_REQUIRED"),
  "GA4 write execution must require a valid executing approval."
);

const workflowText = JSON.stringify(sitemapWorkflow);
gate(
  "GOV_SITEMAP_WORKFLOW_QUEUES_ONLY",
  workflowText.includes("request_domain_approval") &&
    !workflowText.includes('"function_name":"push_sitemap_to_gsc"'),
  "Domain creation workflow may queue approval but must not directly submit to Google."
);

const heartbeatText = JSON.stringify(heartbeat);
gate(
  "GOV_SINGLE_HEARTBEAT_USES_GOVERNED_RECONCILER",
  heartbeatText.includes("domain_agent_reconcile") &&
    !heartbeatText.includes("domain_run_pipeline"),
  "Scheduled domain work must enter through the governed reconciler rather than the raw pipeline."
);

gate(
  "GSC_SITEMAP_HTTP_CONTRACT",
  sitemapPush.includes("method: 'PUT'") &&
    /sitemaps\/\$\{encodeURIComponent\(sitemapUrl\)\}/.test(sitemapPush) &&
    !sitemapPush.includes("body: JSON.stringify({ feedpath: sitemapUrl })"),
  "Search Console sitemap submit must use PUT sites/{siteUrl}/sitemaps/{feedpath} with feedpath in the path."
);

gate(
  "GSC_EXACT_PROPERTY_MATCH",
  !pipeline.includes("s.siteUrl.includes(domain.domain)") &&
    !sitemapPush.includes("s.siteUrl.includes(domain.domain)"),
  "Search Console property binding must use exact normalized host/domain identity, not substring matching."
);

const unfilteredPropertyList =
  /analyticsadmin\.googleapis\.com\/v1beta\/properties(?:['"`?])/.test(pipeline) &&
  !pipeline.includes("accountSummaries") &&
  !pipeline.includes("filter=");
gate(
  "GA_DISCOVERY_EXACT_PROPERTY_BINDING",
  !unfilteredPropertyList &&
    pipeline.includes("dataStreams") &&
    pipeline.includes("defaultUri"),
  "GA read binding must discover accessible properties and match a web data stream URI to the exact domain."
);

gate(
  "GA_REPORT_TOTALS_EXPLICIT",
  !pipeline.includes("reportData.totals") ||
    /metricAggregations\s*:\s*\[\s*['"]TOTAL['"]\s*\]/.test(pipeline),
  "If GA runReport reads totals, the request must explicitly request TOTAL aggregation."
);

gate(
  "GA_CREATE_PROPERTY_NO_URL_FIELD",
  !/body:\s*JSON\.stringify\(\{[\s\S]{0,600}?\n\s*url:\s*`https:\/\//.test(gaProvision),
  "GA Property creation payload must not use a website URL field; website URI belongs on a web data stream."
);

gate(
  "GA_CREATE_WEB_DATA_STREAM",
  gaProvision.includes("/dataStreams") &&
    gaProvision.includes("WEB_DATA_STREAM") &&
    gaProvision.includes("webStreamData") &&
    gaProvision.includes("defaultUri"),
  "GA provisioning must create or reuse a WEB_DATA_STREAM with the site's defaultUri."
);

gate(
  "GA_EXACT_ACCOUNT_BINDING",
  !gaProvision.includes("accounts[0]"),
  "GA provisioning must not silently choose the first accessible account; target account identity must be deterministic."
);

gate(
  "GA_DUPLICATE_PROTECTION",
  gaProvision.includes("dataStreams") &&
    (gaProvision.includes("accountSummaries") || gaProvision.includes("properties?filter=")) &&
    (gaProvision.includes("defaultUri") || gaProvision.includes("measurementId")),
  "GA provisioning must discover existing property/stream bindings before creating new resources."
);

gate(
  "NO_GENERAL_INDEXING_API",
  !pipeline.includes("indexing.googleapis.com") &&
    !sitemapPush.includes("indexing.googleapis.com") &&
    !gaProvision.includes("indexing.googleapis.com"),
  "Ordinary local-service URLs must never use Google's restricted Indexing API."
);

const approvalDelete = domainApproval.rls?.delete;
const domainReceiptDelete = domainReceipt.rls?.delete;
const protectedReceiptDelete = protectedReceipt.rls?.delete;
gate(
  "AUDIT_APPROVAL_HISTORY_IMMUTABLE",
  approvalDelete === false,
  "DomainApproval history must be non-deletable."
);
gate(
  "AUDIT_DOMAIN_RECEIPTS_IMMUTABLE",
  domainReceiptDelete === false,
  "DomainReceipt records must be non-deletable."
);
gate(
  "AUDIT_PROTECTED_RECEIPTS_IMMUTABLE",
  protectedReceiptDelete === false,
  "ProtectedActionReceipt records must be non-deletable."
);

const mcpFunctions = mcp.tools?.functions || [];
const mcpNames = new Set(mcpFunctions.map((item) => item.name));
gate(
  "MCP_APPROVAL_SURFACE",
  mcpNames.has("request_domain_protected_action") &&
    mcpNames.has("list_domain_approvals") &&
    mcpNames.has("decide_domain_approval") &&
    mcpNames.has("execute_domain_protected_action"),
  "MCP surface must expose request/list/decision/execution through the governed approval lane."
);

for (const finding of findings) {
  console.log(`${finding.status} [${finding.severity}] ${finding.id}: ${finding.message}`);
}
const hardFailures = findings.filter((item) => item.severity === "HARD" && item.status !== "PASS");
if (hardFailures.length) process.exitCode = 1;
