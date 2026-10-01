import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const ALLOWED = new Set([
  'SUBMIT_SITEMAP','CREATE_GA4_PROPERTIES_BULK','ADD_GSC_PROPERTY',
  'VERIFY_SITE_OWNERSHIP','CREATE_GA4_STREAM','CONFIGURE_GTM',
  'PUBLISH_GTM','DNS_VERIFICATION_WRITE','PRODUCTION_RELEASE'
]);

function now() { return new Date().toISOString(); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error:'Unauthorized' }, { status:401 });
    if (user.role !== 'admin') return Response.json({ error:'Forbidden' }, { status:403 });

    const body = await req.json().catch(() => ({}));
    const actionType = String(body.action_type || '');
    const domainId = String(body.domain_id || '');
    if (!ALLOWED.has(actionType)) {
      return Response.json({ error:'Unsupported protected action' }, { status:400 });
    }

    const svc = base44.asServiceRole;
    const idempotencyKey = String(
      body.idempotency_key || (actionType + ':' + (domainId || 'bulk') + ':v1')
    );

    const existing = await svc.entities.DomainApproval.filter(
      { idempotency_key:idempotencyKey, status:{ $in:['pending','approved','executing'] } },
      { sort:'-requested_at', limit:1 }
    );
    const rows = existing.items || existing || [];
    if (rows.length) {
      return Response.json({ ok:true, approval_required:true, reused:true, approval:rows[0] });
    }

    const approval = await svc.entities.DomainApproval.create({
      domain_id:domainId,
      action_type:actionType,
      scope_type:body.scope_type || (domainId ? 'domain' : 'bulk'),
      payload:body.payload || {},
      status:'pending',
      idempotency_key:idempotencyKey,
      requested_at:now(),
      requested_by:user.email || user.id || 'admin'
    });

    if (domainId) {
      let domain = null;
      try { domain = await svc.entities.Domain.get(domainId); } catch {}
      await svc.entities.DomainAction.create({
        domain_id:domainId,
        domain:domain?.domain || '',
        type:actionType === 'SUBMIT_SITEMAP' ? 'indexing' : 'tracking',
        title:'Approval required: ' + actionType,
        description:'Protected action is queued and will not execute until an explicit operator approval is recorded.',
        priority:'high',
        status:'open',
        ai_recommendation:'Review the requested protected action, approve or deny it, then execute only through the governed protected-action executor.',
        ai_action_steps:JSON.stringify(['Review scope','Approve or deny','Execute through protected executor','Validate receipt']),
        estimated_impact:'Governed external-account change',
        created_at_scan:now(),
        approval_id:approval.id,
        action_class:'PROTECTED',
        approval_status:'pending',
        idempotency_key:idempotencyKey
      });
    }

    return Response.json({ ok:true, approval_required:true, approval });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:500 });
  }
}
