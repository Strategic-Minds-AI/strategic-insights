import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { domain_id, approval_id } = body;

    if (!domain_id) return Response.json({ error: 'domain_id is required' }, { status: 400 });

    const domain = await base44.entities.Domain.get(domain_id);
    if (!domain) return Response.json({ error: 'Domain not found' }, { status: 404 });

    if (!approval_id) {
      return Response.json({ ok:false, blocked:true, reason:'APPROVAL_REQUIRED' }, { status:409 });
    }
    const approval = await base44.asServiceRole.entities.DomainApproval.get(String(approval_id));
    if (!approval || approval.action_type !== 'SUBMIT_SITEMAP' || approval.domain_id !== domain_id || approval.status !== 'executing') {
      return Response.json({ ok:false, blocked:true, reason:'VALID_EXECUTING_APPROVAL_REQUIRED' }, { status:409 });
    }
    if (approval.expires_at && Date.parse(approval.expires_at) <= Date.now()) {
      return Response.json({ ok:false, blocked:true, reason:'APPROVAL_EXPIRED' }, { status:409 });
    }

    const baseUrl = domain.url || `https://${domain.domain}`;
    const sitemapUrl = domain.sitemap_url || `${baseUrl}/sitemap.xml`;

    // Determine the GSC property URL — prefer stored property, else match by domain
    let siteUrl = domain.gsc_property;
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('google_search_console');
      accessToken = conn.accessToken;
    } catch (e) {
      return Response.json({ error: 'Google Search Console connector not available', detail: e.message }, { status: 503 });
    }

    if (!siteUrl) {
      try {
        const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const sitesData = await sitesRes.json();
        const match = (sitesData.siteEntry || []).find(s => s.siteUrl.includes(domain.domain));
        if (match) {
          siteUrl = match.siteUrl;
          await base44.entities.Domain.update(domain.id, { gsc_property: siteUrl });
        }
      } catch (e) { /* fall through */ }
    }

    if (!siteUrl) {
      await base44.entities.Domain.update(domain.id, {
        last_error: 'No matching Search Console property found for sitemap submission',
      });
      return Response.json({ status: 'no_property', message: `No GSC property found for ${domain.domain}` });
    }

    // Submit the sitemap
    const encodedSite = encodeURIComponent(siteUrl);
    const submitRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedpath: sitemapUrl }),
      }
    );

    if (!submitRes.ok) {
      const errBody = await submitRes.text();
      await base44.entities.Domain.update(domain.id, {
        last_error: `Sitemap submission failed: ${submitRes.status} ${errBody}`,
        sitemap_status: `Submission failed (${submitRes.status})`,
      });
      return Response.json({ status: 'error', code: submitRes.status, detail: errBody });
    }

    // Verify by listing sitemaps
    let sitemapInfo = null;
    try {
      const listRes = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        sitemapInfo = (listData.sitemap || []).find(s => s.path === sitemapUrl) || null;
      }
    } catch (e) { /* non-critical */ }

    const statusText = sitemapInfo
      ? `Submitted — ${sitemapInfo.errors || '0'} errors, ${sitemapInfo.isPending ? 'pending' : 'processed'}`
      : 'Submitted to Search Console';

    await base44.entities.Domain.update(domain.id, {
      sitemap_url: sitemapUrl,
      sitemap_status: statusText,
      last_error: '',
    });

    return Response.json({
      status: 'success',
      domain: domain.domain,
      site_url: siteUrl,
      sitemap_url: sitemapUrl,
      sitemap_info: sitemapInfo,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}