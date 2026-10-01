import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error:'Unauthorized' }, { status:401 });
    if (user.role !== 'admin') return Response.json({ error:'Forbidden' }, { status:403 });

    const body = await req.json().catch(() => ({}));
    const query = {};
    if (body.status) query.status = body.status;
    if (body.domain_id) query.domain_id = body.domain_id;
    const rows = await base44.asServiceRole.entities.DomainApproval.filter(
      query,
      { sort:'-requested_at', limit:Math.max(1, Math.min(Number(body.limit || 50), 100)) }
    );
    return Response.json({ ok:true, approvals:rows.items || rows || [] });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:500 });
  }
}
