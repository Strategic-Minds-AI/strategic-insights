import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { differenceInDays, parseISO } from 'date-fns';

export default function AccountHealthTab({ filteredAccounts, filteredActivities, filteredOpportunities }) {
  // Account Health Score
  const accountHealth = React.useMemo(() => {
    return filteredAccounts.map(account => {
      const accountActivities = filteredActivities.filter(a => a.related_to_id === account.id);
      const accountOpps = filteredOpportunities.filter(o => o.account_name === account.name);
      
      const lastActivity = accountActivities.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const daysSinceActivity = lastActivity ? differenceInDays(new Date(), parseISO(lastActivity.date)) : 999;
      
      let health = 'Healthy';
      if (daysSinceActivity > 60 || accountOpps.filter(o => o.stage === 'closed_lost').length > 0) {
        health = 'At Risk';
      } else if (daysSinceActivity > 30) {
        health = 'Needs Attention';
      }
      
      return { ...account, health, daysSinceActivity };
    });
  }, [filteredAccounts, filteredActivities, filteredOpportunities]);

  // Health Distribution
  const healthDistribution = React.useMemo(() => {
    const dist = { 'Healthy': 0, 'Needs Attention': 0, 'At Risk': 0 };
    accountHealth.forEach(acc => {
      dist[acc.health]++;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [accountHealth]);

  // Revenue by Account
  const revenueByAccount = React.useMemo(() => {
    return [...filteredAccounts]
      .filter(acc => acc.annual_revenue)
      .sort((a, b) => (b.annual_revenue || 0) - (a.annual_revenue || 0))
      .slice(0, 10)
      .map(acc => ({ name: acc.name, revenue: acc.annual_revenue }));
  }, [filteredAccounts]);

  // At Risk Accounts
  const atRiskAccounts = accountHealth.filter(acc => acc.health === 'At Risk').slice(0, 20);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Health Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={healthDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {healthDistribution.map((entry, index) => (
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
            <CardTitle>Top 10 Accounts by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByAccount} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>At Risk Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRiskAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No at-risk accounts</TableCell>
                  </TableRow>
                ) : (
                  atRiskAccounts.map((account) => (
                    <TableRow key={account.id} className="bg-red-50">
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>{account.daysSinceActivity === 999 ? 'Never' : `${account.daysSinceActivity}d ago`}</TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-800">At Risk</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.slice(0, 10).map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{account.industry || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No accounts</TableCell>
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