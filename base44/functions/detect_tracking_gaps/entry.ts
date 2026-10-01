import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Scan all GA4 properties for tracking gaps: missing streams, disabled measurement,
// missing data retention, missing Google Signals, missing GSC link.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_analytics');
    const authHeader = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Load all businesses and domains with GA4 properties
    const [bizRes, domRes] = await Promise.allSettled([
      base44.entities.Business.filter({ status: 'active' }, { limit: 100 }),
      base44.entities.Domain.filter({}, { limit: 100 }),
    ]);
    const businesses = bizRes.status === 'fulfilled' ? (bizRes.value.items || bizRes.value || []) : [];
    const domains = domRes.status === 'fulfilled' ? (domRes.value.items || domRes.value || []) : [];

    const sites = [];
    const seen = new Set();
    for (const biz of businesses) {
      if (!biz.ga_property_id || seen.has(biz.ga_property_id)) continue;
      seen.add(biz.ga_property_id);
      sites.push({ name: biz.name, domain: (biz.website_url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''), propertyId: biz.ga_property_id, hasGSC: !!biz.search_console_site });
    }
    for (const dom of domains) {
      if (!dom.ga4_property_id || seen.has(dom.ga4_property_id)) continue;
      seen.add(dom.ga4_property_id);
      sites.push({ name: dom.domain, domain: dom.domain, propertyId: dom.ga4_property_id, hasGSC: !!dom.gsc_property });
    }

    const results = [];

    for (const site of sites) {
      const gaps = [];
      const propId = site.propertyId;

      // Check for web data streams
      try {
        const streamsRes = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${propId}/dataStreams?pageSize=50`, { headers: authHeader });
        const streamsData = await streamsRes.json();
        const streams = streamsData.dataStreams || [];
        const webStreams = streams.filter(s => s.webStreamData);
        if (webStreams.length === 0) gaps.push('No web data stream');
        site.streamCount = webStreams.length;
        site.measurementId = webStreams[0]?.webStreamData?.measurementId || null;
      } catch (e) { gaps.push('Could not check streams'); }

      // Check data retention
      try {
        const propRes = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${propId}`, { headers: authHeader });
        const propData = await propRes.json();
        const retention = propData.retentionSettings?.retentionDuration;
        if (retention !== 'FOURTEEN_MONTHS') gaps.push('Data retention not set to 14 months');
        site.retention = retention;
      } catch (e) { /* best-effort */ }

      // Check Google Signals
      try {
        const gsRes = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${propId}/googleSignalsSettings`, { headers: authHeader });
        const gsData = await gsRes.json();
        if (gsData.consent !== 'ENABLED_OVERRIDING' && gsData.consent !== 'ENABLED') gaps.push('Google Signals not enabled');
        site.googleSignals = gsData.consent;
      } catch (e) { /* best-effort */ }

      // Check GSC link
      if (!site.hasGSC) gaps.push('No Search Console property linked');

      results.push({ ...site, gaps, gapCount: gaps.length });
    }

    const totalGaps = results.reduce((sum, r) => sum + r.gapCount, 0);
    const sitesWithGaps = results.filter(r => r.gapCount > 0).length;

    return Response.json({
      total_sites: sites.length,
      sites_with_gaps: sitesWithGaps,
      total_gaps: totalGaps,
      results: results.sort((a, b) => b.gapCount - a.gapCount),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}