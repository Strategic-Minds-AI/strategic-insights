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

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const auth = await authorizeDomainRuntime(base44, user);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    if (auth.kind === 'runtime' && body.mode !== 'ZERO_HEARTBEAT') {
      return Response.json({ error:'Runtime principal requires ZERO_HEARTBEAT mode' }, { status:403 });
    }
    const maxDomains = Math.max(1, Math.min(Number(body.max_domains || 5), 10));
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const heartbeatBucket = Math.floor(nowMs / (5 * 60 * 1000));

    const due = await base44.asServiceRole.entities.Domain.filter(
      {
        status: 'active',
        next_scan_at: { $lte: now }
      },
      { sort: 'next_scan_at', limit: maxDomains }
    );

    const domains = due.items || due || [];
    const results = [];

    for (const domain of domains) {
      try {
        const run = await base44.functions.invoke('domain_agent_run', {
          domain_id: domain.id,
          mode: 'HEARTBEAT',
          run_id: 'heartbeat-' + domain.id + '-' + heartbeatBucket
        });
        results.push({
          domain_id: domain.id,
          domain: domain.domain,
          status: run.data?.validation?.status || 'UNKNOWN',
          receipt_id: run.data?.validation?.receipt_id || null
        });
      } catch (error) {
        results.push({
          domain_id: domain.id,
          domain: domain.domain,
          status: 'UNKNOWN',
          error: error.message
        });
      }
    }

    return Response.json({
      ok: !results.some(r => r.status === 'FAIL' || r.status === 'UNKNOWN'),
      processed_count: results.length,
      pass: results.filter(r => r.status === 'PASS').length,
      fail: results.filter(r => r.status === 'FAIL').length,
      blocked: results.filter(r => r.status === 'BLOCKED').length,
      unknown: results.filter(r => r.status === 'UNKNOWN').length,
      results
    }, {
      status: results.some(r => r.status === 'FAIL' || r.status === 'UNKNOWN') ? 409 : 200
    });
  } catch (error) {
    return Response.json({ ok: false, status: 'UNKNOWN', error: error.message }, { status: 500 });
  }
}
