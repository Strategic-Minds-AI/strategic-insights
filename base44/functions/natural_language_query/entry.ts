import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Natural language querying: lets the user ask questions in plain English
// and gets answers grounded in their live business data.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const question = body.question;
    if (!question) return Response.json({ error: 'No question provided' }, { status: 400 });

    // ── Gather relevant data based on question keywords ──
    const lowerQ = question.toLowerCase();

    const [domainsRes, gapsRes, actionsRes, snapshotsRes, competitorsRes, oppsRes, metricsRes] = await Promise.allSettled([
      base44.entities.Domain.filter({}, { sort: '-last_scan_at', limit: 50 }),
      base44.entities.Gap.filter({ status: 'open' }, { sort: '-created_date', limit: 30 }),
      base44.entities.DomainAction.filter({ status: 'open' }, { sort: '-created_date', limit: 30 }),
      base44.entities.AnalyticsSnapshot.filter({}, { sort: '-fetched_at', limit: 20 }),
      base44.entities.CompetitorScan.filter({}, { sort: '-scanned_at', limit: 15 }),
      base44.entities.Opportunity.filter({}, { limit: 50 }),
      base44.entities.DomainMetric.filter({}, { sort: '-created_date', limit: 50 }),
    ]);

    const domains = domainsRes.status === 'fulfilled' ? (domainsRes.value.items || domainsRes.value || []) : [];
    const gaps = gapsRes.status === 'fulfilled' ? (gapsRes.value.items || gapsRes.value || []) : [];
    const actions = actionsRes.status === 'fulfilled' ? (actionsRes.value.items || actionsRes.value || []) : [];
    const snapshots = snapshotsRes.status === 'fulfilled' ? (snapshotsRes.value.items || snapshotsRes.value || []) : [];
    const competitors = competitorsRes.status === 'fulfilled' ? (competitorsRes.value.items || competitorsRes.value || []) : [];
    const opportunities = oppsRes.status === 'fulfilled' ? (oppsRes.value.items || oppsRes.value || []) : [];
    const metrics = metricsRes.status === 'fulfilled' ? (metricsRes.value.items || metricsRes.value || []) : [];

    // ── Build context from data ──
    const context = {
      domains: domains.map(d => ({ domain: d.domain, status: d.status, health: d.health_score, clicks: d.page_count, url: d.url })),
      open_gaps: gaps.map(g => ({ title: g.title, severity: g.severity, category: g.category, description: g.description, estimated_impact: g.estimated_impact })),
      open_actions: actions.map(a => ({ title: a.title, priority: a.priority, type: a.type, domain: a.domain, description: a.description })),
      analytics_snapshots: snapshots.map(s => ({ source: s.source, business_id: s.business_id, metrics: s.metrics, period: `${s.period_start} to ${s.period_end}` })),
      competitor_scans: competitors.map(c => ({ domain: c.domain, competitor: c.competitor_name, gaps: c.content_gaps, strengths: c.strengths })),
      crm_opportunities: { count: opportunities.length, total_value: opportunities.reduce((s, o) => s + (o.amount || 0), 0), stages: opportunities.map(o => o.stage) },
      domain_metrics: metrics.slice(0, 20).map(m => ({ domain: m.domain, source: m.source, date: m.date, metrics: m.metrics })),
    };

    // ── AI answers the question grounded in data ──
    let answer = null;
    try {
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a strategic business analyst answering the owner's question using ONLY their live data below. Be specific, cite actual numbers from the data, and if the data doesn't contain the answer, say so clearly.

QUESTION: ${question}

LIVE DATA:
${JSON.stringify(context, null, 2)}

Answer in a structured format:
1. "answer" - a direct, specific answer to the question (2-4 sentences). Cite real numbers from the data.
2. "evidence" - array of specific data points from the data that support the answer (each as a string)
3. "recommendation" - if applicable, what the user should do next based on this answer
4. "data_gaps" - what data is missing that would make the answer better`,
        response_json_schema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            evidence: { type: 'array', items: { type: 'string' } },
            recommendation: { type: 'string' },
            data_gaps: { type: 'string' },
          },
          required: ['answer'],
        },
      });
      answer = aiResult;
    } catch (aiErr) {
      // Simple keyword-based fallback
      let fallbackAnswer = 'I could not run the full AI analysis right now. ';
      if (lowerQ.includes('traffic') || lowerQ.includes('click')) {
        const totalClicks = metrics.filter(m => m.source === 'google_search_console').reduce((s, m) => s + (m.metrics?.total_clicks || 0), 0);
        fallbackAnswer += `Your domains have ${totalClicks} total clicks from Search Console data.`;
      } else if (lowerQ.includes('gap') || lowerQ.includes('opportunit')) {
        fallbackAnswer += `You have ${gaps.length} open gaps. Top: ${gaps.slice(0, 3).map(g => g.title).join(', ')}.`;
      } else if (lowerQ.includes('competitor')) {
        fallbackAnswer += `You have ${competitors.length} competitor scans. Top competitor: ${competitors[0]?.competitor_name || 'none yet'}.`;
      } else {
        fallbackAnswer += `You're tracking ${domains.length} domains, ${gaps.length} open gaps, ${actions.length} open actions.`;
      }
      answer = { answer: fallbackAnswer, evidence: [], recommendation: '', data_gaps: 'AI analysis unavailable - showing basic data summary.' };
    }

    return Response.json({
      question,
      answered_at: new Date().toISOString(),
      answer,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}