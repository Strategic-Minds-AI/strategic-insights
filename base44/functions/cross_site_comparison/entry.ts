import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Cross-site comparison: fetches key metrics from GA4 for every tracked property
// and returns a comparison matrix with current period, previous period, and deltas.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const days = body.days || 30;

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
      sites.push({ name: biz.name, domain: (biz.website_url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''), propertyId: biz.ga_property_id, industry: biz.industry });
    }
    for (const dom of domains) {
      if (!dom.ga4_property_id || seen.has(dom.ga4_property_id)) continue;
      seen.add(dom.ga4_property_id);
      sites.push({ name: dom.domain, domain: dom.domain, propertyId: dom.ga4_property_id, industry: null });
    }

    // Calculate date ranges
    const today = new Date();
    const currentEnd = today.toISOString().split('T')[0];
    const currentStart = new Date(today.getTime() - days * 86400000).toISOString().split('T')[0];
    const prevEnd = new Date(today.getTime() - (days + 1) * 86400000).toISOString().split('T')[0];
    const prevStart = new Date(today.getTime() - (2 * days + 1) * 86400000).toISOString().split('T')[0];

    const metrics = [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
      { name: 'conversions' },
      { name: 'totalRevenue' },
    ];

    const results = [];

    for (const site of sites) {
      const entry = { ...site, current: {}, previous: {}, deltas: {}, status: 'ok' };

      try {
        // Fetch current period
        const curRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${site.propertyId}:runReport`, {
          method: 'POST', headers: authHeader,
          body: JSON.stringify({ dateRanges: [{ startDate: currentStart, endDate: currentEnd }], metrics }),
        });
        const curData = await curRes.json();

        if (!curRes.ok) {
          entry.status = 'error';
          entry.error = curData.error?.message || `HTTP ${curRes.status}`;
          results.push(entry);
          continue;
        }

        const curRow = curData.rows?.[0]?.metricValues || [];
        entry.current = {
          sessions: parseFloat(curRow[0]?.value || '0'),
          totalUsers: parseFloat(curRow[1]?.value || '0'),
          newUsers: parseFloat(curRow[2]?.value || '0'),
          engagementRate: parseFloat(curRow[3]?.value || '0'),
          avgSessionDuration: parseFloat(curRow[4]?.value || '0'),
          conversions: parseFloat(curRow[5]?.value || '0'),
          revenue: parseFloat(curRow[6]?.value || '0'),
        };

        // Fetch previous period
        const prevRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${site.propertyId}:runReport`, {
          method: 'POST', headers: authHeader,
          body: JSON.stringify({ dateRanges: [{ startDate: prevStart, endDate: prevEnd }], metrics }),
        });
        const prevData = await prevRes.json();
        const prevRow = prevData.rows?.[0]?.metricValues || [];
        entry.previous = {
          sessions: parseFloat(prevRow[0]?.value || '0'),
          totalUsers: parseFloat(prevRow[1]?.value || '0'),
          newUsers: parseFloat(prevRow[2]?.value || '0'),
          engagementRate: parseFloat(prevRow[3]?.value || '0'),
          avgSessionDuration: parseFloat(prevRow[4]?.value || '0'),
          conversions: parseFloat(prevRow[5]?.value || '0'),
          revenue: parseFloat(prevRow[6]?.value || '0'),
        };

        // Calculate deltas
        for (const key of Object.keys(entry.current)) {
          const cur = entry.current[key];
          const prev = entry.previous[key];
          if (prev === 0) {
            entry.deltas[key] = cur > 0 ? 100 : 0;
          } else {
            entry.deltas[key] = ((cur - prev) / prev) * 100;
          }
        }
      } catch (e) {
        entry.status = 'error';
        entry.error = e.message;
      }

      results.push(entry);
    }

    // Sort by sessions descending
    results.sort((a, b) => (b.current?.sessions || 0) - (a.current?.sessions || 0));

    // Compute aggregate totals across all sites
    const totals = {
      sessions: results.reduce((s, r) => s + (r.current?.sessions || 0), 0),
      totalUsers: results.reduce((s, r) => s + (r.current?.totalUsers || 0), 0),
      conversions: results.reduce((s, r) => s + (r.current?.conversions || 0), 0),
      revenue: results.reduce((s, r) => s + (r.current?.revenue || 0), 0),
    };

    return Response.json({
      days,
      currentPeriod: { start: currentStart, end: currentEnd },
      previousPeriod: { start: prevStart, end: prevEnd },
      totalSites: sites.length,
      totals,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}