import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

function now() { return new Date().toISOString(); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error:'Unauthorized' }, { status:401 });
    if (user.role !== 'admin') return Response.json({ error:'Forbidden' }, { status:403 });

    const body = await req.json().catch(() => ({}));
    const approvalId = String(body.approval_id || '');
    if (!approvalId) return Response.json({ error:'approval_id is required' }, { status:400 });

    const svc = base44.asServiceRole;
    const approval = await svc.entities.DomainApproval.get(approvalId);
    if (!approval) return Response.json({ error:'Approval not found' }, { status:404 });
    if (approval.status !== 'approved') {
      return Response.json({ ok:false, blocked:true, reason:'APPROVAL_REQUIRED', approval_status:approval.status }, { status:409 });
    }
    if (approval.expires_at && Date.parse(approval.expires_at) <= Date.now()) {
      await svc.entities.DomainApproval.update(approvalId, { status:'expired', last_error:'Approval expired before execution' });
      return Response.json({ ok:false, blocked:true, reason:'APPROVAL_EXPIRED' }, { status:409 });
    }

    await svc.entities.DomainApproval.update(approvalId, { status:'executing', last_error:'' });

    let execution;
    try {
      if (approval.action_type === 'SUBMIT_SITEMAP') {
        const r = await base44.functions.invoke('push_sitemap_to_gsc', {
          domain_id:approval.domain_id,
          approval_id:approvalId
        });
        execution = r.data;
      } else if (approval.action_type === 'CREATE_GA4_PROPERTIES_BULK') {
        const r = await base44.functions.invoke('provision_ga4_properties', {
          dry_run:false,
          approval_id:approvalId
        });
        execution = r.data;
      } else if (approval.action_type === 'CREATE_GSC_PROPERTIES_BULK') {
        const r = await base44.functions.invoke('provision_gsc_properties', {
          dry_run:false,
          approval_id:approvalId
        });
        execution = r.data;
      } else {
        execution = { status:'blocked', error:'No protected executor implemented for ' + approval.action_type };
      }
    } catch (error) {
      execution = { status:'error', error:error.message };
    }

    const validation = await base44.functions.invoke('protected_action_validator', {
      approval_id:approvalId,
      execution_result:execution
    });

    const passed = validation.data?.status === 'PASS';
    const approvalUpdate = {
      status:passed ? 'consumed' : 'failed',
      execution_result:execution,
      validation_receipt_id:validation.data?.receipt_id || '',
      last_error:passed ? '' : (validation.data?.failures || []).join('; ')
    };
    if (passed) approvalUpdate.consumed_at = now();
    await svc.entities.DomainApproval.update(approvalId, approvalUpdate);

    if (approval.domain_id) {
      const actions = await svc.entities.DomainAction.filter({ approval_id:approvalId }, { limit:20 }).catch(() => []);
      for (const action of (actions.items || actions || [])) {
        await svc.entities.DomainAction.update(action.id, {
          approval_status:passed ? 'consumed' : 'failed',
          status:passed ? 'resolved' : 'open'
        });
      }
    }

    return Response.json({
      ok:passed,
      approval_id:approvalId,
      action_type:approval.action_type,
      execution,
      validation:validation.data
    }, { status:passed ? 200 : 409 });
  } catch (error) {
    return Response.json({ ok:false, status:'UNKNOWN', error:error.message }, { status:500 });
  }
}
