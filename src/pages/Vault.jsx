import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Vault as VaultIcon, Key, Plus, Trash2, Eye, EyeOff, Check, X,
  Database, FileSpreadsheet, HardDrive, BarChart3, Search,
  Facebook, Music2, Github, Server, Cloud
} from 'lucide-react';

const OAUTH_SOURCES = [
  { id: 'google_analytics', name: 'Google Analytics', icon: BarChart3, color: '#e8710a', category: 'Web Analytics' },
  { id: 'google_search_console', name: 'Search Console', icon: Search, color: '#4285f4', category: 'SEO' },
  { id: 'googlesheets', name: 'Google Sheets', icon: FileSpreadsheet, color: '#0f9d58', category: 'Data' },
  { id: 'googledrive', name: 'Google Drive', icon: HardDrive, color: '#4285f4', category: 'Storage' },
  { id: 'supabase', name: 'Supabase', icon: Database, color: '#3ecf8e', category: 'Database' },
  { id: 'meta_ads', name: 'Meta Ads', icon: Facebook, color: '#1877f2', category: 'Advertising' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: '#ff0050', category: 'Social' },
];

const INFRA_SOURCES = [
  { name: 'Supabase', icon: Database, color: '#3ecf8e', purpose: 'Database backend', note: 'Connect via OAuth or store URL + anon key in the vault' },
  { name: 'GitHub', icon: Github, color: '#181717', purpose: 'Code & file storage', note: 'Workspace connector available' },
  { name: 'Google Drive', icon: HardDrive, color: '#4285f4', purpose: 'Data files & reports', note: 'Connect via OAuth' },
  { name: 'Vercel', icon: Server, color: '#000000', purpose: 'Frontend hosting (external)', note: 'This app runs on Base44 hosting' },
];

export default function Vault() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ name: '', service: '', key_name: '', key_value: '', description: '' });
  const [visibleKeys, setVisibleKeys] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['data-sources'],
    queryFn: async () => {
      const res = await base44.functions.invoke('list_data_sources', {});
      return res.data?.sources || [];
    },
  });

  const { data: vaultEntries = [] } = useQuery({
    queryKey: ['vault-entries'],
    queryFn: async () => {
      const res = await base44.entities.VaultEntry.filter({ status: 'active' }, { sort: '-created_date', limit: 100 });
      return res.items || res;
    },
  });

  const addEntry = async () => {
    setSaving(true);
    try {
      await base44.entities.VaultEntry.create({ ...newEntry, status: 'active' });
      setNewEntry({ name: '', service: '', key_name: '', key_value: '', description: '' });
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['vault-entries'] });
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id) => {
    await base44.entities.VaultEntry.delete(id);
    queryClient.invalidateQueries({ queryKey: ['vault-entries'] });
  };

  const maskKey = (key) => {
    if (!key || key.length < 8) return '••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  const isSourceConnected = (id) => {
    const source = sources.find(s => s.type === id);
    return source?.connected;
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center text-white shadow-lg">
          <VaultIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Vault</h1>
          <p className="text-sm text-gray-500">Connect data sources · Store API keys · Let your AI see everything</p>
        </div>
      </div>

      {/* OAuth Data Sources */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600" /> Connected Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-20 animate-pulse bg-gray-100 rounded" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {OAUTH_SOURCES.map(src => {
                const connected = isSourceConnected(src.id);
                return (
                  <div key={src.id} className={`border rounded-lg p-4 ${connected ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${src.color}15` }}>
                          <src.icon className="w-5 h-5" style={{ color: src.color }} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{src.name}</p>
                          <p className="text-xs text-gray-400">{src.category}</p>
                        </div>
                      </div>
                      {connected ? (
                        <Badge className="bg-green-100 text-green-700"><Check className="w-3 h-3 mr-1" /> Connected</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400"><X className="w-3 h-3 mr-1" /> Available</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            To connect a new source, ask the assistant: "Connect Google Sheets", "Connect Google Drive", or "Connect Supabase".
            Your AI scan automatically reads from every connected source.
          </p>
        </CardContent>
      </Card>

      {/* API Key Vault */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600" /> API Key Vault
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-1" /> Add Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="border rounded-lg p-4 mb-4 space-y-3 bg-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} placeholder="e.g. Supabase Production" />
                </div>
                <div>
                  <Label className="text-xs">Service</Label>
                  <Input value={newEntry.service} onChange={e => setNewEntry({ ...newEntry, service: e.target.value })} placeholder="e.g. supabase, google_sheets" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Key Name</Label>
                  <Input value={newEntry.key_name} onChange={e => setNewEntry({ ...newEntry, key_name: e.target.value })} placeholder="e.g. SUPABASE_URL" />
                </div>
                <div>
                  <Label className="text-xs">Key Value</Label>
                  <Input type="password" value={newEntry.key_value} onChange={e => setNewEntry({ ...newEntry, key_value: e.target.value })} placeholder="Paste your key here" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description (optional)</Label>
                <Input value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="What is this key for?" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addEntry} disabled={saving || !newEntry.name || !newEntry.key_value}>
                  {saving ? 'Saving...' : 'Save Key'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {vaultEntries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No API keys stored yet. Click "Add Key" to store credentials for Supabase, custom APIs, or any service.</p>
          ) : (
            <div className="space-y-2">
              {vaultEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Key className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{entry.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {entry.service} · {entry.key_name} ·{' '}
                        {visibleKeys[entry.id] ? entry.key_value : maskKey(entry.key_value)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setVisibleKeys({ ...visibleKeys, [entry.id]: !visibleKeys[entry.id] })}>
                      {visibleKeys[entry.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteEntry(entry.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Keys are stored with admin-only access. Your AI scan reads these to connect to external data sources like Supabase.
          </p>
        </CardContent>
      </Card>

      {/* External Infrastructure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-600" /> External Infrastructure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INFRA_SOURCES.map(src => (
              <div key={src.name} className="border rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${src.color}15` }}>
                  <src.icon className="w-5 h-5" style={{ color: src.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{src.name}</p>
                  <p className="text-xs text-gray-400 truncate">{src.purpose}</p>
                  <p className="text-xs text-gray-400 truncate">{src.note}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            This app runs on Base44. External services connect as data sources — your AI reads from them during scans.
            For full Supabase backend access, store your project URL and anon key in the API Key Vault above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}