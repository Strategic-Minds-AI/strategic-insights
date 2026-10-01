import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { differenceInDays, parseISO, format } from 'date-fns';
import TableExportButtons from './TableExportButtons';

export default function PipelineForecastTab({ filteredOpportunities, filteredActivities }) {
  const openOpps = filteredOpportunities.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');

  // Pipeline by Stage
  const pipelineByStage = React.useMemo(() => {
    const stageData = {};
    openOpps.forEach(opp => {
      const stage = opp.stage || 'unknown';
      if (!stageData[stage]) stageData[stage] = { stage, count: 0, value: 0 };
      stageData[stage].count++;
      stageData[stage].value += opp.amount || 0;
    });
    return Object.values(stageData);
  }, [openOpps]);

  // Forecast by Probability
  const forecastByProbability = React.useMemo(() => {
    const bands = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
    openOpps.forEach(opp => {
      const prob = opp.probability || 0;
      if (prob <= 25) bands['0-25'] += opp.amount || 0;
      else if (prob <= 50) bands['26-50'] += opp.amount || 0;
      else if (prob <= 75) bands['51-75'] += opp.amount || 0;
      else bands['76-100'] += opp.amount || 0;
    });
    return Object.entries(bands).map(([band, value]) => ({ band, value }));
  }, [openOpps]);

  // Aging Pipeline
  const agingPipeline = React.useMemo(() => {
    const ageData = { '<30 days': 0, '30-60 days': 0, '60-90 days': 0, '>90 days': 0 };
    openOpps.forEach(opp => {
      const days = differenceInDays(new Date(), parseISO(opp.created_date));
      if (days < 30) ageData['<30 days']++;
      else if (days < 60) ageData['30-60 days']++;
      else if (days < 90) ageData['60-90 days']++;
      else ageData['>90 days']++;
    });
    return Object.entries(ageData).map(([age, count]) => ({ age, count }));
  }, [openOpps]);

  // Deals at Risk
  const dealsAtRisk = React.useMemo(() => {
    return openOpps.filter(opp => {
      const lastActivity = filteredActivities
        .filter(a => a.related_to_id === opp.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      
      const daysSinceActivity = lastActivity 
        ? differenceInDays(new Date(), parseISO(lastActivity.date))
        : 999;
      
      return daysSinceActivity > 14;
    }).slice(0, 20);
  }, [openOpps, filteredActivities]);

  // Forecasting Accuracy
  const forecastingAccuracy = React.useMemo(() => {
    const closedDeals = filteredOpportunities.filter(o => o.stage === 'closed_won' || o.stage === 'closed_lost');
    
    const monthlyData = {};
    closedDeals.forEach(deal => {
      if (deal.close_date && deal.created_date) {
        const month = format(parseISO(deal.close_date), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = { month, forecasted: 0, actual: 0, accuracy: 0 };
        }
        
        const forecastedAmount = (deal.amount || 0) * ((deal.probability || 50) / 100);
        const actualAmount = deal.stage === 'closed_won' ? (deal.amount || 0) : 0;
        
        monthlyData[month].forecasted += forecastedAmount;
        monthlyData[month].actual += actualAmount;
      }
    });
    
    return Object.values(monthlyData).map(item => ({
      ...item,
      accuracy: item.forecasted > 0 ? ((item.actual / item.forecasted) * 100).toFixed(1) : 0
    }));
  }, [filteredOpportunities]);

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899'];

  const exportDealsAtRiskCSV = () => {
    const headers = ['Deal', 'Account', 'Amount'];
    const rows = dealsAtRisk.map(d => [d.name, d.account_name, d.amount || 0]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deals_at_risk_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportOpenDealsCSV = () => {
    const headers = ['Deal', 'Stage', 'Amount'];
    const rows = openOpps.slice(0, 10).map(d => [d.name, d.stage, d.amount || 0]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open_deals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Forecasting Accuracy Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Forecasting Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastingAccuracy}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Line type="monotone" dataKey="forecasted" stroke="#3b82f6" strokeWidth={2} name="Forecasted" />
              <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Average Accuracy: {' '}
              <span className="font-bold text-lg text-gray-900">
                {forecastingAccuracy.length > 0
                  ? (forecastingAccuracy.reduce((sum, item) => sum + parseFloat(item.accuracy), 0) / forecastingAccuracy.length).toFixed(1)
                  : 0}%
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineByStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forecast by Probability</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={forecastByProbability}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ band, value }) => `${band}%: $${(value / 1000).toFixed(0)}K`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {forecastByProbability.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aging Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agingPipeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Open Deals by Stage</CardTitle>
            <TableExportButtons
              data={openOpps.slice(0, 10).map(d => [d.name, d.stage, `$${(d.amount || 0).toLocaleString()}`])}
              headers={['Deal', 'Stage', 'Amount']}
              title="Open Deals by Stage"
              onExportCSV={exportOpenDealsCSV}
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openOpps.slice(0, 10).map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{deal.stage}</Badge>
                    </TableCell>
                    <TableCell className="text-right">${(deal.amount || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {openOpps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No open deals</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Deals at Risk (No Activity 14+ Days)</CardTitle>
            <TableExportButtons
              data={dealsAtRisk.map(d => [d.name, d.account_name, `$${(d.amount || 0).toLocaleString()}`])}
              headers={['Deal', 'Account', 'Amount']}
              title="Deals at Risk"
              onExportCSV={exportDealsAtRiskCSV}
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealsAtRisk.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No at-risk deals</TableCell>
                  </TableRow>
                ) : (
                  dealsAtRisk.map((deal) => (
                    <TableRow key={deal.id} className="bg-red-50">
                      <TableCell className="font-medium">{deal.name}</TableCell>
                      <TableCell>{deal.account_name}</TableCell>
                      <TableCell className="text-right">${(deal.amount || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}