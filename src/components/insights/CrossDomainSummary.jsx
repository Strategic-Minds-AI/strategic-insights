import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Eye, Users, Target, Award } from 'lucide-react';

export default function CrossDomainSummary({ domains, metrics }) {
  // Aggregate latest GSC + GA metrics across all domains
  const latestByDomain = {};
  (metrics || []).forEach(m => {
    const did = m.domain_id;
    if (!latestByDomain[did] || m.date > latestByDomain[did].date) {
      latestByDomain[did] = latestByDomain[did] || {};
    }
    if (!latestByDomain[did][m.source] || m.date > (latestByDomain[did][m.source]?.date || '')) {
      latestByDomain[did][m.source] = m;
    }
  });

  let totalClicks = 0, totalImpressions = 0, totalUsers = 0, totalConversions = 0;
  const domainSummaries = [];

  (domains || []).forEach(d => {
    const dm = latestByDomain[d.id] || {};
    const gsc = dm.google_search_console?.metrics || {};
    const ga = dm.google_analytics?.metrics || {};
    const clicks = gsc.total_clicks || 0;
    const impressions = gsc.total_impressions || 0;
    const users = parseInt(ga.total_users) || 0;
    const conversions = parseInt(ga.conversions) || 0;

    totalClicks += clicks;
    totalImpressions += impressions;
    totalUsers += users;
    totalConversions += conversions;

    domainSummaries.push({
      domain: d.domain,
      clicks, impressions, users, conversions,
      health: d.health_score || 0,
      status: d.status,
    });
  });

  // Sort by clicks desc to find top performer
  domainSummaries.sort((a, b) => b.clicks - a.clicks);
  const topPerformer = domainSummaries[0];

  const cards = [
    { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Impressions', value: totalImpressions.toLocaleString(), icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Users', value: totalUsers.toLocaleString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Conversions', value: totalConversions.toLocaleString(), icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">{c.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${c.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {topPerformer && (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-700">Top Performer</p>
                <p className="text-lg font-bold text-gray-900">
                  {topPerformer.domain} — {topPerformer.clicks.toLocaleString()} clicks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-domain breakdown table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Per-Domain Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-400">
                  <th className="text-left py-2 font-medium">Domain</th>
                  <th className="text-right py-2 font-medium">Clicks</th>
                  <th className="text-right py-2 font-medium">Impressions</th>
                  <th className="text-right py-2 font-medium">Users</th>
                  <th className="text-right py-2 font-medium">Conv.</th>
                  <th className="text-right py-2 font-medium">Health</th>
                </tr>
              </thead>
              <tbody>
                {domainSummaries.map((s, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-700">{s.domain}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.clicks.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.impressions.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.users.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.conversions.toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                        style={{ background: `conic-gradient(#6366f1 ${s.health * 3.6}deg, #e5e7eb 0deg)` }}>
                        {s.health}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}