import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DomainTrendChart({ metrics }) {
  // Group metrics by date, merge GSC + GA into one row per date
  const byDate = {};
  (metrics || []).forEach(m => {
    const date = m.date;
    if (!byDate[date]) byDate[date] = { date };
    const d = m.metrics || {};
    if (m.source === 'google_search_console') {
      byDate[date].clicks = d.total_clicks || 0;
      byDate[date].impressions = d.total_impressions || 0;
    } else if (m.source === 'google_analytics') {
      byDate[date].users = parseInt(d.total_users) || 0;
      byDate[date].sessions = parseInt(d.sessions) || 0;
    }
  });

  const data = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Performance Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            No historical data yet — run a scan to start collecting metrics.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Performance Trend</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="impressions" stroke="#7c3aed" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="users" stroke="#059669" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}