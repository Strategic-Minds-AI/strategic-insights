import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const SAFE_CLASSES = new Set(['READ','DRAFT','BRANCH_WRITE','PREVIEW_WRITE']);
function rows(x) { return x?.items || x || []; }
function now() { return new Date().toISOString(); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error:'Unauthorized' }, { status:401 });
    if (user.role !== 'admin') return Response.json({ error:'Forbidden' }, { status:403 });

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const runId = String(body.run_id || ('reconcile-' + Date.now()));
    const maxActions = Math.max(1, Math.min(Number(body.max_actions || 5), 10));

    await base44.functions.invoke('domain_operations', { action:'seedDueActions' });

    const queued = rows(await svc.entities.DomainAction.filter(
      { status:'queued' }, { sort:'due_at', limit:100 }
    ));

    const nowMs = Date.now();
    const due = queued.filter(a => !a.due_at || Date.parse(a.due_at) <= nowMs);

    const protectedPending = due.filter(a =>
      a.approval_required || !SAFE_CLASSES.has(a.action_class)
    );

    for (const op of protectedPending) {
      await svc.entities.DomainAction.update(op.id, { status:'approval_required' });
    }

    const eligible = due
      .filter(a => !a.approval_required && SAFE_CLASSES.has(a.action_class))
      .slice(0, maxActions);

    const results = [];

    for (const op of eligible) {
      let execution;
      try {
        const execRes = await base44.functions.invoke('domain_operations', {
          action:'execute',
          action_id:op.id
        });
        execution = execRes.data?.execution_result || execRes.data;
      } catch (error) {
        execution = {
          ok:false,
          error:error.message,
          protected_actions_executed:[]
        };
      }

      let validation;
      try {
        const valRes = await base44.functions.invoke('domain_validator', {
          action_id:op.id,
          run_id:runId,
          execution_result:execution,
          environment:'base44'
        });
        validation = valRes.data;
      } catch (error) {
        validation = { status:'UNKNOWN', error:error.message };
      }

      results.push({
        action_id:op.id,
        action_type:op.action_type,
        execution,
        validation
      });
    }

    const summary = {
      run_id:runId,
      at:now(),
      queued_count:queued.length,
      due_count:due.length,
      protected_blocked_count:protectedPending.length,
      eligible_count:eligible.length,
      processed_count:results.length,
      pass:results.filter(r => r.validation?.status === 'PASS').length,
      fail:results.filter(r => r.validation?.status === 'FAIL').length,
      blocked:results.filter(r => r.validation?.status === 'BLOCKED').length,
      unknown:results.filter(r => r.validation?.status === 'UNKNOWN').length,
      results
    };

    return Response.json({
      ok:summary.fail === 0 && summary.unknown === 0,
      ...summary
    }, { status:(summary.fail || summary.unknown) ? 409 : 200 });
  } catch (error) {
    return Response.json({
      ok:false,
      status:'UNKNOWN',
      error:error.message
    }, { status:500 });
  }
}
