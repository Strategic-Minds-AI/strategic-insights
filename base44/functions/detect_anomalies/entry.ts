import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Statistical anomaly detection: computes mean + standard deviation on historical
// metrics, flags anything beyond 2 standard deviations as an anomaly.

function stdev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Load historical metrics for anomaly detection ──
    const [metricsRes, snapshotsRes, domainsRes] = await Promise.allSettled([
      base44.entities.DomainMetric.filter({}, { sort: '-created_date', limit: 200 }),
      base44.entities.AnalyticsSnapshot.filter({}, { sort: '-fetched_at', limit: 100 }),
      base44.entities.Domain.filter({}, { limit: 50 }),
    ]);

    const metrics = metricsRes.status === 'fulfilled' ? (metricsRes.value.items || metricsRes.value || []) : [];
    const snapshots = snapshotsRes.status === 'fulfilled' ? (snapshotsRes.value.items || snapshotsRes.value || []) : [];
    const domains = domainsRes.status === 'fulfilled' ? (domainsRes.value.items || domainsRes.value || []) : [];

    const anomalies = [];
    const now = new Date().toISOString();

    // ── Group metrics by domain + source for time-series analysis ──
    const metricGroups = {};
    metrics.forEach(m => {
      const key = `${m.domain_id || m.domain}|${m.source}`;
      if (!metricGroups[key]) metricGroups[key] = [];
      metricGroups[key].push(m);
    });

    for (const [key, group] of Object.entries(metricGroups)) {
      if (group.length < 3) continue; // need at least 3 data points

      const [domainPart, source] = key.split('|');
      const sorted = group.sort((a, b) => new Date(a.date || a.created_date) - new Date(b.date || b.created_date));
      const latest = sorted[sorted.length - 1];
      const history = sorted.slice(0, -1); // exclude latest from baseline

      // Extract numeric metric values
      const metricKeys = latest.metrics ? Object.keys(latest.metrics).filter(k => typeof latest.metrics[k] === 'number') : [];

      for (const mk of metricKeys) {
        const historicalValues = history.map(h => h.metrics?.[mk]).filter(v => typeof v === 'number');
        if (historicalValues.length < 2) continue;

        const m = mean(historicalValues);
        const sd = stdev(historicalValues);
        if (sd === 0) continue;

        const currentValue = latest.metrics[mk];
        const zScore = (currentValue - m) / sd;

        // Flag if beyond 2 standard deviations
        if (Math.abs(zScore) >= 2) {
          const direction = zScore < 0 ? 'drop' : 'spike';
          const severity = Math.abs(zScore) >= 3 ? 'critical' : Math.abs(zScore) >= 2.5 ? 'high' : 'medium';

          anomalies.push({
            domain: latest.domain,
            source,
            metric: mk,
            current_value: currentValue,
            historical_mean: Math.round(m * 100) / 100,
            standard_deviation: Math.round(sd * 100) / 100,
            z_score: Math.round(zScore * 100) / 100,
            direction,
            severity,
            detected_at: now,
            description: `${mk} ${direction === 'drop' ? 'dropped' : 'spiked'} to ${currentValue} (baseline: ${Math.round(m * 100) / 100}, ${Math.abs(Math.round(zScore * 100) / 100)}σ ${direction})`,
          });
        }
      }
    }

    // ── Also check GA snapshots for traffic/conversion anomalies ──
    const gaSnapshots = snapshots.filter(s => s.source === 'google_analytics');
    const gaByBusiness = {};
    gaSnapshots.forEach(s => {
      if (!gaByBusiness[s.business_id]) gaByBusiness[s.business_id] = [];
      gaByBusiness[s.business_id].push(s);
    });

    for (const [bizId, group] of Object.entries(gaByBusiness)) {
      if (group.length < 3) continue;
      const sorted = group.sort((a, b) => new Date(a.fetched_at) - new Date(b.fetched_at));
      const latest = sorted[sorted.length - 1];
      const history = sorted.slice(0, -1);

      const metricKeys = latest.metrics ? Object.keys(latest.metrics).filter(k => typeof latest.metrics[k] === 'number') : [];
      for (const mk of metricKeys) {
        const historicalValues = history.map(h => h.metrics?.[mk]).filter(v => typeof v === 'number');
        if (historicalValues.length < 2) continue;
        const m = mean(historicalValues);
        const sd = stdev(historicalValues);
        if (sd === 0) continue;
        const currentValue = latest.metrics[mk];
        const zScore = (currentValue - m) / sd;
        if (Math.abs(zScore) >= 2) {
          const direction = zScore < 0 ? 'drop' : 'spike';
          anomalies.push({
            business_id: bizId,
            source: 'google_analytics',
            metric: mk,
            current_value: currentValue,
            historical_mean: Math.round(m * 100) / 100,
            z_score: Math.round(zScore * 100) / 100,
            direction,
            severity: Math.abs(zScore) >= 3 ? 'critical' : 'high',
            detected_at: now,
            description: `GA ${mk} ${direction} to ${currentValue} (${Math.abs(Math.round(zScore * 100) / 100)}σ)`,
          });
        }
      }
    }

    // ── Domain status anomalies ──
    domains.forEach(d => {
      if (d.status === 'error') {
        anomalies.push({
          domain: d.domain,
          source: 'domain_status',
          metric: 'status',
          current_value: 'error',
          severity: 'critical',
          direction: 'drop',
          detected_at: now,
          description: `${d.domain} is in error state: ${d.last_error || 'unknown'}`,
        });
      }
      if (d.health_score !== undefined && d.health_score < 40) {
        anomalies.push({
          domain: d.domain,
          source: 'health_score',
          metric: 'health_score',
          current_value: d.health_score,
          severity: 'high',
          direction: 'drop',
          detected_at: now,
          description: `${d.domain} health score is ${d.health_score}/100 — critically low`,
        });
      }
    });

    // Sort by severity
    const severityOrder = { critical: 3, high: 2, medium: 1 };
    anomalies.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

    return Response.json({
      generated_at: now,
      anomaly_count: anomalies.length,
      anomalies: anomalies.slice(0, 25),
      stats: {
        metric_groups_analyzed: Object.keys(metricGroups).length,
        ga_businesses_analyzed: Object.keys(gaByBusiness).length,
        domains_checked: domains.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}