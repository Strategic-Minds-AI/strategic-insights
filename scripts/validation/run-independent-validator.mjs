import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const OUT_DIR = resolve("artifacts/validation");
mkdirSync(OUT_DIR, { recursive: true });

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function command(name, command, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    name,
    command: [command, ...args].join(" "),
    status: result.status === 0 ? "PASS" : "FAIL",
    exit_code: result.status ?? 1,
    stdout: (result.stdout || "").slice(-12000),
    stderr: (result.stderr || "").slice(-12000),
    started_at: startedAt,
    completed_at: new Date().toISOString(),
  };
}

function detectBaseSha() {
  if (process.env.VALIDATION_BASE_SHA && !/^0+$/.test(process.env.VALIDATION_BASE_SHA)) {
    return process.env.VALIDATION_BASE_SHA;
  }
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
      const hash = createHash("sha256").update(content).digest("hex");
      const forbidden = [
        /ghp_[A-Za-z0-9]{20,}/,
        /github_pat_[A-Za-z0-9_]{20,}/,
        /sk-[A-Za-z0-9_-]{20,}/,
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
        /Bearer\s+[A-Za-z0-9._-]{24,}/i,
      ];
      const violations = forbidden.filter((pattern) => pattern.test(content)).map(String);
      entries.push({
        file,
        line: nextLine,
        sha256: hash,
        validator: "strategic-minds-line-integrity-v1",
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

function validateChangedFile(path) {
  if (!existsSync(path)) {
    return { path, status: "PASS", note: "deleted_or_not_materialized" };
  }

  const body = readFileSync(path);
  if (body.includes(0)) {
    return { path, status: "FAIL", note: "NUL byte detected" };
  }

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

  if ((extname(path) === ".mjs" || extname(path) === ".js") && path.startsWith("scripts/")) {
    const syntax = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
    if (syntax.status !== 0) {
      return { path, status: "FAIL", note: (syntax.stderr || syntax.stdout || "syntax failure").slice(-4000) };
    }
  }

  return { path, status: "PASS", note: "file integrity checks passed" };
}

const baseSha = detectBaseSha();
const headSha = git(["rev-parse", "HEAD"]);
const expectedHead = process.env.VALIDATION_HEAD_SHA;

const checks = [];
if (expectedHead && expectedHead !== headSha) {
  checks.push({
    name: "exact_sha_binding",
    status: "FAIL",
    expected: expectedHead,
    actual: headSha,
  });
} else {
  checks.push({
    name: "exact_sha_binding",
    status: "PASS",
    expected: expectedHead || headSha,
    actual: headSha,
  });
}

const changedFiles = git(["diff", "--name-only", `${baseSha}..${headSha}`])
  .split("\n")
  .map((value) => value.trim())
  .filter(Boolean);

const diffText = git(["diff", "--unified=0", "--no-color", `${baseSha}..${headSha}`]);
const lineLedger = parseAddedLines(diffText);
const fileChecks = changedFiles.map(validateChangedFile);

checks.push({
  name: "changed_file_integrity",
  status: fileChecks.every((entry) => entry.status === "PASS") ? "PASS" : "FAIL",
  details: fileChecks,
});

checks.push({
  name: "changed_line_integrity",
  status: lineLedger.every((entry) => entry.status === "PASS") ? "PASS" : "FAIL",
  lines_checked: lineLedger.length,
  failures: lineLedger.filter((entry) => entry.status !== "PASS"),
});

for (const [name, commandName, args] of [
  ["lint", "npm", ["run", "lint"]],
  ["typecheck", "npm", ["run", "typecheck"]],
  ["build", "npm", ["run", "build"]],
  ["domain_operations_contract", process.execPath, ["scripts/validation/domain-operations-contract.test.mjs"]],
]) {
  checks.push(command(name, commandName, args));
}

const hardFailures = checks.filter((entry) => entry.status !== "PASS");
const overallStatus = hardFailures.length === 0 ? "PASS" : "FAIL";

const receipt = {
  receipt_version: "1.0",
  validator_id: "strategic-minds-independent-validator-v1",
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
  line_count: lineLedger.length,
  status: overallStatus,
  release_gate: overallStatus === "PASS" ? "ELIGIBLE_FOR_NEXT_GATE" : "BLOCKED",
  checks,
};

writeFileSync(resolve(OUT_DIR, "line-ledger.json"), JSON.stringify(lineLedger, null, 2));
writeFileSync(resolve(OUT_DIR, "validation-receipt.json"), JSON.stringify(receipt, null, 2));

const summary = [
  "# Strategic Minds Independent Validator",
  "",
  `- Status: **${receipt.status}**`,
  `- Release gate: **${receipt.release_gate}**`,
  `- Base SHA: \`${baseSha}\``,
  `- Head SHA: \`${headSha}\``,
  `- Changed files: ${changedFiles.length}`,
  `- Added lines ledgered: ${lineLedger.length}`,
  "",
  "## Checks",
  ...checks.map((entry) => `- ${entry.status === "PASS" ? "PASS" : "FAIL"} — ${entry.name}`),
  "",
].join("\n");
writeFileSync(resolve(OUT_DIR, "summary.md"), summary);
process.stdout.write(summary);

if (overallStatus !== "PASS") {
  process.exitCode = 1;
}
