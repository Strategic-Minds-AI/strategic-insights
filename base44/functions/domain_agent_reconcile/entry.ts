import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const maxDomains = Math.max(1, Math.min(Number(body.max_domains || 5), 10));
    const now = new Date().toISOString();

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
          run_id: 'heartbeat-' + domain.id + '-' + Date.now()
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
