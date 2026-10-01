import fs from 'node:fs';

let failed = 0;
function check(name, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`);
  if (!ok) failed++;
}

const read = p => fs.readFileSync(p, 'utf8');
const ops = read('base44/functions/domain_operations/entry.ts');
const rec = read('base44/functions/domain_reconcile/entry.ts');
const val = read('base44/functions/domain_validator/entry.ts');
const contract = JSON.parse(read('runtime/domain-ops-contract.json'));
const vercel = JSON.parse(read('vercel.json'));
const sc = JSON.parse(read('base44/connectors/google_search_console.jsonc'));
const ga = JSON.parse(read('base44/connectors/google_analytics.jsonc'));

check('single five-minute cron',
  vercel.crons?.length === 1 &&
  vercel.crons[0].path === '/api/reconcile' &&
  vercel.crons[0].schedule === '*/5 * * * *');

check('reconcile invokes independent validator',
  rec.includes("base44.functions.invoke('domain_validator'"));

check('executor never self-certifies PASS',
  ops.includes("status:'validating'") &&
  !ops.includes("status:'pass'"));

check('validator creates durable receipt',
  val.includes('DomainReceipt.create'));

check('protected action guard exists',
  ops.includes('PROTECTED_ACTIONS') &&
  ops.includes("reason:'APPROVAL_REQUIRED'"));

check('Search Console property and sitemap writes are protected',
  contract.protected_actions.includes('ADD_GSC_PROPERTY') &&
  contract.protected_actions.includes('SUBMIT_SITEMAP'));

check('GA4 provisioning is protected',
  contract.protected_actions.includes('CREATE_GA4_PROPERTY'));

check('GTM publish is protected',
  contract.protected_actions.includes('PUBLISH_GTM'));

check('DNS verification write is protected',
  contract.protected_actions.includes('DNS_VERIFICATION_WRITE'));

check('current Search Console connector remains read-only',
  sc.scopes.includes('https://www.googleapis.com/auth/webmasters.readonly') &&
  !sc.scopes.includes('https://www.googleapis.com/auth/webmasters'));

check('current Analytics connector remains read-only',
  ga.scopes.includes('https://www.googleapis.com/auth/analytics.readonly') &&
  !ga.scopes.includes('https://www.googleapis.com/auth/analytics.edit'));

check('evolution is draft only',
  contract.evolution_mode === 'DRAFT_ONLY');

if (failed) process.exit(1);
