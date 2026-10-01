import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, isAfter } from 'date-fns';

export default function ActivityProductivityTab({ filteredActivities, filteredOpportunities }) {
  // Activities by Type
  const activitiesByType = React.useMemo(() => {
    const typeCounts = {};
    filteredActivities.forEach(activity => {
      const type = activity.type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return Object.entries(typeCounts).map(([type, count]) => ({ type, count }));
  }, [filteredActivities]);

  // Activities Over Time
  const activitiesOverTime = React.useMemo(() => {
    const monthlyData = {};
    filteredActivities.forEach(activity => {
      if (activity.date) {
        const month = format(parseISO(activity.date), 'MMM yyyy');
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      }
    });
    return Object.entries(monthlyData).map(([month, count]) => ({ month, count }));
  }, [filteredActivities]);

  // Activities vs Wins
  const wonDeals = filteredOpportunities.filter(o => o.stage === 'closed_won');
  const activitiesVsWins = activitiesOverTime.map(item => {
    const wonCount = wonDeals.filter(d => d.close_date && format(parseISO(d.close_date), 'MMM yyyy') === item.month).length;
    return { ...item, won: wonCount };
  });

  // Overdue Activities
  const overdueActivities = filteredActivities
    .filter(a => a.date && isAfter(new Date(), parseISO(a.date)) && a.type !== 'Note')
    .slice(0, 20);

  // Activities by Owner
  const activitiesByOwner = React.useMemo(() => {
    const ownerCounts = {};
    filteredActivities.forEach(activity => {
      const owner = activity.created_by || 'Unassigned';
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
    });
    return Object.entries(ownerCounts)
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredActivities]);

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'];

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activities by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activitiesByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, count }) => `${type}: ${count}`}
                  outerRadius={90}
                  dataKey="count"
                >
                  {activitiesByType.map((entry, index) => (
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
            <CardTitle>Activities Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activitiesOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activities vs Wins</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activitiesVsWins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Activities" />
                <Bar dataKey="won" fill="#10b981" name="Won Deals" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overdue Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No overdue activities</TableCell>
                  </TableRow>
                ) : (
                  overdueActivities.map((activity) => (
                    <TableRow key={activity.id} className="bg-red-50">
                      <TableCell className="font-medium">{activity.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.type}</Badge>
                      </TableCell>
                      <TableCell>{format(parseISO(activity.date), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Log by Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Activities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitiesByOwner.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-gray-500">No activities</TableCell>
                  </TableRow>
                ) : (
                  activitiesByOwner.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.owner}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
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