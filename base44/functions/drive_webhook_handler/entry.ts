import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Drive webhook handler: incremental sync using the Changes API.
// Triggered by the Google Drive connector webhook workflow.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const data = body.data || {};

    // Sync ack — first webhook handshake, nothing to process
    const resourceState = data._provider_meta?.['x-goog-resource-state'];
    if (resourceState === 'sync') {
      return Response.json({ status: 'sync_ack' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load persisted page token
    const existing = await base44.asServiceRole.entities.SyncState.list();
    let syncRecord = existing.length > 0 ? existing[0] : null;

    if (!syncRecord) {
      // First run: get a start page token
      const tokenRes = await fetch(
        'https://www.googleapis.com/drive/v3/changes/startPageToken',
        { headers: authHeader }
      );
      const { startPageToken } = await tokenRes.json();
      await base44.asServiceRole.entities.SyncState.create({
        page_token: startPageToken,
        last_sync_at: new Date().toISOString(),
        files_processed: 0,
      });
      return Response.json({ status: 'initialized' });
    }

    // Fetch all pages of changes since last sync
    const baseUrl = `https://www.googleapis.com/drive/v3/changes?fields=changes(file(id,name,mimeType,modifiedTime,trashed)),newStartPageToken,nextPageToken`;
    let changesUrl = baseUrl + `&pageToken=${syncRecord.page_token}`;
    const allChanges = [];
    let newPageToken = null;

    while (changesUrl) {
      const changesRes = await fetch(changesUrl, { headers: authHeader });
      if (!changesRes.ok) {
        return Response.json({ status: 'api_error', detail: await changesRes.text() });
      }
      const page = await changesRes.json();
      allChanges.push(...(page.changes || []));
      if (page.newStartPageToken) newPageToken = page.newStartPageToken;
      changesUrl = page.nextPageToken ? baseUrl + `&pageToken=${page.nextPageToken}` : null;
    }

    // Process changes — log interesting file events
    const processed = [];
    for (const change of allChanges) {
      const file = change.file;
      if (!file) continue;
      processed.push({
        id: file.id,
        name: file.name,
        type: file.mimeType,
        trashed: file.trashed,
        modified: file.modifiedTime,
      });
    }

    // Save the new page token AFTER successful processing
    if (newPageToken) {
      await base44.asServiceRole.entities.SyncState.update(syncRecord.id, {
        page_token: newPageToken,
        last_sync_at: new Date().toISOString(),
        files_processed: (syncRecord.files_processed || 0) + processed.length,
      });
    }

    return Response.json({
      status: 'synced',
      changes_processed: allChanges.length,
      files: processed.slice(0, 50),
      new_page_token: newPageToken,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}