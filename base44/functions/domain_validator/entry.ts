import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

function now() { return new Date().toISOString(); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error:'Unauthorized' }, { status:401 });
    if (user.role !== 'admin') return Response.json({ error:'Forbidden' }, { status:403 });

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const actionId = String(body.action_id || '');
    const runId = String(body.run_id || ('domain-run-' + Date.now()));
    const result = body.execution_result || {};

    if (!actionId) return Response.json({ error:'action_id required' }, { status:400 });

    const op = await svc.entities.DomainAction.get(actionId);
    const domain = op ? await svc.entities.DomainRegistry.get(op.domain_id) : null;
    if (!op || !domain) return Response.json({ error:'Action or domain missing' }, { status:404 });

    const failures = [];
    const warnings = [];
    const protectedExecuted = Array.isArray(result.protected_actions_executed)
      ? result.protected_actions_executed : [];

    if (protectedExecuted.length) failures.push('PROTECTED_ACTION_EXECUTED');
    if (['EXTERNAL_WRITE','PROTECTED'].includes(op.action_class) && !result.blocked) {
      failures.push('PROTECTED_ACTION_REACHED_EXECUTOR');
    }

    if (op.action_type === 'DISCOVER_SITE') {
      if (!result?.probes?.root) failures.push('MISSING_ROOT_PROBE');
      if ((result?.probes?.root?.status || 0) === 0) failures.push('ROOT_UNREACHABLE');
      if ((result?.domain?.domain || '') !== domain.domain) failures.push('DOMAIN_IDENTITY_MISMATCH');
      if (!result?.probes?.robots?.ok) warnings.push('ROBOTS_NOT_200');
      if (!(result?.domain?.sitemap_urls || []).length) warnings.push('NO_SITEMAP_DISCOVERED');
    }

    if (op.action_type === 'COLLECT_GOOGLE_READ' && !result?.business_id) {
      failures.push('MISSING_BUSINESS_BINDING');
    }

    if (op.action_type === 'TECHNICAL_AUDIT' && !result?.root) {
      failures.push('MISSING_TECHNICAL_ROOT_PROBE');
    }

    let status = 'PASS';
    if (result?.blocked) status = 'BLOCKED';
    else if (failures.length) status = 'FAIL';

    const receipt = await svc.entities.DomainReceipt.create({
      run_id:runId,
      domain_id:domain.id,
      action_id:op.id,
      action_type:op.action_type,
      validator:'domain_validator',
      status,
      source_sha:body.source_sha || '',
      environment:body.environment || 'base44',
      evidence:result,
      failures,
      warnings,
      protected_actions_executed:protectedExecuted,
      started_at:op.started_at || now(),
      finished_at:now(),
      next_action:status === 'PASS'
        ? 'NEXT_DUE_ACTION'
        : status === 'BLOCKED'
          ? 'RESOLVE_BLOCKER'
          : 'REPAIR_AND_RETRY'
    });

    await svc.entities.DomainAction.update(op.id, {
      status:status === 'PASS' ? 'pass' : status === 'BLOCKED' ? 'blocked' : 'fail',
      completed_at:now(),
      validation_receipt_id:receipt.id,
      last_error:failures.join('; ')
    });

    await svc.entities.DomainRegistry.update(domain.id, {
      last_reconciled_at:now(),
      onboarding_phase:
        op.action_type === 'DISCOVER_SITE' && status === 'PASS'
          ? 'google_read'
          : domain.onboarding_phase,
      status:
        domain.status === 'onboarding' &&
        op.action_type === 'TECHNICAL_AUDIT' &&
        status === 'PASS'
          ? 'active'
          : domain.status
    });

    return Response.json({
      ok:status === 'PASS',
      status,
      receipt_id:receipt.id,
      failures,
      warnings
    }, { status:status === 'FAIL' ? 409 : 200 });
  } catch (error) {
    return Response.json({
      ok:false,
      status:'UNKNOWN',
      error:error.message
    }, { status:500 });
  }
}
