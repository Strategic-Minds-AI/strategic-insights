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
    const decision = String(body.decision || '').toLowerCase();
    if (!approvalId || !['approve','deny'].includes(decision)) {
      return Response.json({ error:'approval_id and decision=approve|deny are required' }, { status:400 });
    }

    const svc = base44.asServiceRole;
    const approval = await svc.entities.DomainApproval.get(approvalId);
    if (!approval) return Response.json({ error:'Approval not found' }, { status:404 });
    if (!['pending','approved'].includes(approval.status)) {
      return Response.json({ error:'Approval is not decision-eligible', status:approval.status }, { status:409 });
    }

    const decidedAt = now();
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const status = decision === 'approve' ? 'approved' : 'denied';
    const updated = await svc.entities.DomainApproval.update(approvalId, {
      status,
      decided_at:decidedAt,
      decided_by:user.email || user.id || 'admin',
      expires_at:decision === 'approve' ? expires : decidedAt
    });

    if (approval.domain_id) {
      const actions = await svc.entities.DomainAction.filter({ approval_id:approvalId }, { limit:20 }).catch(() => []);
      for (const action of (actions.items || actions || [])) {
        await svc.entities.DomainAction.update(action.id, {
          approval_status:status,
          status:decision === 'approve' ? 'in_progress' : 'dismissed'
        });
      }
    }

    return Response.json({ ok:true, decision, approval:updated });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:500 });
  }
}
