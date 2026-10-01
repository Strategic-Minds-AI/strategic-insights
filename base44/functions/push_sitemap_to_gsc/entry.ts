import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

function normalizeHost(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.startsWith('sc-domain:')) {
    return raw.slice('sc-domain:'.length).replace(/^www\./, '').replace(/\/$/, '');
  }
  try {
    const url = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  }
}

function searchConsolePropertyMatches(siteUrl, domain) {
  return normalizeHost(siteUrl) === normalizeHost(domain);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { domain_id, approval_id } = body;

    if (!domain_id) return Response.json({ error: 'domain_id is required' }, { status: 400 });
    if (!approval_id) {
      return Response.json({ ok: false, blocked: true, reason: 'APPROVAL_REQUIRED' }, { status: 409 });
    }

    const svc = base44.asServiceRole;
    const domain = await svc.entities.Domain.get(domain_id);
    if (!domain) return Response.json({ error: 'Domain not found' }, { status: 404 });

    const approval = await svc.entities.DomainApproval.get(String(approval_id));
    if (
      !approval ||
      approval.action_type !== 'SUBMIT_SITEMAP' ||
      approval.domain_id !== domain_id ||
      approval.status !== 'executing'
    ) {
      return Response.json(
        { ok: false, blocked: true, reason: 'VALID_EXECUTING_APPROVAL_REQUIRED' },
        { status: 409 }
      );
    }
    if (approval.expires_at && Date.parse(approval.expires_at) <= Date.now()) {
      return Response.json({ ok: false, blocked: true, reason: 'APPROVAL_EXPIRED' }, { status: 409 });
    }

    const baseUrl = domain.url || `https://${domain.domain}`;
    const sitemapUrl = domain.sitemap_url || `${baseUrl.replace(/\/$/, '')}/sitemap.xml`;

    let accessToken;
    try {
      const conn = await svc.connectors.getConnection('google_search_console');
      accessToken = conn?.accessToken;
    } catch (error) {
      return Response.json(
        { error: 'Google Search Console connector not available', detail: error.message },
        { status: 503 }
      );
    }
    if (!accessToken) {
      return Response.json({ error: 'Google Search Console access token unavailable' }, { status: 503 });
    }

    let siteUrl = domain.gsc_property;
    if (siteUrl && !searchConsolePropertyMatches(siteUrl, domain.domain)) {
      siteUrl = '';
    }

    if (!siteUrl) {
      const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!sitesRes.ok) {
        const detail = await sitesRes.text();
        return Response.json(
          { error: 'Unable to list Search Console properties', code: sitesRes.status, detail },
          { status: 502 }
        );
      }

      const sitesData = await sitesRes.json();
      const match = (sitesData.siteEntry || []).find((site) =>
        searchConsolePropertyMatches(site.siteUrl, domain.domain)
      );
      if (match) {
        siteUrl = match.siteUrl;
        await svc.entities.Domain.update(domain.id, { gsc_property: siteUrl });
      }
    }

    if (!siteUrl) {
      await svc.entities.Domain.update(domain.id, {
        last_error: 'No exact Search Console property found for sitemap submission',
      });
      return Response.json(
        { status: 'no_property', message: `No exact GSC property found for ${domain.domain}` },
        { status: 409 }
      );
    }

    const encodedSite = encodeURIComponent(siteUrl);
    const encodedSitemap = encodeURIComponent(sitemapUrl);
    const submitRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedSitemap}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!submitRes.ok) {
      const detail = await submitRes.text();
      await svc.entities.Domain.update(domain.id, {
        last_error: `Sitemap submission failed: ${submitRes.status} ${detail}`,
        sitemap_status: `Submission failed (${submitRes.status})`,
      });
      return Response.json(
        { status: 'error', code: submitRes.status, detail },
        { status: 502 }
      );
    }

    let sitemapInfo = null;
    const listRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      sitemapInfo = (listData.sitemap || []).find((item) => item.path === sitemapUrl) || null;
    }

    const statusText = sitemapInfo
      ? `Submitted — ${sitemapInfo.errors || '0'} errors, ${sitemapInfo.isPending ? 'pending' : 'processed'}`
      : 'Submitted to Search Console';

    await svc.entities.Domain.update(domain.id, {
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
