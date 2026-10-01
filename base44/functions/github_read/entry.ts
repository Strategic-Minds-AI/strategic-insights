import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, owner, repo, path, branch } = body;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    if (!accessToken) return Response.json({ error: 'GitHub not connected' }, { status: 503 });

    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

    // List repos for the authenticated user
    if (action === 'list_repos') {
      const res = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', { headers });
      if (!res.ok) return Response.json({ error: 'Failed to list repos' }, { status: res.status });
      const repos = await res.json();
      return Response.json({
        repos: (repos || []).map(r => ({ id: r.id, name: r.name, full_name: r.full_name, owner: r.owner.login, private: r.private, updated_at: r.updated_at, description: r.description })),
      });
    }

    // List contents of a repo or path
    if (action === 'list_contents' && owner && repo) {
      const ref = branch ? `?ref=${branch}` : '';
      const p = path ? `/contents/${path}` : '/contents';
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${p}${ref}`, { headers });
      if (!res.ok) return Response.json({ error: 'Failed to list contents' }, { status: res.status });
      const contents = await res.json();
      const items = Array.isArray(contents) ? contents.map(c => ({ name: c.name, path: c.path, type: c.type, size: c.size, sha: c.sha })) : { name: contents.name, path: contents.path, type: contents.type, content: contents.content, encoding: contents.encoding };
      return Response.json({ items });
    }

    // Read a file's content
    if (action === 'read_file' && owner && repo && path) {
      const ref = branch ? `?ref=${branch}` : '';
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}${ref}`, { headers });
      if (!res.ok) return Response.json({ error: 'Failed to read file' }, { status: res.status });
      const file = await res.json();
      let content = file.content || '';
      if (file.encoding === 'base64') {
        content = atob(content.replace(/\n/g, ''));
      }
      return Response.json({ name: file.name, path: file.path, size: file.size, content: content.substring(0, 10000) });
    }

    return Response.json({ error: 'Invalid action. Use: list_repos, list_contents, read_file' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}