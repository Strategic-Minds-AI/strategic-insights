import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const connectorTypes = [
      'google_analytics',
      'google_search_console',
      'googlesheets',
      'googledrive',
      'supabase',
      'meta_ads',
      'tiktok',
    ];

    const sources = [];
    for (const type of connectorTypes) {
      const conn = await base44.asServiceRole.connectors.getConnection(type).catch(() => null);
      sources.push({ type, connected: !!conn?.accessToken });
    }

    // Also list vault entries (names only — never expose key values)
    const vaultPage = await base44.entities.VaultEntry.filter({ status: 'active' }, { limit: 100 }).catch(() => ({}));
    const vaultEntries = vaultPage.items || vaultPage || [];
    const vaultSummary = vaultEntries.map(v => ({ id: v.id, name: v.name, service: v.service, key_name: v.key_name }));

    return Response.json({ sources, vaultEntries: vaultSummary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}