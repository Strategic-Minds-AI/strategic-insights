import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

function now() { return new Date().toISOString(); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { execution_id, run_id, domain_id, execution_result } = body;
    if (!execution_id || !run_id || !domain_id) {
      return Response.json({ error: 'execution_id, run_id, and domain_id are required' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const result = execution_result || {};
    const failures = [];
    const warnings = [];
    const protectedActions = Array.isArray(result.protected_actions_executed)
      ? result.protected_actions_executed : [];

    if (protectedActions.length) failures.push('PROTECTED_ACTION_EXECUTED');
    if (result.error) failures.push('PIPELINE_ERROR:' + result.error);

    if (!result.domain_id || result.domain_id !== domain_id) {
      failures.push('DOMAIN_IDENTITY_MISMATCH');
    }
    if (!result.sitemap && !result.sitemap_error) {
      warnings.push('SITEMAP_RESULT_MISSING');
    }
    if (!result.search_console && !result.search_console_error) {
      warnings.push('SEARCH_CONSOLE_RESULT_MISSING');
    }
    if (!result.analytics && !result.analytics_error) {
      warnings.push('ANALYTICS_RESULT_MISSING');
    }

    const status = failures.length ? 'FAIL' : 'PASS';

    const receipt = await svc.entities.DomainReceipt.create({
      domain_id,
      execution_id,
      run_id,
      validator: 'domain_agent_validator',
      status,
      evidence: result,
      failures,
      warnings,
      protected_actions_executed: protectedActions,
      created_at_run: now(),
      next_action: status === 'PASS' ? 'NEXT_DUE_ACTION' : 'REPAIR_AND_RETRY'
    });

    await svc.entities.DomainExecution.update(execution_id, {
      status,
      finished_at: now(),
      result,
      validation_receipt_id: receipt.id,
      protected_actions_executed: protectedActions,
      last_error: failures.join('; ')
    });

    return Response.json({
      ok: status === 'PASS',
      status,
      receipt_id: receipt.id,
      failures,
      warnings
    }, { status: status === 'PASS' ? 200 : 409 });
  } catch (error) {
    return Response.json({ ok: false, status: 'UNKNOWN', error: error.message }, { status: 500 });
  }
}
