import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import ts from "typescript";

const OUT_DIR = resolve("artifacts/validation");
mkdirSync(OUT_DIR, { recursive: true });

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function runCommand(name, command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 30 * 1024 * 1024,
  });
  return {
    name,
    command: [command, ...args].join(" "),
    status: result.status === 0 ? "PASS" : "FAIL",
    exit_code: result.status ?? 1,
    stdout: (result.stdout || "").slice(-16000),
    stderr: (result.stderr || "").slice(-16000),
  };
}

function detectBaseSha() {
  const requested = process.env.VALIDATION_BASE_SHA;
  if (requested && !/^0+$/.test(requested)) return requested;
  try {
    return git(["merge-base", "origin/main", "HEAD"]);
  } catch {
    return git(["rev-parse", "HEAD^"]);
  }
}

function parseAddedLines(diffText) {
  const entries = [];
  let file = null;
  let nextLine = null;
  const forbidden = [
    /ghp_[A-Za-z0-9]{20,}/,
    /github_pat_[A-Za-z0-9_]{20,}/,
    /sk-[A-Za-z0-9_-]{20,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /Bearer\s+[A-Za-z0-9._-]{24,}/i,
  ];

  for (const raw of diffText.split("\n")) {
    if (raw.startsWith("+++ b/")) {
      file = raw.slice(6);
      continue;
    }
    if (raw.startsWith("@@")) {
      const match = raw.match(/\+(\d+)(?:,(\d+))?/);
      nextLine = match ? Number(match[1]) : null;
      continue;
    }
    if (!file || nextLine === null) continue;

    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      const content = raw.slice(1);
      const violations = forbidden.filter((pattern) => pattern.test(content)).map(String);
      entries.push({
        file,
        line: nextLine,
        sha256: createHash("sha256").update(content).digest("hex"),
        validator: "strategic-minds-line-integrity-v2",
        status: violations.length ? "FAIL" : "PASS",
        violations,
      });
      nextLine += 1;
    } else if (!raw.startsWith("-") && !raw.startsWith("\\ No newline")) {
      nextLine += 1;
    }
  }
  return entries;
}

function fileIntegrity(path) {
  if (!existsSync(path)) return { path, status: "PASS", note: "not_materialized_or_deleted" };
  const body = readFileSync(path);
  if (body.includes(0)) return { path, status: "FAIL", note: "NUL byte detected" };
  const text = body.toString("utf8");
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(text)) {
    return { path, status: "FAIL", note: "merge conflict marker detected" };
  }
  if (extname(path) === ".json") {
    try {
      JSON.parse(text);
    } catch (error) {
      return { path, status: "FAIL", note: `invalid JSON: ${error.message}` };
    }
  }
  return { path, status: "PASS", note: "integrity checks passed" };
}

function typescriptSyntax(path) {
  const source = readFileSync(path, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
    reportDiagnostics: true,
    fileName: path,
  });
  const diagnostics = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  return {
    path,
    status: diagnostics.length ? "FAIL" : "PASS",
    diagnostics: diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")),
  };
}

const baseSha = detectBaseSha();
const headSha = git(["rev-parse", "HEAD"]);
const expectedHead = process.env.VALIDATION_HEAD_SHA || headSha;
const changedFiles = git(["diff", "--name-only", `${baseSha}..${headSha}`])
  .split("\n")
  .map((value) => value.trim())
  .filter(Boolean);
const diffText = git(["diff", "--unified=0", "--no-color", `${baseSha}..${headSha}`]);
const lineLedger = parseAddedLines(diffText);

const branchChecks = [];
branchChecks.push({
  name: "exact_sha_binding",
  status: expectedHead === headSha ? "PASS" : "FAIL",
  expected: expectedHead,
  actual: headSha,
});

const fileChecks = changedFiles.map(fileIntegrity);
branchChecks.push({
  name: "changed_file_integrity",
  status: fileChecks.every((item) => item.status === "PASS") ? "PASS" : "FAIL",
  details: fileChecks,
});

