import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, Bot, Copy, Check, Terminal, Webhook, Zap } from 'lucide-react';

export default function DeveloperAPI() {
  const [copied, setCopied] = useState(null);
  const mcpUrl = typeof window !== 'undefined' ? new URL('/api/mcp', window.location.origin).toString() : '/api/mcp';

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center text-white">
          <Terminal className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Center</h1>
          <p className="text-sm text-gray-500">API generator · MCP server · Webhooks</p>
        </div>
      </div>

      <Tabs defaultValue="mcp" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="mcp"><Bot className="w-4 h-4 mr-2" /> MCP Server</TabsTrigger>
          <TabsTrigger value="api"><Code2 className="w-4 h-4 mr-2" /> API Generator</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="w-4 h-4 mr-2" /> Webhooks</TabsTrigger>
        </TabsList>

        {/* MCP Tab */}
        <TabsContent value="mcp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Bot className="w-5 h-5 text-violet-600" /> ChatGPT / Claude MCP Server</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Your Strategic Analytics data and the skip-trace scan are exposed as an MCP server. Connect ChatGPT, Claude, or Cursor to ask questions about your analytics and trigger scans from any AI client.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">MCP Endpoint URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-gray-900 text-green-400 px-3 py-2 rounded-lg text-sm font-mono overflow-x-auto">{mcpUrl}</code>
                  <Button size="icon" variant="outline" onClick={() => copy(mcpUrl, 'mcp')}>
                    {copied === 'mcp' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="bg-violet-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-violet-900 flex items-center gap-2"><Zap className="w-4 h-4" /> Available MCP Tools</h4>
                <ul className="text-sm space-y-2 text-gray-700">
                  <li className="flex items-start gap-2"><Badge className="bg-violet-100 text-violet-700 text-xs">Tool</Badge> <code className="text-xs">run_strategic_scan</code> — Run the skip-trace across all connected analytics accounts, find gaps, and get AI recommendations.</li>
                  <li className="flex items-start gap-2"><Badge className="bg-blue-100 text-blue-700 text-xs">Entity</Badge> <code className="text-xs">query_business</code> — List and filter your businesses.</li>
                  <li className="flex items-start gap-2"><Badge className="bg-blue-100 text-blue-700 text-xs">Entity</Badge> <code className="text-xs">query_gap</code> — List detected gaps with AI recommendations.</li>
                  <li className="flex items-start gap-2"><Badge className="bg-blue-100 text-blue-700 text-xs">Entity</Badge> <code className="text-xs">query_analyticssnapshot</code> — Read raw analytics metrics per business.</li>
                  <li className="flex items-start gap-2"><Badge className="bg-violet-100 text-violet-700 text-xs">Tool</Badge> <code className="text-xs">list_data_sources</code> — List all connected data sources and vault-stored API keys.</li>
                </ul>
              </div>
              <div className="text-sm text-gray-600">
                <h4 className="font-semibold mb-1">Connect ChatGPT</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>In ChatGPT, go to Settings → Connectors → "Add custom connector"</li>
                  <li>Name it "Strategic Analytics" and paste the URL above</li>
                  <li>Click Add, then enable it in the chat composer</li>
                  <li>Ask: "Run a strategic scan on all my businesses and show me the critical gaps"</li>
                </ol>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                ⚠️ Publish the app to activate the MCP server. The endpoint is live only after publishing.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Generator Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Code2 className="w-5 h-5" /> REST API Generator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Every entity in Strategic Analytics is automatically available as a REST API. Use these endpoints to pull businesses, gaps, and snapshots into external dashboards or scripts.
              </p>
              <div className="space-y-2">
                {[
                  { method: 'GET', path: '/api/entities/Business', desc: 'List all businesses' },
                  { method: 'GET', path: '/api/entities/Gap', desc: 'List all gaps' },
                  { method: 'POST', path: '/api/functions/strategic_scan', desc: 'Trigger a skip-trace scan' },
                  { method: 'GET', path: '/api/entities/AnalyticsSnapshot', desc: 'List analytics snapshots' },
                ].map((ep, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-900 rounded-lg p-3">
                    <Badge className={`text-xs font-mono ${ep.method === 'GET' ? 'bg-green-500' : 'bg-blue-500'}`}>{ep.method}</Badge>
                    <code className="text-green-400 text-sm font-mono flex-1 overflow-x-auto">{ep.path}</code>
                    <span className="text-gray-400 text-xs hidden sm:inline">{ep.desc}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">JavaScript SDK Example</label>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto mt-1">
{`import { base44 } from '@base44/sdk';

// Run a skip-trace scan
const scan = await base44.functions.invoke(
  'strategic_scan', { business_id: null }
);
console.log(scan.gaps);

// List gaps for a business
const gaps = await base44.entities.Gap.filter(
  { business_id: bizId, status: 'open' }
);`}
                </pre>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">cURL Example</label>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto mt-1">
{`curl -X POST ${mcpUrl.replace('/api/mcp', '')}/api/functions/strategic_scan \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"business_id": null}'`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Webhook className="w-5 h-5" /> Webhooks & Automations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Trigger the skip-trace automatically on a schedule or when new data arrives. Workflows can run the scan nightly and email you the gap report.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold">Suggested Automations</h4>
                <ul className="text-sm space-y-1.5 text-gray-600">
                  <li>• <strong>Nightly scan</strong> — Run <code className="text-xs bg-gray-200 px-1 rounded">strategic_scan</code> every 24h and email the critical gaps</li>
                  <li>• <strong>Weekly trend report</strong> — Compare snapshots week-over-week and flag new gaps</li>
                  <li>• <strong>Gap escalation</strong> — When a critical gap is created, send a push notification</li>
                </ul>
              </div>
              <p className="text-xs text-gray-400">Ask the assistant to "create a nightly scan workflow" to set up scheduled automation.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

[executed on device: JARVIS-COMMAND (68702b78-725a-4b76-878f-f1693f485414)]