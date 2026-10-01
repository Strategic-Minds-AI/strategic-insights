import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// ── Helpers ─────────────────────────────────────────────────────────
function extractDomain(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch { return (url || '').replace(/^www\./, '').toLowerCase(); }
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

async function gaListProperties(token) {
  const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/properties?pageSize=100', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.properties || []).map(p => ({
    id: p.name, // "properties/123456"
    displayName: p.displayName,
    websiteUrl: p.websiteUrl || '',
    industry: p.industryCategory || '',
    domain: extractDomain(p.websiteUrl || p.displayName || ''),
  }));
}

async function gaRunReport(token, propertyId) {
  const body = {
    dateRanges: [{ startDate: dateNDaysAgo(28), endDate: dateNDaysAgo(1) }],
    dimensions: [
      { name: 'sessionDefaultChannelGroup' },
      { name: 'deviceCategory' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'conversions' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
    ],
    limit: 25,
  };
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const totals = {};
  (data.totals || []).forEach(t => {
    (t.metricValues || []).forEach((mv, i) => {
      const name = body.metrics[i].name;
      totals[name] = parseFloat(mv.value) || 0;
    });
  });
  const rows = (data.rows || []).slice(0, 10).map(r => ({
    channel: r.dimensionValues?.[0]?.value,
    device: r.dimensionValues?.[1]?.value,
    sessions: parseFloat(r.metricValues?.[0]?.value) || 0,
    users: parseFloat(r.metricValues?.[1]?.value) || 0,
    conversions: parseFloat(r.metricValues?.[3]?.value) || 0,
  }));
  return { totals, rows };
}

async function scListSites(token) {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.siteEntry || []).map(s => ({
    siteUrl: s.siteUrl,
    permissionLevel: s.permissionLevel,
    domain: extractDomain(s.siteUrl),
  }));
}

async function scQuery(token, siteUrl) {
  const body = {
    startDate: dateNDaysAgo(28),
    endDate: dateNDaysAgo(1),
    dimensions: ['query'],
    rowLimit: 15,
    startRow: 0,
  };
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const rows = (data.rows || []).map(r => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const avgPosition = rows.length ? rows.reduce((s, r) => s + r.position, 0) / rows.length : 0;
  return { topQueries: rows, totalClicks, totalImpressions, avgPosition };
}

async function sheetsListSpreadsheets(token) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%22application%2Fvnd.google-apps.spreadsheet%22&pageSize=10', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.files || []).map(f => ({ id: f.id, name: f.name }));
}

async function sheetsReadSample(token, spreadsheetId) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.values || [];
}

