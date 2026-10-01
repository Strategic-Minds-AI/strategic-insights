import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Autonomous action execution: takes open gaps/actions and attempts to auto-resolve
// the ones that can be fixed without human intervention (sitemap pushes, tracking fixes, etc.)

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;

    // Load all open gaps and actions
    const [gapsRes, actionsRes, domainsRes] = await Promise.allSettled([
      base44.entities.Gap.filter({ status: 'open' }, { sort: '-created_date', limit: 50 }),
      base44.entities.DomainAction.filter({ status: 'open' }, { sort: '-created_date', limit: 50 }),
      base44.entities.Domain.filter({ status: { $in: ['active', 'onboarding', 'pending'] } }, { limit: 50 }),
    ]);

    const gaps = gapsRes.status === 'fulfilled' ? (gapsRes.value.items || gapsRes.value || []) : [];
    const actions = actionsRes.status === 'fulfilled' ? (actionsRes.value.items || actionsRes.value || []) : [];
    const domains = domainsRes.status === 'fulfilled' ? (domainsRes.value.items || domainsRes.value || []) : [];

    const results = [];
    const now = new Date().toISOString();

    // ── Auto-resolvable patterns ──
    // 1. Sitemap not pushed → push it
    // 2. Tracking not configured → flag for manual (can't auto-fix without GA property access)
    // 3. Robots.txt missing → can't auto-fix (needs server access)
    // 4. Indexing issues → can request indexing via GSC API (requires connector)

    for (const action of actions) {
      const title = (action.title || '').toLowerCase();
      const type = action.type || '';
      let autoResolved = false;
      let resolution = '';

      // Sitemap push actions
      if (title.includes('sitemap') && (title.includes('push') || title.includes('submit'))) {
        const domain = domains.find(d => d.id === action.domain_id || d.domain === action.domain);
        if (domain && domain.sitemap_url) {
          if (!dryRun) {
            try {
              await base44.functions.invoke('push_sitemap_to_gsc', {
                domain_id: domain.id,
                sitemap_url: domain.sitemap_url,
              });
              await base44.entities.DomainAction.update(action.id, {
                status: 'resolved',
                ai_recommendation: `Auto-resolved: sitemap ${domain.sitemap_url} pushed to Search Console at ${now}`,
              });
              autoResolved = true;
              resolution = `Sitemap pushed to GSC for ${domain.domain}`;
            } catch (e) {
              resolution = `Sitemap push failed: ${e.message}`;
            }
          } else {
            autoResolved = true;
            resolution = `[DRY RUN] Would push sitemap ${domain.sitemap_url} for ${domain.domain}`;
          }
        }
      }

      // Rescan / crawl actions
      if (title.includes('rescan') || title.includes('crawl') || title.includes('re-index')) {
        const domain = domains.find(d => d.id === action.domain_id || d.domain === action.domain);
        if (domain) {
          if (!dryRun) {
            try {
              await base44.functions.invoke('domain_run_pipeline', {
                action: 'process_domain',
                domain_id: domain.id,
              });
              await base44.entities.DomainAction.update(action.id, {
                status: 'resolved',
                ai_recommendation: `Auto-resolved: domain ${domain.domain} rescanned at ${now}`,
              });
              autoResolved = true;
              resolution = `Domain ${domain.domain} rescanned`;
            } catch (e) {
              resolution = `Rescan failed: ${e.message}`;
            }
          } else {
            autoResolved = true;
            resolution = `[DRY RUN] Would rescan ${domain.domain}`;
          }
        }
      }

      if (autoResolved || resolution) {
        results.push({
          item_id: action.id,
          title: action.title,
          type: 'action',
          resolved: autoResolved,
          resolution,
        });
      }
    }

    // Gaps: most need human action, but tracking gaps with known fix can be auto-resolved
    for (const gap of gaps) {
      const title = (gap.title || '').toLowerCase();
      let autoResolved = false;
      let resolution = '';

      // Sitemap-related gaps
      if (title.includes('sitemap') && gap.action_url) {
        if (!dryRun) {
          try {
            await base44.entities.Gap.update(gap.id, {
              status: 'in_progress',
              ai_recommendation: `Auto-processing: sitemap gap detected at ${now}`,
            });
            autoResolved = true;
            resolution = 'Sitemap gap queued for auto-processing';
          } catch (e) {
            resolution = `Failed: ${e.message}`;
          }
        } else {
          autoResolved = true;
          resolution = `[DRY RUN] Would auto-process sitemap gap`;
        }
      }

      if (autoResolved || resolution) {
        results.push({
          item_id: gap.id,
          title: gap.title,
          type: 'gap',
          resolved: autoResolved,
          resolution,
        });
      }
    }

    const resolvedCount = results.filter(r => r.resolved).length;

    return Response.json({
      dry_run: dryRun,
      executed_at: now,
      total_open: gaps.length + actions.length,
      attempted: results.length,
      resolved: resolvedCount,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}