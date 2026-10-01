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
    const result = body.execution_result || {};
    const svc = base44.asServiceRole;
    const approval = await svc.entities.DomainApproval.get(approvalId);
    if (!approval) return Response.json({ error:'Approval not found' }, { status:404 });

    const failures = [];
    const warnings = [];
    if (result.error) failures.push('EXECUTION_ERROR:' + result.error);
    if (result.status === 'error') failures.push('PROTECTED_ACTION_RETURNED_ERROR');
    if (approval.action_type === 'SUBMIT_SITEMAP' && result.status !== 'success') {
      failures.push('SITEMAP_SUBMISSION_NOT_CONFIRMED');
    }
    if (approval.action_type === 'CREATE_GA4_PROPERTIES_BULK') {
      if (result.dry_run !== false) failures.push('GA4_EXECUTION_WAS_DRY_RUN');
      if (Number(result.failed || 0) > 0) failures.push('GA4_PROVISION_FAILURES');
    }

    const status = failures.length ? 'FAIL' : 'PASS';
    const receipt = await svc.entities.ProtectedActionReceipt.create({
      approval_id:approvalId,
      domain_id:approval.domain_id || '',
      action_type:approval.action_type,
      validator:'protected_action_validator',
      status,
      evidence:result,
      failures,
      warnings,
      validated_at:now()
    });

    return Response.json({ ok:status === 'PASS', status, receipt_id:receipt.id, failures, warnings }, {
      status:status === 'PASS' ? 200 : 409
    });
  } catch (error) {
    return Response.json({ ok:false, status:'UNKNOWN', error:error.message }, { status:500 });
  }
}
