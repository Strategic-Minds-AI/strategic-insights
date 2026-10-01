import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Auto-provision Google Search Console properties for every untracked site.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_search_console');
    const authHeader = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Load all businesses and domains
    const [bizRes, domRes] = await Promise.allSettled([
      base44.entities.Business.filter({ status: 'active' }, { limit: 100 }),
      base44.entities.Domain.filter({}, { limit: 100 }),
    ]);
    const businesses = bizRes.status === 'fulfilled' ? (bizRes.value.items || bizRes.value || []) : [];
    const domains = domRes.status === 'fulfilled' ? (domRes.value.items || domRes.value || []) : [];

    // Collect all unique sites that need a GSC property
    const sitesNeedingGSC = [];
    const seen = new Set();

    for (const biz of businesses) {
      if (biz.search_console_site) continue;
      const rawUrl = biz.website_url || '';
      const cleanDomain = rawUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!cleanDomain || seen.has(cleanDomain)) continue;
      seen.add(cleanDomain);
      sitesNeedingGSC.push({ type: 'business', id: biz.id, domain: cleanDomain, gscUrl: `sc-domain:${cleanDomain}` });
    }

    for (const dom of domains) {
      if (dom.gsc_property) continue;
      if (!dom.domain || seen.has(dom.domain)) continue;
      seen.add(dom.domain);
      sitesNeedingGSC.push({ type: 'domain', id: dom.id, domain: dom.domain, gscUrl: `sc-domain:${dom.domain}` });
    }

    const results = [];

    for (const site of sitesNeedingGSC) {
      if (dryRun) {
        results.push({ site: site.domain, type: site.type, action: 'would_add', status: 'dry_run' });
        continue;
      }

      try {
        // Add the site to Search Console
        const addRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.gscUrl)}`, {
          method: 'PUT', headers: authHeader,
        });

        if (!addRes.ok) {
          const errData = await addRes.json().catch(() => ({}));
          results.push({ site: site.domain, type: site.type, action: 'add_failed', status: 'error', error: errData.error?.message || `HTTP ${addRes.status}` });
          continue;
        }

        // Link the GSC property back
        if (site.type === 'business') {
          await base44.entities.Business.update(site.id, { search_console_site: site.gscUrl });
        } else {
          await base44.entities.Domain.update(site.id, { gsc_property: site.gscUrl });
        }

        results.push({ site: site.domain, type: site.type, action: 'added', status: 'success', gsc_url: site.gscUrl });
      } catch (e) {
        results.push({ site: site.domain, type: site.type, action: 'add_failed', status: 'error', error: e.message });
      }
    }

    return Response.json({
      dry_run: dryRun,
      total_sites: sitesNeedingGSC.length,
      added: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}