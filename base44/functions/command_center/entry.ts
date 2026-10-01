import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Parallel data discovery: count every entity to see what exists ──
    const entityCounts = {};
    const entities = ['Domain', 'DomainMetric', 'CompetitorScan', 'DomainAction', 'Business', 'Gap', 'AnalyticsSnapshot', 'Account', 'Contact', 'Lead', 'Opportunity', 'Transaction', 'Goal', 'Investment', 'VaultEntry'];
    const countResults = await Promise.allSettled(entities.map(e => base44.entities[e].count({})));
    entities.forEach((e, i) => {
      entityCounts[e] = countResults[i].status === 'fulfilled' ? countResults[i].value : 0;
    });

    // ── Load actual data from entities that have records ──
    const [domainsRes, actionsRes, gapsRes, competitorsRes, oppsRes, txnsRes, goalsRes, vaultRes, snapshotsRes] = await Promise.allSettled([
      entityCounts.Domain > 0 ? base44.entities.Domain.filter({}, { sort: '-last_scan_at', limit: 50 }) : null,
      entityCounts.DomainAction > 0 ? base44.entities.DomainAction.filter({ status: 'open' }, { sort: '-created_date', limit: 30 }) : null,
      entityCounts.Gap > 0 ? base44.entities.Gap.filter({ status: 'open' }, { sort: '-created_date', limit: 20 }) : null,
      entityCounts.CompetitorScan > 0 ? base44.entities.CompetitorScan.filter({}, { sort: '-created_date', limit: 20 }) : null,
      entityCounts.Opportunity > 0 ? base44.entities.Opportunity.filter({}, { limit: 100 }) : null,
      entityCounts.Transaction > 0 ? base44.entities.Transaction.filter({}, { sort: '-date', limit: 100 }) : null,
      entityCounts.Goal > 0 ? base44.entities.Goal.filter({ status: 'active' }, { limit: 50 }) : null,
      entityCounts.VaultEntry > 0 ? base44.entities.VaultEntry.filter({ status: 'active' }, { limit: 50 }) : null,
      entityCounts.AnalyticsSnapshot > 0 ? base44.entities.AnalyticsSnapshot.filter({}, { sort: '-created_date', limit: 30 }) : null,
    ]);

    const domains = domainsRes.status === 'fulfilled' && domainsRes.value ? (domainsRes.value.items || domainsRes.value) : [];
    const actions = actionsRes.status === 'fulfilled' && actionsRes.value ? (actionsRes.value.items || actionsRes.value) : [];
    const gaps = gapsRes.status === 'fulfilled' && gapsRes.value ? (gapsRes.value.items || gapsRes.value) : [];
    const competitors = competitorsRes.status === 'fulfilled' && competitorsRes.value ? (competitorsRes.value.items || competitorsRes.value) : [];
    const opportunities = oppsRes.status === 'fulfilled' && oppsRes.value ? (oppsRes.value.items || oppsRes.value) : [];
    const transactions = txnsRes.status === 'fulfilled' && txnsRes.value ? (txnsRes.value.items || txnsRes.value) : [];
    const goals = goalsRes.status === 'fulfilled' && goalsRes.value ? (goalsRes.value.items || goalsRes.value) : [];
    const vaultEntries = vaultRes.status === 'fulfilled' && vaultRes.value ? (vaultRes.value.items || vaultRes.value) : [];
    const snapshots = snapshotsRes.status === 'fulfilled' && snapshotsRes.value ? (snapshotsRes.value.items || snapshotsRes.value) : [];

    // ── Aggregate CRM pipeline ──
    const pipelineValue = opportunities.reduce((s, o) => s + (o.amount || 0), 0);
    const wonOpps = opportunities.filter(o => o.stage === 'closed_won');
    const lostOpps = opportunities.filter(o => o.stage === 'closed_lost');
    const winRate = (wonOpps.length + lostOpps.length) > 0 ? (wonOpps.length / (wonOpps.length + lostOpps.length)) * 100 : 0;

    // ── Aggregate financials ──
    const revenue = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const netProfit = revenue - expenses;

    // ── Aggregate SEO across all domains ──
    let totalClicks = 0, totalImpressions = 0, totalUsers = 0, totalConversions = 0;
    const domainSummaries = [];
    for (const d of domains) {
      const metricsRes = await base44.entities.DomainMetric.filter({ domain_id: d.id }, { sort: '-created_date', limit: 2 });
      const dm = (metricsRes.items || metricsRes);
      const gsc = dm.find(m => m.source === 'google_search_console');
      const ga4 = dm.find(m => m.source === 'google_analytics');
      if (gsc) { totalClicks += gsc.metrics?.total_clicks || 0; totalImpressions += gsc.metrics?.total_impressions || 0; }
      if (ga4) { totalUsers += parseInt(ga4.metrics?.total_users || '0'); totalConversions += parseInt(ga4.metrics?.conversions || '0'); }
      domainSummaries.push({
        domain: d.domain, health: d.health_score || 0, status: d.status,
        clicks: gsc?.metrics?.total_clicks || 0, users: ga4?.metrics?.total_users || 0,
        pages: d.page_count || 0, competitors: d.competitors ? JSON.parse(d.competitors || '[]').length : 0,
      });
    }

    // ── Alerts: detect anomalies ──
    const alerts = [];
    domains.forEach(d => {
      if (d.status === 'error') alerts.push({ severity: 'critical', title: `${d.domain} scan failed`, message: d.last_error || 'Unknown error' });
    });
    actions.filter(a => a.priority === 'critical').forEach(a => {
      alerts.push({ severity: 'critical', title: a.title, message: a.description, domain: a.domain });
    });
    gaps.filter(g => g.severity === 'critical').forEach(g => {
      alerts.push({ severity: 'high', title: g.title, message: g.description });
    });
    if (netProfit < 0) alerts.push({ severity: 'high', title: 'Negative cash flow', message: `Net profit is ${netProfit}` });

    // ── Self-discovery: what's connected, what's missing ──
    const connectedSources = [];
    const sourceChecks = await Promise.allSettled([
      base44.asServiceRole.connectors.getConnection('google_search_console').then(() => 'google_search_console'),
      base44.asServiceRole.connectors.getConnection('google_analytics').then(() => 'google_analytics'),
      base44.asServiceRole.connectors.getConnection('googlesheets').then(() => 'google_sheets'),
      base44.asServiceRole.connectors.getConnection('googledrive').then(() => 'google_drive'),
      base44.asServiceRole.connectors.getConnection('github').then(() => 'github'),
      base44.asServiceRole.connectors.getConnection('supabase').then(() => 'supabase'),
    ]);
    sourceChecks.forEach(s => { if (s.status === 'fulfilled') connectedSources.push(s.value); });

    const allAvailableSources = ['google_search_console', 'google_analytics', 'google_sheets', 'google_drive', 'github', 'supabase', 'gmail', 'googlecalendar', 'hubspot', 'slack'];
    const missingSources = allAvailableSources.filter(s => !connectedSources.includes(s));

    // Data completeness score
    const totalPossibleSources = allAvailableSources.length;
    const dataCompleteness = Math.round((connectedSources.length / totalPossibleSources) * 100);

    // Entity coverage
    const entitiesWithData = entities.filter(e => entityCounts[e] > 0);
    const entityCoverage = Math.round((entitiesWithData.length / entities.length) * 100);

    // ── Generate AI strategic insights ──
    let insights = null;
    let selfBuildPlan = null;
    try {
      const insightRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the strategic intelligence engine for a business owner's command center. Analyze this aggregated data and generate actionable strategic insights.

DATA SUMMARY:
- Domains tracked: ${domains.length}
- Total clicks (28d): ${totalClicks}, Total impressions: ${totalImpressions}
- Total users (28d): ${totalUsers}, Total conversions: ${totalConversions}
- CRM pipeline value: ${pipelineValue}, Win rate: ${winRate.toFixed(1)}%
- Revenue: ${revenue}, Expenses: ${expenses}, Net: ${netProfit}
- Open actions: ${actions.length}, Critical alerts: ${alerts.length}
- Competitors tracked: ${competitors.length}
- Connected data sources: ${connectedSources.join(', ')}
- Data completeness: ${dataCompleteness}%

DOMAIN SUMMARIES: ${JSON.stringify(domainSummaries.slice(0, 5))}
TOP ACTIONS: ${JSON.stringify(actions.slice(0, 5).map(a => ({ title: a.title, priority: a.priority, domain: a.domain })))}

Generate a JSON response with:
1. "headline_insight" - the single most important thing the business owner should know (1-2 sentences)
2. "growth_opportunities" - 3 specific growth opportunities with estimated impact
3. "risks" - 2-3 risks to watch
4. "recommended_actions" - 3 immediate actions prioritized by impact
5. "self_build_suggestions" - 3 things the system should connect or track next to improve intelligence`,
        response_json_schema: {
          type: 'object',
          properties: {
            headline_insight: { type: 'string' },
            growth_opportunities: { type: 'array', items: { type: 'object', properties: {
              title: { type: 'string' }, impact: { type: 'string' }, description: { type: 'string' }
            } } },
            risks: { type: 'array', items: { type: 'object', properties: {
              title: { type: 'string' }, severity: { type: 'string' }, description: { type: 'string' }
            } } },
            recommended_actions: { type: 'array', items: { type: 'object', properties: {
              title: { type: 'string' }, priority: { type: 'string' }, description: { type: 'string' }
            } } },
            self_build_suggestions: { type: 'array', items: { type: 'object', properties: {
              source: { type: 'string' }, reason: { type: 'string' }, expected_insight: { type: 'string' }
            } } },
          },
        },
      });
      insights = insightRes;
      selfBuildPlan = insightRes.self_build_suggestions || [];
    } catch (e) {
      // Rule-based fallback insights
      insights = {
        headline_insight: `You're tracking ${domains.length} domains with ${totalClicks} clicks and ${totalUsers} users in the last 28 days. ${alerts.length} alerts need attention.`,
        growth_opportunities: [],
        risks: alerts.slice(0, 3).map(a => ({ title: a.title, severity: a.severity, description: a.message })),
        recommended_actions: actions.slice(0, 3).map(a => ({ title: a.title, priority: a.priority, description: a.description })),
        self_build_suggestions: missingSources.slice(0, 3).map(s => ({ source: s, reason: 'Not connected', expected_insight: 'Additional data for richer insights' })),
      };
      selfBuildPlan = insights.self_build_suggestions;
    }

    // ── Build unified payload ──
    return Response.json({
      generated_at: new Date().toISOString(),
      top_line: {
        domains: domains.length,
        pipeline_value: pipelineValue,
        win_rate: winRate.toFixed(1),
        revenue, expenses, net_profit: netProfit,
        total_clicks: totalClicks,
        total_impressions: totalImpressions,
        total_users: totalUsers,
        total_conversions: totalConversions,
        open_actions: actions.length,
        critical_alerts: alerts.filter(a => a.severity === 'critical').length,
        competitors_tracked: competitors.length,
        goals_active: goals.length,
      },
      domains: domainSummaries,
      actions: actions.slice(0, 15).map(a => ({
        id: a.id, title: a.title, description: a.description, priority: a.priority,
        domain: a.domain, type: a.type, estimated_impact: a.estimated_impact,
      })),
      alerts: alerts.slice(0, 10),
      crm: {
        accounts: entityCounts.Account, contacts: entityCounts.Contact,
        leads: entityCounts.Lead, opportunities: entityCounts.Opportunity,
        pipeline_value: pipelineValue, win_rate: winRate.toFixed(1),
      },
      financial: { revenue, expenses, net_profit: netProfit, goals: goals.length },
      seo: { total_clicks: totalClicks, total_impressions: totalImpressions, avg_ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '0%', domains: domains.length },
      competitive: { competitors_tracked: competitors.length, scans: competitors.slice(0, 5) },
      self_discovery: {
        connected_sources: connectedSources,
        missing_sources: missingSources,
        data_completeness: dataCompleteness,
        entity_coverage: entityCoverage,
        entities_with_data: entitiesWithData,
        entity_counts: entityCounts,
        vault_entries: vaultEntries.length,
        self_build_plan: selfBuildPlan,
      },
      insights,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}