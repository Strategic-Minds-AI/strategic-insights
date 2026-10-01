import { readFileSync } from "node:fs";

const source = readFileSync("base44/functions/strategic_scan/entry.ts", "utf8");
const analyticsConnector = readFileSync("base44/connectors/google_analytics.jsonc", "utf8");
const searchConsoleConnector = readFileSync("base44/connectors/google_search_console.jsonc", "utf8");

const findings = [];

function gate(id, pass, message) {
  findings.push({ id, status: pass ? "PASS" : "FAIL", message });
}

const invalidUnfilteredPropertyList =
  source.includes("analyticsadmin.googleapis.com/v1beta/properties?pageSize=100") &&
  !source.includes("filter=");

gate(
  "D1_GA_PROPERTY_DISCOVERY_FILTER",
  !invalidUnfilteredPropertyList,
  "GA property discovery must enumerate accessible accounts and list properties with the required parent/ancestor filter."
);

gate(
  "D2_GA_TOTALS_EXPLICIT",
  /metricAggregations\s*:\s*\[\s*['"]TOTAL['"]\s*\]/.test(source),
  "GA runReport totals must be explicitly requested or deterministically derived."
);

gate(
  "D3_SEARCH_CONSOLE_AVG_POSITION_SHAPE",
  !source.includes("scData.metrics.avgPosition"),
  "Search Console avgPosition is returned at scData.avgPosition and must not be read through scData.metrics."
);

gate(
  "READ_PLANE_GA_SCOPE",
  analyticsConnector.includes("analytics.readonly"),
  "The existing Analytics connector remains the read plane."
);

gate(
  "READ_PLANE_GSC_SCOPE",
  searchConsoleConnector.includes("webmasters.readonly"),
  "The existing Search Console connector remains the read plane."
);

gate(
  "NO_GENERAL_INDEXING_API",
  !source.includes("indexing.googleapis.com"),
  "Ordinary service/location pages must not be routed through Google's restricted Indexing API."
);

for (const finding of findings) {
  console.log(`${finding.status} ${finding.id}: ${finding.message}`);
}

if (findings.some((finding) => finding.status !== "PASS")) {
  process.exitCode = 1;
}