// ── Main handler ───────────────────────────────────────────────────
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const singleBusinessId = body.business_id || null;

    // 1. Pull connections
    const [gaConn, scConn, sheetsConn] = await Promise.all([
      base44.asServiceRole.connectors.getConnection('google_analytics').catch(() => null),
      base44.asServiceRole.connectors.getConnection('google_search_console').catch(() => null),
      base44.asServiceRole.connectors.getConnection('googlesheets').catch(() => null),
    ]);

    const gaToken = gaConn?.accessToken;
    const scToken = scConn?.accessToken;
    const sheetsToken = sheetsConn?.accessToken;

    // 2. Auto-detect businesses from connected accounts
    const [gaProperties, scSites] = await Promise.all([
      gaToken ? gaListProperties(gaToken) : [],
      scToken ? scListSites(scToken) : [],
    ]);

    // Match by domain
    const domainMap = {};
    gaProperties.forEach(p => {
      const d = p.domain;
      if (!domainMap[d]) domainMap[d] = { domain: d, ga: null, sc: null, name: p.displayName };
      domainMap[d].ga = p;
    });
    scSites.forEach(s => {
      const d = s.domain;
      if (!domainMap[d]) domainMap[d] = { domain: d, ga: null, sc: null, name: d };
      domainMap[d].sc = s;
    });

    // Also include SC-only sites
    const businesses = Object.values(domainMap);

    // 3. Upsert Business records
    const existingBizPage = await base44.entities.Business.list({ limit: 200 });
    const existingBusinesses = existingBizPage.items || existingBizPage || [];
    const businessRecords = [];

    for (const biz of businesses) {
      let record = existingBusinesses.find(b =>
        (b.ga_property_id && b.ga_property_id === biz.ga?.id) ||
        (b.search_console_site && b.search_console_site === biz.sc?.siteUrl) ||
        (b.website_url && extractDomain(b.website_url) === biz.domain)
      );

      const payload = {
        name: biz.name || biz.domain,
        website_url: biz.ga?.websiteUrl || (biz.sc ? `https://${biz.domain}` : ''),
        ga_property_id: biz.ga?.id || null,
        ga_property_name: biz.ga?.displayName || null,
        search_console_site: biz.sc?.siteUrl || null,
        industry: biz.ga?.industry || '',
        status: 'active',
      };

      if (record) {
        record = await base44.entities.Business.update(record.id, payload);
      } else {
        record = await base44.entities.Business.create(payload);
      }
      businessRecords.push({ ...record, _domain: biz.domain, _ga: biz.ga, _sc: biz.sc });
    }

    const toScan = singleBusinessId
      ? businessRecords.filter(b => b.id === singleBusinessId)
      : businessRecords;

    if (toScan.length === 0) {
      return Response.json({ businesses: businessRecords, gaps: [], message: 'No businesses found. Connect Google Analytics or Search Console.' });
    }

    // 4. Fetch analytics data per business + find gaps via AI
    const allGaps = [];

    for (const biz of toScan) {
      const [gaData, scData] = await Promise.all([
        biz.ga_property_id && gaToken ? gaRunReport(gaToken, biz.ga_property_id).catch(() => null) : null,
        biz.search_console_site && scToken ? scQuery(scToken, biz.search_console_site).catch(() => null) : null,
      ]);

      // Save snapshots
      const now = new Date().toISOString();

      // Fetch Google Sheets data if connected
      let sheetsData = null;
      if (sheetsToken) {
        try {
          const spreadsheets = await sheetsListSpreadsheets(sheetsToken);
          if (spreadsheets.length > 0) {
            const rows = await sheetsReadSample(sheetsToken, spreadsheets[0].id);
            sheetsData = { spreadsheet: spreadsheets[0].name, sampleRows: rows };
            await base44.entities.AnalyticsSnapshot.create({
              business_id: biz.id, source: 'google_sheets',
              metrics: { spreadsheet: spreadsheets[0].name, rows },
              period_start: dateNDaysAgo(28), period_end: dateNDaysAgo(1), fetched_at: now,
            });
          }
        } catch {}
      }

      // Read vault entries for additional data source awareness
      const vaultPage = await base44.entities.VaultEntry.filter({ status: 'active' }, { limit: 50 }).catch(() => ({}));
      const vaultEntries = vaultPage.items || vaultPage || [];
      const vaultSourceNames = vaultEntries.map(v => `${v.service}/${v.key_name}`);

      if (gaData) {
        await base44.entities.AnalyticsSnapshot.create({
          business_id: biz.id, source: 'google_analytics',
          metrics: gaData, period_start: dateNDaysAgo(28), period_end: dateNDaysAgo(1), fetched_at: now,
        });
      }
      if (scData) {
        await base44.entities.AnalyticsSnapshot.create({
          business_id: biz.id, source: 'google_search_console',
          metrics: scData, period_start: dateNDaysAgo(28), period_end: dateNDaysAgo(1), fetched_at: now,
        });
      }

      // AI gap analysis (graceful fallback if credits exhausted)
      let gaps = [];
      try {
        const aiResult = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a strategic analytics auditor. Analyze the following analytics data for the business "${biz.name}" (website: ${biz.website_url || biz._domain}).

GOOGLE ANALYTICS (last 28 days):
${gaData ? JSON.stringify(gaData.totals) : 'Not connected — this is a GAP: Google Analytics is not set up for this business.'}
Top channels: ${gaData ? JSON.stringify(gaData.rows?.slice(0, 5)) : 'N/A'}

GOOGLE SEARCH CONSOLE (last 28 days):
${scData ? `Clicks: ${scData.totalClicks}, Impressions: ${scData.totalImpressions}, Avg Position: ${scData.avgPosition?.toFixed(1)}` : 'Not connected — this is a GAP: Search Console is not verified for this business.'}
Top queries: ${scData ? JSON.stringify(scData.topQueries?.slice(0, 8)) : 'N/A'}

GOOGLE SHEETS:
${sheetsData ? `Spreadsheet: ${sheetsData.spreadsheet}, Sample rows: ${JSON.stringify(sheetsData.sampleRows?.slice(0, 5))}` : 'Not connected'}

ADDITIONAL DATA SOURCES (from Vault):
${vaultSourceNames.length > 0 ? vaultSourceNames.join(', ') : 'None configured'}

Identify the TOP 5 most impactful gaps in this business's analytics, SEO, conversion, and tracking setup. For each gap return:
- title: short name
- description: what's wrong (1-2 sentences)
- severity: "critical" | "high" | "medium" | "low"
- category: "tracking" | "seo" | "conversion" | "traffic" | "performance" | "content" | "technical" | "market"
- source: which platform revealed it
- action_url: a direct URL where the user can fix it (e.g. https://analytics.google.com, https://search.google.com/search-console, or the business website)
- ai_recommendation: exactly how to close the gap (2-3 sentences)
- ai_action_steps: a JSON array of 3-5 concrete numbered steps
- metric_value: current value if known
- benchmark_value: target/benchmark if known
- estimated_impact: what closing this gap will achieve

Focus on actionable, high-ROI gaps. If a platform is not connected, that itself is a critical gap.`,
          response_json_schema: {
            type: 'object',
            properties: {
              gaps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                    category: { type: 'string', enum: ['tracking', 'seo', 'conversion', 'traffic', 'performance', 'content', 'technical', 'market'] },
                    source: { type: 'string' },
                    action_url: { type: 'string' },
                    ai_recommendation: { type: 'string' },
                    ai_action_steps: { type: 'array', items: { type: 'string' } },
                    metric_value: { type: 'string' },
                    benchmark_value: { type: 'string' },
                    estimated_impact: { type: 'string' },
                  },
                  required: ['title', 'description', 'severity', 'category', 'ai_recommendation'],
                },
              },
            },
            required: ['gaps'],
          },
        });
        gaps = aiResult?.gaps || [];
      } catch (aiErr) {
        // Credits exhausted or AI unavailable — generate rule-based gaps from raw data
        gaps = [];
        if (!gaData) {
          gaps.push({
            title: 'Google Analytics not connected',
            description: 'No GA4 property is linked to this business. Traffic and conversion data is not being tracked.',
            severity: 'critical', category: 'tracking', source: 'system_check',
            action_url: 'https://analytics.google.com',
            ai_recommendation: 'Connect a Google Analytics 4 property to this business so traffic, audience, and conversion data flows into Strategic Analytics.',
            ai_action_steps: ['Open Google Analytics', 'Create or select a GA4 property', 'Link the property website URL to this business', 'Re-run the skip-trace scan'],
            metric_value: 'Not connected', benchmark_value: 'Connected', estimated_impact: 'Enables traffic & conversion tracking',
          });
        }
        if (!scData) {
          gaps.push({
            title: 'Search Console not verified',
            description: 'This business website is not verified in Google Search Console. Search performance and indexing data is unavailable.',
            severity: 'critical', category: 'seo', source: 'system_check',
            action_url: 'https://search.google.com/search-console',
            ai_recommendation: 'Verify the website in Google Search Console to unlock search query data, indexing status, and SEO gap analysis.',
            ai_action_steps: ['Open Search Console', 'Add the website property', 'Complete DNS or HTML verification', 'Re-run the skip-trace scan'],
            metric_value: 'Not verified', benchmark_value: 'Verified', estimated_impact: 'Unlocks SEO query & ranking data',
          });
        }
        if (gaData?.totals) {
          const t = gaData.totals;
          if ((t.conversions || 0) === 0) {
            gaps.push({
              title: 'Zero conversions tracked in 28 days',
              description: 'No conversion events are firing. Either no conversions occurred or conversion tracking is misconfigured.',
              severity: 'high', category: 'conversion', source: 'google_analytics',
              action_url: 'https://analytics.google.com',
              ai_recommendation: 'Set up conversion events in GA4 for key actions (form submits, purchases, sign-ups) to measure ROI.',
              ai_action_steps: ['Open GA4 Admin → Events', 'Mark key events as conversions', 'Verify events fire via DebugView', 'Re-run the scan'],
              metric_value: '0 conversions', benchmark_value: '>0', estimated_impact: 'Enables conversion ROI measurement',
            });
          }
          if ((t.bounceRate || 0) > 0.7) {
            gaps.push({
              title: 'High bounce rate',
              description: `Bounce rate is ${(t.bounceRate * 100).toFixed(0)}% — above the 70% benchmark, indicating weak landing page engagement.`,
              severity: 'medium', category: 'performance', source: 'google_analytics',
              action_url: biz.website_url || `https://${biz._domain}`,
              ai_recommendation: 'Improve landing page content, load speed, and call-to-action clarity to reduce bounce rate below 70%.',
              ai_action_steps: ['Audit top landing pages', 'Improve above-the-fold content', 'Add clear CTAs', 'Test page speed'],
              metric_value: `${(t.bounceRate * 100).toFixed(0)}%`, benchmark_value: '<70%', estimated_impact: 'Higher engagement & conversions',
            });
          }
        }
        if (scData?.metrics && scData.metrics.avgPosition > 20) {
          gaps.push({
            title: 'Low average search ranking',
            description: `Average position is ${scData.metrics.avgPosition.toFixed(1)} — beyond page 2, limiting organic visibility.`,
            severity: 'high', category: 'seo', source: 'google_search_console',
            action_url: 'https://search.google.com/search-console',
            ai_recommendation: 'Target queries ranking on page 2 (positions 11-20) with content optimization and link building to push them to page 1.',
            ai_action_steps: ['Filter Search Console for positions 11-20', 'Identify high-impression queries', 'Optimize on-page content', 'Build internal links'],
            metric_value: `Position ${scData.metrics.avgPosition.toFixed(1)}`, benchmark_value: '<10', estimated_impact: 'More organic traffic',
          });
        }
        gaps.push({
          title: 'AI deep-analysis pending',
          description: 'Full AI gap analysis will run automatically when integration credits reset. The gaps above are rule-based detections from your live data.',
          severity: 'low', category: 'performance', source: 'system_check',
          action_url: '', ai_recommendation: 'Re-run the scan after credits reset for the full AI-powered gap analysis with market trends and competitive insights.',
          ai_action_steps: ['Wait for credit reset', 'Re-run skip-trace scan'],
          metric_value: '', benchmark_value: '', estimated_impact: 'Full AI gap analysis',
        });
      }

      // Delete old open gaps for this business, then create new ones
      await base44.entities.Gap.deleteMany({ business_id: biz.id, status: 'open' }).catch(() => {});

      for (const g of gaps) {
        const created = await base44.entities.Gap.create({
          business_id: biz.id,
          title: g.title,
          description: g.description,
          severity: g.severity,
          category: g.category,
          source: g.source || 'ai_analysis',
          status: 'open',
          action_url: g.action_url || '',
          ai_recommendation: g.ai_recommendation,
          ai_action_steps: JSON.stringify(g.ai_action_steps || []),
          metric_value: g.metric_value || '',
          benchmark_value: g.benchmark_value || '',
          estimated_impact: g.estimated_impact || '',
        });
        allGaps.push(created);
      }

      // Update last_scan_at
      await base44.entities.Business.update(biz.id, { last_scan_at: now });
    }

    return Response.json({
      businesses: businessRecords.map(b => ({ id: b.id, name: b.name, website_url: b.website_url, ga_property_id: b.ga_property_id, search_console_site: b.search_console_site })),
      gaps: allGaps,
      scanned: toScan.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}