branchChecks.push({
  name: "changed_line_integrity",
  status: lineLedger.every((item) => item.status === "PASS") ? "PASS" : "FAIL",
  lines_checked: lineLedger.length,
  failures: lineLedger.filter((item) => item.status !== "PASS"),
});

const changedTs = changedFiles.filter((path) => /\.(ts|tsx)$/.test(path) && existsSync(path));
const syntaxChecks = changedTs.map(typescriptSyntax);
branchChecks.push({
  name: "changed_typescript_syntax",
  status: syntaxChecks.every((item) => item.status === "PASS") ? "PASS" : "FAIL",
  details: syntaxChecks,
});

const changedLintable = changedFiles.filter(
  (path) => /^src\/.*\.(js|jsx)$/.test(path) && existsSync(path)
);
if (changedLintable.length) {
  branchChecks.push(runCommand("changed_scope_lint", "npx", ["eslint", ...changedLintable, "--quiet"]));
} else {
  branchChecks.push({ name: "changed_scope_lint", status: "PASS", details: "No changed src JS/JSX files." });
}

branchChecks.push(runCommand("build", "npm", ["run", "build"]));
branchChecks.push(runCommand(
  "domain_operations_contract",
  process.execPath,
  ["scripts/validation/domain-operations-contract.test.mjs"]
));

const releaseChecks = [
  runCommand("global_lint", "npm", ["run", "lint"]),
  runCommand("global_typecheck", "npm", ["run", "typecheck"]),
  runCommand("dependency_audit_high", "npm", ["audit", "--audit-level=high"]),
];

const branchFailures = branchChecks.filter((item) => item.status !== "PASS");
const releaseFailures = releaseChecks.filter((item) => item.status !== "PASS");
const branchGate = branchFailures.length ? "BLOCKED" : "PASS";
const releaseGate = branchGate === "PASS" && releaseFailures.length === 0 ? "PASS" : "BLOCKED";

const receipt = {
  receipt_version: "2.0",
  validator_id: "strategic-minds-independent-validator-v2",
  validator_class: "deterministic_github_ci",
  source_repository: process.env.GITHUB_REPOSITORY || "Strategic-Minds-AI/strategic-insights",
  base_sha: baseSha,
  head_sha: headSha,
  event_name: process.env.GITHUB_EVENT_NAME || "local",
  run_id: process.env.GITHUB_RUN_ID || null,
  run_attempt: process.env.GITHUB_RUN_ATTEMPT || null,
  actor: process.env.GITHUB_ACTOR || "local-validator",
  generated_at: new Date().toISOString(),
  changed_files: changedFiles,
  added_lines_ledgered: lineLedger.length,
  branch_gate: branchGate,
  release_gate: releaseGate,
  branch_checks: branchChecks,
  release_checks: releaseChecks,
  manual_release_gates: [
    "Google write-scope authorization must have explicit operator approval.",
    "Production release remains operator-approved only.",
    "DNS, secrets, production DB/schema/RLS, spend, and public/customer actions remain protected.",
  ],
};

writeFileSync(resolve(OUT_DIR, "line-ledger.json"), JSON.stringify(lineLedger, null, 2));
writeFileSync(resolve(OUT_DIR, "validation-receipt.json"), JSON.stringify(receipt, null, 2));

const summary = [
  "# Strategic Minds Independent Validator v2",
  "",
  `- Branch gate: **${branchGate}**`,
  `- Release gate: **${releaseGate}**`,
  `- Base SHA: \`${baseSha}\``,
  `- Head SHA: \`${headSha}\``,
  `- Changed files: ${changedFiles.length}`,
  `- Added lines ledgered: ${lineLedger.length}`,
  "",
  "## Branch checks",
  ...branchChecks.map((item) => `- ${item.status} — ${item.name}`),
  "",
  "## Release checks",
  ...releaseChecks.map((item) => `- ${item.status} — ${item.name}`),
  "",
  "A branch PASS does not authorize production release.",
].join("\n");

writeFileSync(resolve(OUT_DIR, "summary.md"), summary);
process.stdout.write(summary + "\n");

if (branchGate !== "PASS") process.exitCode = 1;
