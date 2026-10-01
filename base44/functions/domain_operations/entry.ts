import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const SAFE_CLASSES = new Set(['READ','DRAFT','BRANCH_WRITE','PREVIEW_WRITE']);
const PROTECTED_ACTIONS = new Set([
  'ADD_GSC_PROPERTY','VERIFY_SITE_OWNERSHIP','SUBMIT_SITEMAP',
  'CREATE_GA4_PROPERTY','CREATE_GA4_STREAM','CONFIGURE_GTM',
  'PUBLISH_GTM','DNS_VERIFICATION_WRITE','PRODUCTION_RELEASE'
]);

function rows(x) { return x?.items || x || []; }
function now() { return new Date().toISOString(); }
function normalize(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) throw new Error('domain required');
  const u = new URL(raw.includes('://') ? raw : 'https://' + raw);
  const domain = u.hostname.replace(/^www\./,'');
  return { domain, canonical_url: 'https://' + domain + '/' };
}
function dayKey() { return now().slice(0,10); }

async function probe(url) {
  try {
    const res = await fetch(url, { method:'GET', redirect:'follow' });
    return {
      url,
      final_url: res.url,
      status: res.status,
      ok: res.ok,
      content_type: res.headers.get('content-type') || ''
    };
  } catch (error) {
    return { url, final_url:url, status:0, ok:false, error:error.message };
  }
}

async function listSearchConsole(token) {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) return [];
  return (await res.json()).siteEntry || [];
}

async function listAnalytics(token) {
  const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/properties?pageSize=200', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) return [];
  return (await res.json()).properties || [];
}

async function ensureAction(svc, domainId, spec) {
  const existing = rows(await svc.entities.DomainAction.filter(
    { idempotency_key: spec.idempotency_key }, { limit: 5 }
  ).catch(() => []));
  if (existing.length) return existing[0];
  return svc.entities.DomainAction.create({
    domain_id: domainId,
    status: 'queued',
    priority: 'normal',
    due_at: now(),
    attempt_count: 0,
    max_attempts: 3,
    approval_required: false,
    payload: {},
    ...spec
  });
}

async function ensureBusiness(svc, domainRecord) {
  if (domainRecord.business_id) return domainRecord.business_id;
  const existing = rows(await svc.entities.Business.filter(
    { website_url: domainRecord.canonical_url }, { limit: 5 }
  ).catch(() => []));
  if (existing.length) return existing[0].id;
  const created = await svc.entities.Business.create({
    name: domainRecord.domain,
    website_url: domainRecord.canonical_url,
    status: 'active'
  });
  return created.id;
}

