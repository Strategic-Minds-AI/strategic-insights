import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Auto-provision GA4 properties for every business/domain that doesn't have one.
// Creates a property under the connected GA4 account, then links the property ID back.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;
    const approvalId = String(body.approval_id || '');

    if (!dryRun) {
      if (!approvalId) {
        return Response.json({ ok:false, blocked:true, reason:'APPROVAL_REQUIRED' }, { status:409 });
      }
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
    const accountName = accounts[0].name; // accounts/XXXXX

    // Load all businesses and domains
    const [bizRes, domRes] = await Promise.allSettled([
      base44.entities.Business.filter({ status: 'active' }, { limit: 100 }),
      base44.entities.Domain.filter({}, { limit: 100 }),
    ]);
    const businesses = bizRes.status === 'fulfilled' ? (bizRes.value.items || bizRes.value || []) : [];
    const domains = domRes.status === 'fulfilled' ? (domRes.value.items || domRes.value || []) : [];

    // Collect all unique sites that need a GA4 property
    const sitesNeedingGA = [];

    for (const biz of businesses) {
      if (biz.ga_property_id) continue; // already has one
      const rawUrl = biz.website_url || biz.search_console_site || biz.name || '';
      const cleanDomain = rawUrl.replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/\/$/, '');
      if (!cleanDomain || cleanDomain.includes(' ')) continue;
      sitesNeedingGA.push({
        type: 'business',
        id: biz.id,
        name: biz.name,
        domain: cleanDomain,
        displayName: cleanDomain,
      });
    }

    for (const dom of domains) {
      if (dom.ga4_property_id) continue;
      if (!dom.domain) continue;
      // skip if already covered by a business with the same domain
      if (sitesNeedingGA.some(s => s.domain === dom.domain)) continue;
      sitesNeedingGA.push({
        type: 'domain',
        id: dom.id,
        name: dom.domain,
        domain: dom.domain,
        displayName: dom.domain,
      });
    }

    const results = [];

    for (const site of sitesNeedingGA) {
      if (dryRun) {
        results.push({
          site: site.domain,
          type: site.type,
          action: 'would_create',
          status: 'dry_run',
        });
        continue;
      }

      try {
        // Create the GA4 property
        const createRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/properties', {
          method: 'POST',
          headers: authHeader,
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
          results.push({
            site: site.domain,
            type: site.type,
            action: 'create_failed',
            status: 'error',
            error: created.error?.message || 'Unknown error',
          });
          continue;
        }

        const propertyId = created.name; // properties/XXXXX
        const numericId = created.name.replace('properties/', '');

        // Link the property ID back to the entity
        if (site.type === 'business') {
          await base44.entities.Business.update(site.id, {
            ga_property_id: numericId,
            ga_property_name: created.displayName,
          });
        } else {
          await base44.entities.Domain.update(site.id, {
            ga4_property_id: numericId,
          });
        }

        results.push({
          site: site.domain,
          type: site.type,
          action: 'created',
          status: 'success',
          property_id: propertyId,
          numeric_id: numericId,
        });
      } catch (e) {
        results.push({
          site: site.domain,
          type: site.type,
          action: 'create_failed',
          status: 'error',
          error: e.message,
        });
      }
    }

    return Response.json({
      dry_run: dryRun,
      account: accountName,
      total_sites: sitesNeedingGA.length,
      created: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}