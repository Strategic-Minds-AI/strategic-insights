import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Auto-provision GA4 properties + web data streams for every untracked site.
// Creates property, creates web stream, enables enhanced measurement, links IDs back.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;
    const approvalId = String(body.approval_id || '');

    if (!dryRun) {
      if (!approvalId) return Response.json({ ok:false, blocked:true, reason:'APPROVAL_REQUIRED' }, { status:409 });
      const approval = await base44.asServiceRole.entities.DomainApproval.get(approvalId);
      if (!approval || approval.action_type !== 'CREATE_GA4_PROPERTIES_BULK' || approval.status !== 'executing') {
        return Response.json({ ok:false, blocked:true, reason:'VALID_EXECUTING_APPROVAL_REQUIRED' }, { status:409 });
      }
      if (approval.expires_at && Date.parse(approval.expires_at) <= Date.now()) {
        return Response.json({ ok:false, blocked:true, reason:'APPROVAL_EXPIRED' }, { status:409 });
      }
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_analytics');
    const authHeader = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Find the GA4 account
    const acctsRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/accounts?pageSize=200', { headers: authHeader });
    const acctsData = await acctsRes.json();
    const accounts = acctsData.accounts || [];
    if (accounts.length === 0) {
      return Response.json({ error: 'No GA4 accounts found on this connection' }, { status: 400 });
    }
    const accountName = accounts[0].name;

    // Load all businesses and domains
    const [bizRes, domRes] = await Promise.allSettled([
      base44.entities.Business.filter({ status: 'active' }, { limit: 100 }),
      base44.entities.Domain.filter({}, { limit: 100 }),
    ]);
    const businesses = bizRes.status === 'fulfilled' ? (bizRes.value.items || bizRes.value || []) : [];
    const domains = domRes.status === 'fulfilled' ? (domRes.value.items || domRes.value || []) : [];

    // Collect all unique sites that need a GA4 property
    const sitesNeedingGA = [];
    const seenDomains = new Set();

    for (const biz of businesses) {
      if (biz.ga_property_id) continue;
      const rawUrl = biz.website_url || biz.search_console_site || '';
      const cleanDomain = rawUrl.replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/\/$/, '');
      if (!cleanDomain || cleanDomain.includes(' ') || seenDomains.has(cleanDomain)) continue;
      seenDomains.add(cleanDomain);
      sitesNeedingGA.push({ type: 'business', id: biz.id, name: biz.name, domain: cleanDomain, displayName: cleanDomain });
    }

    for (const dom of domains) {
      if (dom.ga4_property_id) continue;
      if (!dom.domain || seenDomains.has(dom.domain)) continue;
      seenDomains.add(dom.domain);
      sitesNeedingGA.push({ type: 'domain', id: dom.id, name: dom.domain, domain: dom.domain, displayName: dom.domain });
    }

    const results = [];

    for (const site of sitesNeedingGA) {
      if (dryRun) {
        results.push({ site: site.domain, type: site.type, action: 'would_create', status: 'dry_run' });
        continue;
      }

      try {
        // 1. Create the GA4 property
        const createRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/properties', {
          method: 'POST', headers: authHeader,
          body: JSON.stringify({
            parent: accountName,
            displayName: site.displayName,
            url: `https://${site.domain}`,
            industryCategory: 'TECHNOLOGY',
            timeZone: 'America/New_York',
            currencyCode: 'USD',
          }),
        });
        const created = await createRes.json();
        if (!createRes.ok) {
          results.push({ site: site.domain, type: site.type, action: 'create_failed', status: 'error', error: created.error?.message || 'Unknown error' });
          continue;
        }

        const numericId = created.name.replace('properties/', '');
        const postCreateFailures = [];

        // 2. Create a web data stream
        let streamId = null;
        let measurementId = null;
        try {
          const streamRes = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${numericId}/dataStreams`, {
            method: 'POST', headers: authHeader,
            body: JSON.stringify({
              webStreamData: { defaultUri: `https://${site.domain}` },
            }),
          });
          const streamData = await streamRes.json();
          if (streamRes.ok) {
            streamId = streamData.name?.split('/').pop();
            measurementId = streamData.webStreamData?.measurementId;
          } else {
            postCreateFailures.push('WEB_STREAM_CREATE_FAILED:' + streamRes.status);
          }
        } catch (e) { postCreateFailures.push('WEB_STREAM_CREATE_ERROR:' + e.message); }

        // 3. Set data retention to 14 months
        try {
          const retentionRes = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${numericId}`, {
            method: 'PATCH', headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ retentionSettings: { retentionDuration: 'FOURTEEN_MONTHS' } }),
          });
          if (!retentionRes.ok) postCreateFailures.push('RETENTION_UPDATE_FAILED:' + retentionRes.status);
        } catch (e) { postCreateFailures.push('RETENTION_UPDATE_ERROR:' + e.message); }

        // 4. Enable Google Signals
        try {
          const signalsRes = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${numericId}/googleSignalsSettings?updateMask=consent`, {
            method: 'PATCH', headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ consent: 'ENABLED_OVERRIDING' }),
          });
          if (!signalsRes.ok) postCreateFailures.push('GOOGLE_SIGNALS_UPDATE_FAILED:' + signalsRes.status);
        } catch (e) { postCreateFailures.push('GOOGLE_SIGNALS_UPDATE_ERROR:' + e.message); }

        // 5. Link the property ID + stream ID back to the entity
        if (site.type === 'business') {
          await base44.entities.Business.update(site.id, {
            ga_property_id: numericId,
            ga_property_name: created.displayName,
          });
        } else {
          await base44.entities.Domain.update(site.id, { ga4_property_id: numericId });
        }

        results.push({
          site: site.domain,
          type: site.type,
          action: postCreateFailures.length ? 'created_with_followup_failures' : 'created',
          status: postCreateFailures.length ? 'partial' : 'success',
          property_id: `properties/${numericId}`,
          numeric_id: numericId,
          stream_id: streamId,
          measurement_id: measurementId,
          post_create_failures: postCreateFailures,
        });
      } catch (e) {
        results.push({ site: site.domain, type: site.type, action: 'create_failed', status: 'error', error: e.message });
      }
    }

    return Response.json({
      dry_run: dryRun,
      account: accountName,
      total_sites: sitesNeedingGA.length,
      created: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error' || r.status === 'partial').length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}