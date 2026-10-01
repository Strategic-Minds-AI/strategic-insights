import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

export default function LeadSourcesTab({ filteredLeads, filteredOpportunities }) {
  // Leads by Source
  const leadsBySource = React.useMemo(() => {
    const sourceCounts = {};
    filteredLeads.forEach(lead => {
      const source = lead.source || 'Unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    return Object.entries(sourceCounts).map(([source, count]) => ({ source, count }));
  }, [filteredLeads]);

  // Win Rate by Source
  const winRateBySource = React.useMemo(() => {
    const sourceData = {};
    filteredOpportunities.forEach(opp => {
      const source = opp.source || 'Unknown';
      if (!sourceData[source]) sourceData[source] = { won: 0, lost: 0 };
      if (opp.stage === 'closed_won') sourceData[source].won++;
      else if (opp.stage === 'closed_lost') sourceData[source].lost++;
    });
    
    return Object.entries(sourceData).map(([source, data]) => ({
      source,
      winRate: data.won + data.lost > 0 ? ((data.won / (data.won + data.lost)) * 100).toFixed(1) : 0
    }));
  }, [filteredOpportunities]);

  // Avg Deal Value by Source
  const avgDealValueBySource = React.useMemo(() => {
    const sourceData = {};
    filteredOpportunities.forEach(opp => {
      const source = opp.source || 'Unknown';
      if (!sourceData[source]) sourceData[source] = { total: 0, count: 0 };
      sourceData[source].total += opp.amount || 0;
      sourceData[source].count++;
    });
    
    return Object.entries(sourceData).map(([source, data]) => ({
      source,
      avgValue: data.count > 0 ? Math.round(data.total / data.count) : 0
    }));
  }, [filteredOpportunities]);

  // Source Performance Summary
  const sourcePerformance = React.useMemo(() => {
    const performance = {};
    
    filteredLeads.forEach(lead => {
      const source = lead.source || 'Unknown';
      if (!performance[source]) performance[source] = { source, leads: 0, won: 0, lost: 0, revenue: 0 };
      performance[source].leads++;
    });
    
    filteredOpportunities.forEach(opp => {
      const source = opp.source || 'Unknown';
      if (!performance[source]) performance[source] = { source, leads: 0, won: 0, lost: 0, revenue: 0 };
      if (opp.stage === 'closed_won') {
        performance[source].won++;
        performance[source].revenue += opp.amount || 0;
      } else if (opp.stage === 'closed_lost') {
        performance[source].lost++;
      }
    });
    
    return Object.values(performance);
  }, [filteredLeads, filteredOpportunities]);

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'];

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadsBySource}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ source, count }) => `${source}: ${count}`}
                  outerRadius={90}
                  dataKey="count"
                >
                  {leadsBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Win Rate by Source (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={winRateBySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="winRate" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Deal Value by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={avgDealValueBySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="avgValue" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Leads List by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.slice(0, 10).map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.source || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No leads</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcePerformance.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.source}</TableCell>
                    <TableCell className="text-right">{item.leads}</TableCell>
                    <TableCell className="text-right">{item.won}</TableCell>
                    <TableCell className="text-right">${(item.revenue / 1000).toFixed(0)}K</TableCell>
                  </TableRow>
                ))}
                {sourcePerformance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">No data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}