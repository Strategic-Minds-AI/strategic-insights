import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';

export default function SalesOverviewTab({ filteredOpportunities, filteredLeads }) {
  const wonDeals = filteredOpportunities.filter(o => o.stage === 'closed_won');
  const lostDeals = filteredOpportunities.filter(o => o.stage === 'closed_lost');

  // Revenue Over Time
  const revenueOverTime = React.useMemo(() => {
    const monthlyData = {};
    wonDeals.forEach(deal => {
      if (deal.close_date) {
        const month = format(parseISO(deal.close_date), 'MMM yyyy');
        monthlyData[month] = (monthlyData[month] || 0) + (deal.amount || 0);
      }
    });
    return Object.entries(monthlyData).map(([month, revenue]) => ({ month, revenue }));
  }, [wonDeals]);

  // Won vs Lost Over Time
  const wonVsLostOverTime = React.useMemo(() => {
    const monthlyData = {};
    [...wonDeals, ...lostDeals].forEach(deal => {
      if (deal.close_date) {
        const month = format(parseISO(deal.close_date), 'MMM yyyy');
        if (!monthlyData[month]) monthlyData[month] = { month, won: 0, lost: 0 };
        if (deal.stage === 'closed_won') monthlyData[month].won++;
        else monthlyData[month].lost++;
      }
    });
    return Object.values(monthlyData);
  }, [wonDeals, lostDeals]);

  // Pipeline by Stage
  const pipelineByStage = React.useMemo(() => {
    const stageData = {};
    filteredOpportunities.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost').forEach(opp => {
      const stage = opp.stage || 'unknown';
      if (!stageData[stage]) stageData[stage] = { stage, count: 0, value: 0 };
      stageData[stage].count++;
      stageData[stage].value += opp.amount || 0;
    });
    return Object.values(stageData);
  }, [filteredOpportunities]);

  // Conversion Funnel
  const conversionFunnel = React.useMemo(() => {
    const stages = ['new', 'contacted', 'qualified'];
    const leadsByStage = stages.map(stage => ({
      stage,
      count: filteredLeads.filter(l => l.status === stage).length
    }));
    
    const oppStages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won'];
    const oppsByStage = oppStages.map(stage => ({
      stage,
      count: filteredOpportunities.filter(o => o.stage === stage).length
    }));

    return [...leadsByStage, ...oppsByStage];
  }, [filteredLeads, filteredOpportunities]);

  // Recent Won Deals
  const recentWonDeals = wonDeals.slice(0, 10);

  // Top Deals by Value
  const topDeals = [...filteredOpportunities]
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 10);

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Won vs Lost Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={wonVsLostOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="won" fill="#10b981" name="Won" />
                <Bar dataKey="lost" fill="#ef4444" name="Lost" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="value" fill="#8b5cf6" name="Value ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Won Deals</CardTitle>
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
                {recentWonDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No won deals</TableCell>
                  </TableRow>
                ) : (
                  recentWonDeals.map((deal) => (
                    <TableRow key={deal.id}>
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

        <Card>
          <CardHeader>
            <CardTitle>Top Deals by Value</CardTitle>
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
                {topDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No deals</TableCell>
                  </TableRow>
                ) : (
                  topDeals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{deal.stage}</Badge>
                      </TableCell>
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