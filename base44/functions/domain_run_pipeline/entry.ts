import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

async function authorizeDomainRuntime(base44, user) {
  if (!user) return { ok:false, status:401, error:'Unauthorized' };
  if (user.role === 'admin') return { ok:true, kind:'admin' };

  const rowsRes = await base44.asServiceRole.entities.RuntimePrincipal.filter(
    { user_id:user.id, status:'active' },
    { limit:10 }
  ).catch(() => []);
  const rows = rowsRes.items || rowsRes || [];
  const nowMs = Date.now();
  const principal = rows.find(row => {
    const scopes = Array.isArray(row.scopes) ? row.scopes : [];
    if (!scopes.includes('DOMAIN_RUNTIME')) return false;
    if (row.expires_at) {
      const expiry = Date.parse(row.expires_at);
      if (!Number.isFinite(expiry) || expiry <= nowMs) return false;
    }
    return true;
  });

  return principal
    ? { ok:true, kind:'runtime', principal_id:principal.id }
    : { ok:false, status:403, error:'Runtime scope forbidden' };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const auth = await authorizeDomainRuntime(base44, user);
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const { domain_url, domain_id, action } = body;
    if (auth.kind === 'runtime' && (!domain_id || domain_url || action === 'process_all')) {
      return Response.json({ error:'Runtime principal may only process one existing domain_id' }, { status:403 });
    }

    // Process all due domains
    if (action === 'process_all') {
      const due = await base44.entities.Domain.filter(
        { status: 'active', next_scan_at: { $lte: new Date().toISOString() } },
        { limit: 5 }
      );
      const items = due.items || [];
      const results = [];
      for (const d of items) {
        try {
          await processDomain(base44, d);
          results.push({ domain: d.domain, status: 'ok' });
        } catch (e) {
          results.push({ domain: d.domain, status: 'error', error: e.message });
        }
      }
      return Response.json({ processed: results });
    }

    // Find or create domain
    let domain;
    if (domain_id) {
      domain = await base44.entities.Domain.get(domain_id);
    } else if (domain_url) {
      const cleanDomain = domain_url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
      const existing = await base44.entities.Domain.filter({ domain: cleanDomain }, { limit: 1 });
      if (existing.items && existing.items.length > 0) {
        domain = existing.items[0];
      } else {
        domain = await base44.entities.Domain.create({
          domain: cleanDomain,
          url: domain_url.startsWith('http') ? domain_url : `https://${domain_url}`,
          status: 'onboarding',
        });
      }
    } else {
      return Response.json({ error: 'Provide domain_url or domain_id' }, { status: 400 });
    }

    const result = await processDomain(base44, domain);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function processDomain(base44, domain) {
  const results = { domain: domain.domain, domain_id: domain.id, actions: [] };

  await base44.entities.Domain.update(domain.id, { status: 'onboarding', last_error: '' });

  // Step 1: Fetch robots.txt and sitemap
  const baseUrl = domain.url || `https://${domain.domain}`;
  try {
    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    if (robotsRes.ok) {
      const robots = await robotsRes.text();
      results.robots = robots.substring(0, 5000);
      await base44.entities.Domain.update(domain.id, { robots_txt: results.robots });
      const sitemapMatch = robots.match(/Sitemap:\s*(.+)/i);
      if (sitemapMatch) results.sitemap_url = sitemapMatch[1].trim();
    }
  } catch (e) { results.robots_error = e.message; }

  // Fetch sitemap
  const sitemapUrl = results.sitemap_url || `${baseUrl}/sitemap.xml`;
  try {
    const sitemapRes = await fetch(sitemapUrl);
    if (sitemapRes.ok) {
      const sitemapXml = await sitemapRes.text();
      const urlCount = (sitemapXml.match(/<url>/g) || []).length;
      await base44.entities.Domain.update(domain.id, {
        sitemap_url: sitemapUrl,
        sitemap_status: `Found ${urlCount} URLs`,
        page_count: urlCount,
      });
      results.sitemap = { url: sitemapUrl, url_count: urlCount };
    } else {
      await base44.entities.Domain.update(domain.id, { sitemap_status: `Not found (${sitemapRes.status})` });
      results.sitemap = { status: 'not_found', code: sitemapRes.status };
    }
  } catch (e) { results.sitemap_error = e.message; }

  // Step 2: Search Console data
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_search_console');
    const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const sitesData = await sitesRes.json();
    const matchingSite = (sitesData.siteEntry || []).find(s => s.siteUrl.includes(domain.domain));

    if (matchingSite) {
      await base44.entities.Domain.update(domain.id, { gsc_property: matchingSite.siteUrl });
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);

      const analyticsRes = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(matchingSite.siteUrl)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            dimensions: ['query'],
            rowLimit: 50,
          }),
        }
      );
      const analyticsData = await analyticsRes.json();
      const rows = analyticsData.rows || [];
      const totalClicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
      const totalImpressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgPosition = rows.length > 0 ? rows.reduce((s, r) => s + (r.position || 0), 0) / rows.length : 0;

      results.search_console = {
        property: matchingSite.siteUrl,
        total_clicks: totalClicks,
        total_impressions: totalImpressions,
        avg_ctr: avgCtr.toFixed(2) + '%',
        avg_position: avgPosition.toFixed(1),
        top_queries: rows.slice(0, 10).map(r => ({
          query: r.keys[0], clicks: r.clicks, impressions: r.impressions,
          ctr: (r.ctr * 100).toFixed(2) + '%', position: r.position.toFixed(1),
        })),
      };

      await base44.entities.DomainMetric.create({
        domain_id: domain.id, domain: domain.domain,
        date: new Date().toISOString().split('T')[0],
        source: 'google_search_console',
        metrics: results.search_console,
        summary: `${totalClicks} clicks, ${totalImpressions} impressions, ${avgCtr.toFixed(1)}% CTR, pos ${avgPosition.toFixed(1)}`,
      });
    } else {
      results.search_console = { status: 'no_property_found' };
    }
  } catch (e) { results.search_console_error = e.message; }

  // Step 3: GA4 data
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_analytics');
    const propsRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/properties', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    const propsData = await propsRes.json();
    const properties = propsData.properties || [];

    if (properties.length > 0) {
      const property = properties[0];
      const propertyId = property.name.split('/')[1];
      await base44.entities.Domain.update(domain.id, { ga4_property_id: propertyId });

      const reportRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'totalUsers' }, { name: 'sessions' },
            { name: 'screenPageViews' }, { name: 'conversions' },
          ],
        }),
      });
      const reportData = await reportRes.json();
      const totals = (reportData.totals || [{}])[0]?.metricValues || [];
      results.analytics = {
        property_id: propertyId,
        property_name: property.displayName,
        total_users: totals[0]?.value || '0',
        sessions: totals[1]?.value || '0',
        page_views: totals[2]?.value || '0',
        conversions: totals[3]?.value || '0',
      };

      await base44.entities.DomainMetric.create({
        domain_id: domain.id, domain: domain.domain,
        date: new Date().toISOString().split('T')[0],
        source: 'google_analytics',
        metrics: results.analytics,
        summary: `${results.analytics.total_users} users, ${results.analytics.sessions} sessions, ${results.analytics.conversions} conversions`,
      });
    } else {
      results.analytics = { status: 'no_properties' };
    }
  } catch (e) { results.analytics_error = e.message; }

  // Step 4: Competitor scan using AI with web search
  try {
    const aiRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a strategic SEO and competitor intelligence agent. Analyze the domain "${domain.domain}" and its industry.

1. Identify the top 3-5 real competitors ranking for similar searches
2. For each competitor, identify key strengths, content gaps, and keyword opportunities
3. Identify the top 10 target keywords this domain should pursue
4. Identify 3-5 specific content gaps and opportunities

Return your analysis as JSON.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          competitors: { type: 'array', items: { type: 'object', properties: {
            url: { type: 'string' }, name: { type: 'string' }, strengths: { type: 'string' },
            content_gaps: { type: 'string' }, keyword_gaps: { type: 'string' },
          } } },
          target_keywords: { type: 'array', items: { type: 'string' } },
          content_opportunities: { type: 'array', items: { type: 'object', properties: {
            title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' },
          } } },
          overall_assessment: { type: 'string' },
        },
      },
    });

    results.competitors = aiRes;

    for (const comp of (aiRes.competitors || [])) {
      await base44.entities.CompetitorScan.create({
        domain_id: domain.id, domain: domain.domain,
        competitor_url: comp.url, competitor_name: comp.name,
        findings: JSON.stringify(comp),
        content_gaps: comp.content_gaps, keyword_gaps: comp.keyword_gaps,
        strengths: comp.strengths, scanned_at: new Date().toISOString(),
      });
    }

    await base44.entities.Domain.update(domain.id, {
      target_keywords: JSON.stringify(aiRes.target_keywords || []),
      competitors: JSON.stringify((aiRes.competitors || []).map(c => c.url)),
    });

    for (const opp of (aiRes.content_opportunities || [])) {
      await base44.entities.DomainAction.create({
        domain_id: domain.id, domain: domain.domain,
        type: 'content', title: opp.title, description: opp.description,
        priority: opp.priority || 'medium', status: 'open',
        ai_recommendation: opp.description, created_at_scan: new Date().toISOString(),
      });
      results.actions.push(opp.title);
    }
  } catch (e) { results.competitor_error = e.message; }

  // Step 5: Generate AI action items from all collected data
  try {
    const actionRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a strategic domain operations agent. Based on the following data for domain "${domain.domain}", generate 3-5 specific actionable recommendations.

Data:
- Sitemap: ${JSON.stringify(results.sitemap)}
- Search Console: ${JSON.stringify(results.search_console)}
- Analytics: ${JSON.stringify(results.analytics)}
- Competitor assessment: ${results.competitors?.overall_assessment || 'N/A'}

Return as JSON with actions array.`,
      response_json_schema: {
        type: 'object',
        properties: {
          actions: { type: 'array', items: { type: 'object', properties: {
            type: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
            priority: { type: 'string' }, estimated_impact: { type: 'string' },
            action_steps: { type: 'array', items: { type: 'string' } },
          } } },
        },
      },
    });

    for (const action of (actionRes.actions || [])) {
      await base44.entities.DomainAction.create({
        domain_id: domain.id, domain: domain.domain,
        type: action.type || 'seo', title: action.title, description: action.description,
        priority: action.priority || 'medium', status: 'open',
        ai_recommendation: action.description,
        ai_action_steps: JSON.stringify(action.action_steps || []),
        estimated_impact: action.estimated_impact || '',
        created_at_scan: new Date().toISOString(),
      });
      results.actions.push(action.title);
    }
  } catch (e) { results.action_error = e.message; }

  // Calculate health score
  let healthScore = 40;
  if (results.sitemap?.url_count > 0) healthScore += 15;
  if (results.search_console?.total_clicks > 0) healthScore += 20;
  if (results.analytics?.total_users > 0) healthScore += 15;
  if (results.robots) healthScore += 5;
  if (results.competitors?.competitors?.length > 0) healthScore += 5;
  healthScore = Math.min(healthScore, 100);

  const nextScan = new Date();
  nextScan.setDate(nextScan.getDate() + 1);

  await base44.entities.Domain.update(domain.id, {
    status: 'active',
    last_scan_at: new Date().toISOString(),
    next_scan_at: nextScan.toISOString(),
    health_score: healthScore,
  });

  results.health_score = healthScore;
  return results;
}