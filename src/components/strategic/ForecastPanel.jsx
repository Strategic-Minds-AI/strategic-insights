import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Calendar, Zap } from 'lucide-react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

// Simple linear regression: returns { slope, intercept }
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function projectValue(reg, x) {
  return Math.max(0, Math.round(reg.slope * x + reg.intercept));
}

function formatMonth(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function ForecastPanel({ snapshots }) {
  const forecast = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return null;

    // Sort by date ascending
    const sorted = [...snapshots].sort((a, b) =>
      new Date(a.fetched_at || a.period_end || a.created_date) - new Date(b.fetched_at || b.period_end || b.created_date)
    );

    // Extract GA sessions and GSC clicks as time-series
    const gaPoints = sorted
      .filter(s => s.source === 'google_analytics' && s.metrics)
      .map((s, i) => ({
        x: i,
        y: parseInt(s.metrics.sessions || s.metrics.total_users || 0) || 0,
        date: new Date(s.fetched_at || s.period_end || s.created_date),
      }));

    const gscPoints = sorted
      .filter(s => s.source === 'google_search_console' && s.metrics)
      .map((s, i) => ({
        x: i,
        y: parseInt(s.metrics.totalClicks || s.metrics.total_clicks || 0) || 0,
        date: new Date(s.fetched_at || s.period_end || s.created_date),
      }));

    const convPoints = sorted
      .filter(s => s.source === 'google_analytics' && s.metrics)
      .map((s, i) => ({
        x: i,
        y: parseInt(s.metrics.conversions || 0) || 0,
        date: new Date(s.fetched_at || s.period_end || s.created_date),
      }));

    if (gaPoints.length < 1 && gscPoints.length < 1) return null;

    // Run regression
    const gaReg = gaPoints.length >= 2 ? linearRegression(gaPoints) : { slope: 0, intercept: gaPoints[0]?.y || 0 };
    const gscReg = gscPoints.length >= 2 ? linearRegression(gscPoints) : { slope: 0, intercept: gscPoints[0]?.y || 0 };
    const convReg = convPoints.length >= 2 ? linearRegression(convPoints) : { slope: 0, intercept: convPoints[0]?.y || 0 };

    // Build chart data: historical + 6 months projection
    const chartData = [];
    const totalPoints = Math.max(gaPoints.length, gscPoints.length, 1);

    // Historical
    for (let i = 0; i < totalPoints; i++) {
      const ga = gaPoints[i];
      const gsc = gscPoints[i];
      chartData.push({
        month: ga?.date ? formatMonth(ga.date) : gsc?.date ? formatMonth(gsc.date) : `T${i}`,
        sessions: ga?.y ?? null,
        clicks: gsc?.y ?? null,
        conversions: convPoints[i]?.y ?? null,
      });
    }

    // Projection (6 months forward)
    const lastDate = gaPoints[gaPoints.length - 1]?.date || gscPoints[gscPoints.length - 1]?.date || new Date();
    for (let m = 1; m <= 6; m++) {
      const projDate = new Date(lastDate);
      projDate.setMonth(projDate.getMonth() + m);
      const x = totalPoints + m - 1;
      chartData.push({
        month: formatMonth(projDate),
        sessions: projectValue(gaReg, x),
        clicks: projectValue(gscReg, x),
        conversions: projectValue(convReg, x),
        projected: true,
      });
    }

    // Monthly targets: projected value at month +3 and +6
    const targetMonth3 = totalPoints + 2;
    const targetMonth6 = totalPoints + 5;

    return {
      chartData,
      historicalEnd: totalPoints - 1,
      targets: {
        sessions_3m: projectValue(gaReg, targetMonth3),
        sessions_6m: projectValue(gaReg, targetMonth6),
        clicks_3m: projectValue(gscReg, targetMonth3),
        clicks_6m: projectValue(gscReg, targetMonth6),
        conversions_3m: projectValue(convReg, targetMonth3),
        conversions_6m: projectValue(convReg, targetMonth6),
        growthRate: gaReg.slope > 0 ? `+${((gaReg.slope / (gaReg.intercept || 1)) * 100).toFixed(1)}%/mo` : `${(gaReg.slope / (gaReg.intercept || 1) * 100).toFixed(1)}%/mo`,
      },
      hasHistory: totalPoints >= 2,
    };
  }, [snapshots]);

  if (!forecast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-600" /> Growth Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">
            Need at least one analytics snapshot to project trends. Run a scan to collect data.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Forecast chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-600" /> Growth Forecast
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {forecast.hasHistory ? `Trend: ${forecast.targets.growthRate}` : 'Limited data'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={forecast.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine
                x={forecast.chartData[forecast.historicalEnd]?.month}
                stroke="#a78bfa"
                strokeDasharray="4 4"
                label={{ value: 'Now', position: 'top', fontSize: 10, fill: '#7c3aed' }}
              />
              <Area type="monotone" dataKey="sessions" stroke="#8b5cf6" fill="#8b5cf620" strokeWidth={2} name="Sessions" />
              <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name="Clicks" />
              <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={false} name="Conversions" />
            </ComposedChart>
          </ResponsiveContainer>
          {!forecast.hasHistory && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Only one data point available — projections assume flat growth. Run regular scans for accurate trend forecasting.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Monthly target cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TargetCard
          icon={Calendar}
          label="3-Month Target"
          color="text-violet-600"
          bg="bg-violet-50"
          metrics={[
            { label: 'Sessions', value: forecast.targets.sessions_3m },
            { label: 'Clicks', value: forecast.targets.clicks_3m },
            { label: 'Conversions', value: forecast.targets.conversions_3m },
          ]}
        />
        <TargetCard
          icon={Target}
          label="6-Month Target"
          color="text-indigo-600"
          bg="bg-indigo-50"
          metrics={[
            { label: 'Sessions', value: forecast.targets.sessions_6m },
            { label: 'Clicks', value: forecast.targets.clicks_6m },
            { label: 'Conversions', value: forecast.targets.conversions_6m },
          ]}
        />
        <TargetCard
          icon={Zap}
          label="Growth Rate"
          color="text-emerald-600"
          bg="bg-emerald-50"
          metrics={[
            { label: 'Monthly', value: forecast.targets.growthRate },
            { label: 'Trend', value: forecast.targets.growthRate.startsWith('+') ? 'Up' : 'Flat' },
          ]}
        />
      </div>
    </div>
  );
}

function TargetCard({ icon: Icon, label, color, bg, metrics }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <div className="space-y-1.5">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{m.label}</span>
              <span className="text-sm font-bold text-gray-800">
                {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}