async function discover(base44, domainRecord) {
  const svc = base44.asServiceRole;
  const root = await probe(domainRecord.canonical_url);
  const base = root.final_url || domainRecord.canonical_url;
  const robots = await probe(new URL('/robots.txt', base).toString());
  const sitemapTests = [
    await probe(new URL('/sitemap.xml', base).toString()),
    await probe(new URL('/sitemap_index.xml', base).toString())
  ];
  const sitemapUrls = sitemapTests
    .filter(x => x.ok)
    .map(x => x.final_url || x.url);

  const [scConn, gaConn] = await Promise.all([
    svc.connectors.getConnection('google_search_console').catch(() => null),
    svc.connectors.getConnection('google_analytics').catch(() => null)
  ]);

  const [sites, properties] = await Promise.all([
    scConn?.accessToken ? listSearchConsole(scConn.accessToken) : [],
    gaConn?.accessToken ? listAnalytics(gaConn.accessToken) : []
  ]);

  const scMatch = sites.find(s => {
    const v = String(s.siteUrl || '').toLowerCase();
    return v === 'sc-domain:' + domainRecord.domain || v.includes(domainRecord.domain);
  });

  const gaMatch = properties.find(p => {
    const v = String(p.displayName || '') + ' ' + String(p.websiteUrl || '');
    return v.toLowerCase().includes(domainRecord.domain);
  });

  const businessId = await ensureBusiness(svc, domainRecord);
  const updated = await svc.entities.DomainRegistry.update(domainRecord.id, {
    business_id: businessId,
    canonical_url: base,
    production_url: base,
    robots_url: robots.url,
    sitemap_urls: sitemapUrls,
    gsc_site_url: scMatch?.siteUrl || '',
    gsc_permission_level: scMatch?.permissionLevel || '',
    gsc_verified: !!scMatch && scMatch.permissionLevel !== 'siteUnverifiedUser',
    ga_property_id: gaMatch?.name || '',
    last_discovered_at: now(),
    onboarding_phase: 'google_read',
    source_truth: {
      root_status: root.status,
      google_search_console_connected: !!scConn?.accessToken,
      google_analytics_connected: !!gaConn?.accessToken,
      gsc_match: !!scMatch,
      ga_match: !!gaMatch
    }
  });

  if (!scMatch) {
    await ensureAction(svc, domainRecord.id, {
      action_type: 'ADD_GSC_PROPERTY',
      action_class: 'EXTERNAL_WRITE',
      status: 'approval_required',
      approval_required: true,
      idempotency_key: 'add-gsc:' + domainRecord.domain + ':v1',
      payload: { site_url: 'sc-domain:' + domainRecord.domain }
    });
  }

  if (!gaMatch) {
    await ensureAction(svc, domainRecord.id, {
      action_type: 'CREATE_GA4_PROPERTY',
      action_class: 'EXTERNAL_WRITE',
      status: 'approval_required',
      approval_required: true,
      idempotency_key: 'create-ga4:' + domainRecord.domain + ':v1'
    });
  }

  return {
    ok: root.status > 0 && root.status < 500,
    domain: updated,
    probes: { root, robots, sitemaps: sitemapTests },
    google: {
      search_console: { connected: !!scConn?.accessToken, matched: !!scMatch },
      analytics: { connected: !!gaConn?.accessToken, matched: !!gaMatch }
    },
    protected_actions_executed: []
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error:'Unauthorized' }, { status:401 });
    if (user.role !== 'admin') return Response.json({ error:'Forbidden' }, { status:403 });

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'status');

    if (action === 'addDomain') {
      const n = normalize(body.domain);
      const existing = rows(await svc.entities.DomainRegistry.filter(
        { domain:n.domain }, { limit:5 }
      ).catch(() => []));
      let record = existing[0];
      if (!record) {
        record = await svc.entities.DomainRegistry.create({
          ...n,
          status:'onboarding',
          onboarding_phase:'registered',
          target_country: body.target_country || 'US',
          target_state: body.target_state || '',
          target_city: body.target_city || '',
          target_keywords: body.target_keywords || [],
          competitor_domains: body.competitor_domains || [],
          health_score: 0,
          source_truth: { created_by:'domain_operations' }
        });
      }
      await ensureAction(svc, record.id, {
        action_type:'DISCOVER_SITE',
        action_class:'READ',
        idempotency_key:'discover:' + n.domain + ':v1'
      });
      return Response.json({ ok:true, domain:record, next_action:'DISCOVER_SITE' });
    }

    if (action === 'status') {
      const domains = rows(await svc.entities.DomainRegistry.list({ limit:200 }));
      const actions = rows(await svc.entities.DomainAction.list({ limit:300 }));
      const receipts = rows(await svc.entities.DomainReceipt.list({ limit:100 }));
      return Response.json({ ok:true, domains, actions, receipts });
    }

    if (action === 'seedDueActions') {
      const domains = rows(await svc.entities.DomainRegistry.filter(
        { status:{ $in:['onboarding','active'] } }, { limit:200 }
      ));
      let count = 0;
      for (const d of domains) {
        const specs = [
          ['COLLECT_GOOGLE_READ','READ','google-read:' + d.domain + ':' + dayKey()],
          ['TECHNICAL_AUDIT','READ','technical:' + d.domain + ':' + dayKey()]
        ];
        for (const [action_type, action_class, idempotency_key] of specs) {
          await ensureAction(svc, d.id, { action_type, action_class, idempotency_key });
          count++;
        }
      }
      return Response.json({ ok:true, seeded:count });
    }

    if (action === 'execute') {
      const actionId = String(body.action_id || '');
      if (!actionId) return Response.json({ error:'action_id required' }, { status:400 });
      const op = await svc.entities.DomainAction.get(actionId);
      if (!op) return Response.json({ error:'DomainAction not found' }, { status:404 });

      if (PROTECTED_ACTIONS.has(op.action_type) || op.approval_required || !SAFE_CLASSES.has(op.action_class)) {
        await svc.entities.DomainAction.update(op.id, { status:'approval_required' });
        return Response.json({
          ok:false, blocked:true, reason:'APPROVAL_REQUIRED',
          action_id:op.id, action_type:op.action_type
        }, { status:409 });
      }

      const domainRecord = await svc.entities.DomainRegistry.get(op.domain_id);
      if (!domainRecord) return Response.json({ error:'DomainRegistry not found' }, { status:404 });

      await svc.entities.DomainAction.update(op.id, {
        status:'running',
        started_at:now(),
        attempt_count:(op.attempt_count || 0) + 1
      });

      let result;
      if (op.action_type === 'DISCOVER_SITE') {
        result = await discover(base44, domainRecord);
      } else if (op.action_type === 'COLLECT_GOOGLE_READ') {
        const businessId = await ensureBusiness(svc, domainRecord);
        const scan = await base44.functions.invoke('strategic_scan', {
          business_id: businessId,
          force_refresh: true
        });
        result = {
          ok:true,
          business_id:businessId,
          scan:scan.data,
          protected_actions_executed:[]
        };
      } else if (op.action_type === 'TECHNICAL_AUDIT') {
        const root = await probe(domainRecord.canonical_url);
        const robots = await probe(new URL('/robots.txt', root.final_url || domainRecord.canonical_url).toString());
        const sitemaps = [];
        for (const u of (domainRecord.sitemap_urls || [])) sitemaps.push(await probe(u));
        result = { ok:root.status > 0 && root.status < 500, root, robots, sitemaps, protected_actions_executed:[] };
      } else {
        result = { ok:false, blocked:true, reason:'NO_SAFE_EXECUTOR', protected_actions_executed:[] };
      }

      await svc.entities.DomainAction.update(op.id, {
        status:'validating',
        result
      });

      return Response.json({ ok:true, action_id:op.id, execution_result:result });
    }

    return Response.json({ error:'Unknown action: ' + action }, { status:400 });
  } catch (error) {
    return Response.json({ ok:false, error:error.message }, { status:500 });
  }
}
