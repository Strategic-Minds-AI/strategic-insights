import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Cross-source reasoning: correlates data across GA, GSC, competitors, CRM, and domain metrics
// to produce insights no single source could reveal alone.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const businessId = body.business_id || null;

    // ── Gather all data sources in parallel ──
    const [snapshotsRes, metricsRes, gapsRes, actionsRes, competitorsRes, domainsRes, oppsRes] = await Promise.allSettled([
      base44.entities.AnalyticsSnapshot.filter(businessId ? { business_id: businessId } : {}, { sort: '-fetched_at', limit: 30 }),
      base44.entities.DomainMetric.filter({}, { sort: '-created_date', limit: 50 }),
      base44.entities.Gap.filter({ status: 'open' }, { sort: '-created_date', limit: 20 }),
      base44.entities.DomainAction.filter({ status: 'open' }, { sort: '-created_date', limit: 20 }),
      base44.entities.CompetitorScan.filter({}, { sort: '-scanned_at', limit: 15 }),
      base44.entities.Domain.filter({}, { sort: 'domain', limit: 20 }),
      base44.entities.Opportunity.filter({}, { limit: 50 }),
    ]);

    const snapshots = snapshotsRes.status === 'fulfilled' ? (snapshotsRes.value.items || snapshotsRes.value || []) : [];
    const metrics = metricsRes.status === 'fulfilled' ? (metricsRes.value.items || metricsRes.value || []) : [];
    const gaps = gapsRes.status === 'fulfilled' ? (gapsRes.value.items || gapsRes.value || []) : [];
    const actions = actionsRes.status === 'fulfilled' ? (actionsRes.value.items || actionsRes.value || []) : [];
    const competitors = competitorsRes.status === 'fulfilled' ? (competitorsRes.value.items || competitorsRes.value || []) : [];
    const domains = domainsRes.status === 'fulfilled' ? (domainsRes.value.items || domainsRes.value || []) : [];
    const opportunities = oppsRes.status === 'fulfilled' ? (oppsRes.value.items || oppsRes.value || []) : [];

    // ── Organize snapshots by source ──
    const gaSnapshots = snapshots.filter(s => s.source === 'google_analytics');
    const gscSnapshots = snapshots.filter(s => s.source === 'google_search_console');
    const sheetsSnapshots = snapshots.filter(s => s.source === 'google_sheets');

    // ── Build correlation context for AI ──
    const correlationContext = {
      google_analytics: gaSnapshots.slice(0, 3).map(s => ({
        period: `${s.period_start} to ${s.period_end}`,
        metrics: s.metrics,
      })),
      google_search_console: gscSnapshots.slice(0, 3).map(s => ({
        period: `${s.period_start} to ${s.period_end}`,
        metrics: s.metrics,
      })),
      google_sheets: sheetsSnapshots.slice(0, 2).map(s => ({ spreadsheet: s.metrics?.spreadsheet, rows: s.metrics?.rows?.length })),
      domain_metrics: metrics.slice(0, 10).map(m => ({ domain: m.domain, source: m.source, date: m.date, metrics: m.metrics })),
      open_gaps: gaps.slice(0, 10).map(g => ({ title: g.title, severity: g.severity, category: g.category, metric: g.metric_value, benchmark: g.benchmark_value })),
      open_actions: actions.slice(0, 10).map(a => ({ title: a.title, priority: a.priority, type: a.type, domain: a.domain })),
      competitor_findings: competitors.slice(0, 5).map(c => ({ domain: c.domain, competitor: c.competitor_name, gaps: c.content_gaps, strengths: c.strengths })),
      domains: domains.map(d => ({ domain: d.domain, health: d.health_score, status: d.status, pages: d.page_count })),
      crm_pipeline: { count: opportunities.length, total_value: opportunities.reduce((s, o) => s + (o.amount || 0), 0) },
    };

    // ── AI cross-source reasoning ──
    let insights = null;
    try {
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a cross-source strategic intelligence analyst. You correlate data across multiple platforms to find insights no single source could reveal alone.

Here is the aggregated data from multiple sources:

${JSON.stringify(correlationContext, null, 2)}

Your job: find CORRELATIONS and CAUSAL CHAINS across these sources. For example:
- "Traffic dropped because 3 pages lost rankings AND a competitor published on the same keywords AND page speed regressed"
- "Conversions are zero because GA4 conversion events aren't configured, despite healthy traffic from Search Console"
- "Domain X is losing to competitor Y on keyword Z, which maps to a content gap"

Generate cross-source insights. Each insight MUST reference at least 2 data sources. Return:

1. "cross_source_insights" - 5 insights that require correlating multiple sources. Each must include:
   - title: the cross-source finding
   - sources: which sources were correlated (array)
   - correlation: what the correlation reveals
   - root_cause: the likely underlying cause
   - estimated_revenue_impact: dollar estimate of what fixing this is worth (e.g. "$5,000-15,000/month")
   - confidence: "high" | "medium" | "low"
   - recommended_action: what to do about it
   - action_steps: array of 3-5 steps

2. "priority_queue" - all open gaps and actions, re-ranked by ESTIMATED REVENUE IMPACT (not just severity). Each item:
   - title, current_priority, revenue_rank (1 = highest revenue impact), estimated_revenue_impact, source_type ("gap" or "action"), id

3. "causal_chains" - 3 cause-and-effect chains visible in the data (e.g. "Ranking drop → traffic drop → conversion drop")`,
        response_json_schema: {
          type: 'object',
          properties: {
            cross_source_insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  sources: { type: 'array', items: { type: 'string' } },
                  correlation: { type: 'string' },
                  root_cause: { type: 'string' },
                  estimated_revenue_impact: { type: 'string' },
                  confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                  recommended_action: { type: 'string' },
                  action_steps: { type: 'array', items: { type: 'string' } },
                },
                required: ['title', 'sources', 'correlation', 'estimated_revenue_impact', 'recommended_action'],
              },
            },
            priority_queue: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  current_priority: { type: 'string' },
                  revenue_rank: { type: 'number' },
                  estimated_revenue_impact: { type: 'string' },
                  source_type: { type: 'string' },
                  id: { type: 'string' },
                },
              },
            },
            causal_chains: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  chain: { type: 'string' },
                  evidence: { type: 'string' },
                  impact: { type: 'string' },
                },
              },
            },
          },
          required: ['cross_source_insights', 'priority_queue'],
        },
      });
      insights = aiResult;
    } catch (aiErr) {
      // Rule-based fallback: rank by severity as proxy for revenue impact
      const allItems = [
        ...gaps.map(g => ({ title: g.title, current_priority: g.severity, revenue_rank: 0, estimated_revenue_impact: g.estimated_impact || 'Unknown', source_type: 'gap', id: g.id })),
        ...actions.map(a => ({ title: a.title, current_priority: a.priority, revenue_rank: 0, estimated_revenue_impact: a.estimated_impact || 'Unknown', source_type: 'action', id: a.id })),
      ];
      const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
      allItems.sort((a, b) => (severityRank[b.current_priority] || 0) - (severityRank[a.current_priority] || 0));
      allItems.forEach((item, i) => { item.revenue_rank = i + 1; });
      insights = {
        cross_source_insights: [],
        priority_queue: allItems,
        causal_chains: [],
        _fallback: true,
        _error: aiErr.message,
      };
    }

    return Response.json({
      generated_at: new Date().toISOString(),
      business_id: businessId,
      data_sources_correlated: ['google_analytics', 'google_search_console', 'google_sheets', 'domain_metrics', 'gaps', 'actions', 'competitors', 'crm'],
      insights,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}