import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

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
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
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
