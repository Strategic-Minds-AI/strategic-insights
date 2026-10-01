import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function BulkMetadataDialog({ open, onClose, selectedDomains, onSave }) {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        sitemap_url: sitemapUrl || undefined,
        target_keywords: targetKeywords ? JSON.stringify(targetKeywords.split(',').map(k => k.trim()).filter(Boolean)) : undefined,
        competitors: competitors ? JSON.stringify(competitors.split(',').map(c => c.trim()).filter(Boolean)) : undefined,
      });
      setSitemapUrl(''); setTargetKeywords(''); setCompetitors('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Metadata for {selectedDomains.length} Domain(s)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-gray-400">
            Values you enter will be applied to all selected domains. Leave a field blank to skip it.
          </p>
          <div>
            <Label className="mb-1.5">Sitemap URL</Label>
            <Input value={sitemapUrl} onChange={e => setSitemapUrl(e.target.value)} placeholder="https://example.com/sitemap.xml" />
          </div>
          <div>
            <Label className="mb-1.5">Target Keywords (comma-separated)</Label>
            <Input value={targetKeywords} onChange={e => setTargetKeywords(e.target.value)} placeholder="seo audit, keyword research, backlinks" />
          </div>
          <div>
            <Label className="mb-1.5">Competitors (comma-separated URLs)</Label>
            <Textarea value={competitors} onChange={e => setCompetitors(e.target.value)} placeholder="https://competitor1.com, https://competitor2.com" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : `Apply to ${selectedDomains.length} Domain(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}