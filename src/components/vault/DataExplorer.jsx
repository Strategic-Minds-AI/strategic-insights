import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, HardDrive, Github, RefreshCw, ChevronRight, FileText } from 'lucide-react';

export default function DataExplorer() {
  const [tab, setTab] = useState('supabase');
  const [loading, setLoading] = useState(false);
  const [supabaseProjects, setSupabaseProjects] = useState(null);
  const [driveFiles, setDriveFiles] = useState(null);
  const [githubRepos, setGithubRepos] = useState(null);
  const [error, setError] = useState(null);

  const fetchSupabase = async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke('supabase_query', { action: 'list_projects' });
      setSupabaseProjects(res.data?.projects || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const fetchDrive = async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke('drive_list_files', {});
      setDriveFiles(res.data?.files || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const fetchGithub = async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke('github_read', { action: 'list_repos' });
      setGithubRepos(res.data?.repos || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const loadTab = (t) => {
    setTab(t);
    if (t === 'supabase' && !supabaseProjects) fetchSupabase();
    if (t === 'drive' && !driveFiles) fetchDrive();
    if (t === 'github' && !githubRepos) fetchGithub();
  };

  const tabs = [
    { id: 'supabase', label: 'Supabase', icon: Database, color: '#3ecf8e' },
    { id: 'drive', label: 'Drive', icon: HardDrive, color: '#4285f4' },
    { id: 'github', label: 'GitHub', icon: Github, color: '#181717' },
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" /> Data Explorer
          <span className="text-xs font-normal text-gray-400 ml-1">Live data from your connected sources</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          {tabs.map(t => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? 'default' : 'outline'}
              onClick={() => loadTab(t.id)}
            >
              <t.icon className="w-4 h-4 mr-1" style={{ color: tab === t.id ? '#fff' : t.color }} />
              {t.label}
            </Button>
          ))}
        </div>

        {loading && <div className="h-24 animate-pulse bg-gray-100 rounded" />}

        {error && <p className="text-sm text-red-500 py-4">Error: {error}</p>}

        {!loading && !error && tab === 'supabase' && supabaseProjects && (
          <div className="space-y-2">
            {supabaseProjects.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No Supabase projects found.</p>
            ) : supabaseProjects.map(p => (
              <div key={p.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.id} · {p.region}</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700">{p.status?.replace('ACTIVE_', '')}</Badge>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={fetchSupabase} className="mt-2">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        )}

        {!loading && !error && tab === 'drive' && driveFiles && (
          <div className="space-y-2">
            {driveFiles.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No Drive files found.</p>
            ) : driveFiles.slice(0, 20).map(f => (
              <div key={f.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{f.name}</p>
                    <p className="text-xs text-gray-400 truncate">{f.mimeType}</p>
                  </div>
                </div>
                <a href={f.webViewLink} target="_blank" rel="noreferrer" className="shrink-0">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            ))}
            {driveFiles.length > 20 && <p className="text-xs text-gray-400">Showing 20 of {driveFiles.length}</p>}
            <Button size="sm" variant="ghost" onClick={fetchDrive} className="mt-2">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        )}

        {!loading && !error && tab === 'github' && githubRepos && (
          <div className="space-y-2">
            {githubRepos.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No GitHub repos found.</p>
            ) : githubRepos.slice(0, 20).map(r => (
              <div key={r.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Github className="w-4 h-4 text-gray-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{r.description || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.private && <Badge variant="outline" className="text-xs">Private</Badge>}
                  <Badge variant="secondary" className="text-xs">{new Date(r.updated_at).toLocaleDateString()}</Badge>
                </div>
              </div>
            ))}
            {githubRepos.length > 20 && <p className="text-xs text-gray-400">Showing 20 of {githubRepos.length}</p>}
            <Button size="sm" variant="ghost" onClick={fetchGithub} className="mt-2">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        )}

        {!loading && !error && !supabaseProjects && !driveFiles && !githubRepos && (
          <p className="text-sm text-gray-400 py-4">Select a tab above to explore your live data.</p>
        )}
      </CardContent>
    </Card>
  );
}