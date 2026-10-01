import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

async function authorizeDomainRuntime(base44, user) {
  if (!user) return { ok:false, status:401, error:'Unauthorized' };
  if (user.role === 'admin') return { ok:true, kind:'admin' };

  const rowsRes = await base44.asServiceRole.entities.RuntimePrincipal.filter(
    { user_id:user.id, status:'active' },
    { limit:10 }
  ).catch(() => []);
  const rows = rowsRes.items || rowsRes || [];
  const nowMs = Date.now();
  const principal = rows.find(row => {
    const scopes = Array.isArray(row.scopes) ? row.scopes : [];
    if (!scopes.includes('DOMAIN_RUNTIME')) return false;
    if (row.expires_at) {
      const expiry = Date.parse(row.expires_at);
      if (!Number.isFinite(expiry) || expiry <= nowMs) return false;
    }
    return true;
  });

  return principal
    ? { ok:true, kind:'runtime', principal_id:principal.id }
    : { ok:false, status:403, error:'Runtime scope forbidden' };
}

function now() { return new Date().toISOString(); }
function cleanDomain(input) {
  return String(input || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .split('/')[0]
    .toLowerCase();
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const auth = await authorizeDomainRuntime(base44, user);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    if (auth.kind === 'runtime') {
      if (body.mode !== 'HEARTBEAT' || !body.domain_id || body.domain_url) {
        return Response.json({ error:'Runtime principal may only run existing domain heartbeat jobs' }, { status:403 });
      }
    }
    const svc = base44.asServiceRole;
    let domain = null;

    if (body.domain_id) {
      domain = await svc.entities.Domain.get(body.domain_id);
    } else if (body.domain_url) {
      const name = cleanDomain(body.domain_url);
      const existing = await svc.entities.Domain.filter({ domain: name }, { limit: 1 });
      domain = existing.items?.[0] || null;
      if (!domain) {
        domain = await svc.entities.Domain.create({
          domain: name,
          url: body.domain_url.startsWith('http') ? body.domain_url : 'https://' + body.domain_url,
          status: 'pending'
        });
      }
    }

    if (!domain) {
      return Response.json({ error: 'domain_id or domain_url is required' }, { status: 400 });
    }

    const runId = String(body.run_id || ('domain-run-' + Date.now()));
    const previous = await svc.entities.DomainExecution.filter({ run_id:runId }, { sort:'-started_at', limit:1 }).catch(() => []);
    const previousRows = previous.items || previous || [];
    if (previousRows.length) {
      const prior = previousRows[0];
      const inFlight = ['QUEUED','RUNNING','VALIDATING'].includes(prior.status);
      const validationStatus = inFlight ? 'BLOCKED' : prior.status;
      return Response.json({
        ok: prior.status === 'PASS',
        duplicate: true,
        run_id: runId,
        execution_id: prior.id,
        domain_id: domain.id,
        status: prior.status,
        validation_receipt_id: prior.validation_receipt_id || null,
        validation: {
          status: validationStatus,
          receipt_id: prior.validation_receipt_id || null,
          reason: inFlight ? 'DUPLICATE_RUN_IN_FLIGHT' : 'DUPLICATE_RUN_REUSED'
        }
      }, { status: prior.status === 'PASS' ? 200 : inFlight ? 202 : 409 });
    }

    const execution = await svc.entities.DomainExecution.create({
      domain_id: domain.id,
      run_id: runId,
      mode: body.mode === 'HEARTBEAT' ? 'HEARTBEAT' : 'MANUAL',
      status: 'RUNNING',
      action_class: 'READ',
      started_at: now(),
      protected_actions_executed: []
    });

    let executionResult;
    try {
      const run = await base44.functions.invoke('domain_run_pipeline', { domain_id: domain.id });
      executionResult = {
        ...(run.data || {}),
        protected_actions_executed: []
      };
    } catch (error) {
      executionResult = {
        domain: domain.domain,
        domain_id: domain.id,
        error: error.message,
        protected_actions_executed: []
      };
    }

    await svc.entities.DomainExecution.update(execution.id, {
      status: 'VALIDATING',
      result: executionResult
    });

    const validation = await base44.functions.invoke('domain_agent_validator', {
      execution_id: execution.id,
      run_id: runId,
      domain_id: domain.id,
      execution_result: executionResult
    });

    return Response.json({
      ok: validation.data?.status === 'PASS',
      run_id: runId,
      execution_id: execution.id,
      domain_id: domain.id,
      pipeline: executionResult,
      validation: validation.data
    }, { status: validation.data?.status === 'PASS' ? 200 : 409 });
  } catch (error) {
    return Response.json({ ok: false, status: 'UNKNOWN', error: error.message }, { status: 500 });
  }
}
