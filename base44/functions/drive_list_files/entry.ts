import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_id, query, mime_type } = body;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    if (!accessToken) return Response.json({ error: 'Google Drive not connected' }, { status: 503 });

    // List files
    if (!file_id) {
      let url = 'https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)';
      const q = query ? ` and name contains '${query}'` : '';
      const mime = mime_type ? ` and mimeType='${mime_type}'` : '';
      url += `&q=trashed=false${q}${mime}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) return Response.json({ error: 'Failed to list files' }, { status: res.status });
      const data = await res.json();
      return Response.json({ files: data.files || [] });
    }

    // Read a specific file's content
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file_id}?fields=name,mimeType,size`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) return Response.json({ error: 'File not found' }, { status: metaRes.status });
    const meta = await metaRes.json();

    const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const content = await contentRes.text();
    return Response.json({ name: meta.name, mimeType: meta.mimeType, size: meta.size, content: content.substring(0, 10000) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}