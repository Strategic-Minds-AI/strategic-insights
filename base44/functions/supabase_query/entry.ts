import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, project_ref, table, limit, offset, filter, data, order } = body;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');
    if (!accessToken) return Response.json({ error: 'Supabase not connected' }, { status: 503 });

    // List all Supabase projects
    if (action === 'list_projects') {
      const res = await fetch('https://api.supabase.com/v1/projects', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return Response.json({ error: 'Failed to list projects', detail: await res.text() }, { status: res.status });
      const projects = await res.json();
      return Response.json({
        projects: (projects || []).map(p => ({
          id: p.id,
          name: p.name,
          region: p.region,
          status: p.status,
          organization: p.organization_id,
        })),
      });
    }

    // List tables in a project (via PostgREST OpenAPI schema)
    if (action === 'get_tables' && project_ref) {
      const keyRes = await fetch(`https://api.supabase.com/v1/projects/${project_ref}/api-keys`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const keys = await keyRes.json();
      const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;
      if (!serviceKey) return Response.json({ error: 'No service_role key found' }, { status: 500 });

      const res = await fetch(`https://${project_ref}.supabase.co/rest/v1/`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/openapi+json' },
      });
      if (!res.ok) return Response.json({ error: 'Failed to get schema' }, { status: res.status });
      const schema = await res.json();
      const tables = Object.keys(schema.paths || {}).filter(p => !p.startsWith('/rpc'));
      return Response.json({ tables });
    }

    // Read rows from a table via PostgREST
    if (action === 'read' && project_ref && table) {
      const keyRes = await fetch(`https://api.supabase.com/v1/projects/${project_ref}/api-keys`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const keys = await keyRes.json();
      const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;
      if (!serviceKey) return Response.json({ error: 'No service_role key found' }, { status: 500 });

      const params = new URLSearchParams();
      params.set('limit', String(limit || 50));
      if (offset) params.set('offset', String(offset));
      if (filter) params.set(filter.split('=')[0], filter.split('=')[1]);
      if (order) params.set('order', order);

      const res = await fetch(`https://${project_ref}.supabase.co/rest/v1/${table}?${params}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Range: `0-${(limit || 50) - 1}` },
      });
      if (!res.ok) return Response.json({ error: 'Failed to read table', detail: await res.text() }, { status: res.status });
      const rows = await res.json();
      return Response.json({ rows, count: rows.length });
    }

    // Write rows to a table via PostgREST
    if (action === 'write' && project_ref && table && data) {
      const keyRes = await fetch(`https://api.supabase.com/v1/projects/${project_ref}/api-keys`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const keys = await keyRes.json();
      const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;
      if (!serviceKey) return Response.json({ error: 'No service_role key found' }, { status: 500 });

      const res = await fetch(`https://${project_ref}.supabase.co/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) return Response.json({ error: 'Failed to write', detail: await res.text() }, { status: res.status });
      const result = await res.json();
      return Response.json({ result });
    }

    return Response.json({ error: 'Invalid action. Use: list_projects, get_tables, read, write' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}