import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, MessageSquare } from 'lucide-react';

export default function NLQueryBar() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('natural_language_query', { question });
      if (res.error) setError(res.error);
      else setResult(res.answer);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Why did organic traffic drop?',
    'Which domain has the biggest gap opportunity?',
    'What are my top revenue-impacting actions?',
    'How are we doing vs competitors?',
  ];

  return (
    <Card className="mb-5">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold">Ask Your Data</h3>
        </div>
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="Ask anything about your business data..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={ask} disabled={loading || !question.trim()} size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {!result && !loading && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setQuestion(s)}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        {result && (
          <div className="mt-3 p-3 bg-indigo-50 rounded-lg space-y-2">
            <p className="text-sm text-gray-800">{result.answer}</p>
            {result.evidence?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">Evidence:</p>
                {result.evidence.map((e, i) => (
                  <p key={i} className="text-xs text-gray-500 ml-3">• {e}</p>
                ))}
              </div>
            )}
            {result.recommendation && (
              <p className="text-xs text-indigo-600"><span className="font-medium">Next step:</span> {result.recommendation}</p>
            )}
            {result.data_gaps && (
              <p className="text-xs text-gray-400"><span className="font-medium">Data gaps:</span> {result.data_gaps}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}