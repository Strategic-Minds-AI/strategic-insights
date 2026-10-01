import fs from 'node:fs';

let failed = 0;
const check = (name, ok) => {
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name);
  if (!ok) failed++;
};
const read = p => fs.readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));

const agent = json('base44/agents/domain_operations.jsonc');
const sitemapWorkflow = json('base44/workflows/Sitemap Push.jsonc');
const push = read('base44/functions/push_sitemap_to_gsc/entry.ts');
const ga4 = read('base44/functions/provision_ga4_properties/entry.ts');
const runner = read('base44/functions/domain_agent_run/entry.ts');
const reconcile = read('base44/functions/domain_agent_reconcile/entry.ts');
const protectedExec = read('base44/functions/execute_domain_protected_action/entry.ts');
const protectedValidator = read('base44/functions/protected_action_validator/entry.ts');
const actionSchema = json('base44/entities/DomainAction.jsonc');
const mcp = json('base44/mcp/config.json');
const vercel = json('vercel.json');

check('agent routes scans through governed runner',
  agent.tool_configs.some(x => x.function_name === 'domain_agent_run') &&
  !agent.tool_configs.some(x => x.function_name === 'domain_run_pipeline'));

check('agent cannot delete domain/action history',
  agent.tool_configs.filter(x => ['Domain','DomainAction'].includes(x.entity_name))
    .every(x => !(x.allowed_operations || []).includes('delete')));

check('sitemap workflow queues approval only',
  JSON.stringify(sitemapWorkflow).includes('request_domain_approval') &&
  !JSON.stringify(sitemapWorkflow).includes('push_sitemap_to_gsc'));

check('legacy Base44 scheduled heartbeat removed',
  !fs.existsSync('base44/workflows/Domain Heartbeat.jsonc'));

check('sitemap submission requires executing approval',
  push.includes("approval.status !== 'executing'") &&
  push.includes("approval.action_type !== 'SUBMIT_SITEMAP'"));

check('live GA4 provisioning requires executing approval',
  ga4.includes("approval.action_type !== 'CREATE_GA4_PROPERTIES_BULK'") &&
  ga4.includes("approval.status !== 'executing'"));

check('heartbeat uses deterministic five-minute bucket',
  reconcile.includes('heartbeatBucket') &&
  reconcile.includes("run_id: 'heartbeat-' + domain.id + '-' + heartbeatBucket"));

check('runner reuses duplicate run ids',
  runner.includes('DomainExecution.filter({ run_id:runId }'));

check('protected executor invokes independent validator',
  protectedExec.includes("functions.invoke('protected_action_validator'"));

check('protected validator writes receipt',
  protectedValidator.includes('ProtectedActionReceipt.create'));

check('action queue stores approval metadata',
  !!actionSchema.properties.approval_id &&
  !!actionSchema.properties.action_class &&
  !!actionSchema.properties.approval_status);

const names = new Set(mcp.tools.functions.map(x => x.name));
check('MCP exposes governed approval lifecycle',
  ['request_domain_protected_action','list_domain_approvals','decide_domain_approval','execute_domain_protected_action']
    .every(x => names.has(x)));

check('single Vercel five-minute heartbeat declared',
  vercel.crons?.length === 1 &&
  vercel.crons[0].path === '/api/reconcile' &&
  vercel.crons[0].schedule === '*/5 * * * *');

if (failed) process.exit(1);
