import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, X, Send, FileText } from 'lucide-react';

export default function BulkActionBar({ selectedCount, onClear, onCrawl, onOpenMetadata, crawling }) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl">
      <Badge className="bg-indigo-500 text-white">{selectedCount} selected</Badge>
      <div className="h-5 w-px bg-white/20" />
      <Button
        size="sm"
        variant="ghost"
        className="text-white hover:bg-white/10"
        onClick={onCrawl}
        disabled={crawling}
      >
        {crawling ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
        {crawling ? 'Crawling...' : 'Crawl All'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-white hover:bg-white/10"
        onClick={onOpenMetadata}
      >
        <FileText className="w-3.5 h-3.5 mr-1" />
        Update Metadata
      </Button>
      <button onClick={onClear} className="ml-1 text-white/60 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}