import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';

export default function LeadsAnalytics({ leads }) {
  // Pipeline value by stage
  const pipelineData = React.useMemo(() => {
    const stages = ['new', 'contacted', 'qualified', 'won', 'lost'];
    return stages.map(stage => ({
      stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      value: leads.filter(l => l.status === stage).reduce((sum, l) => sum + (l.value || 0), 0)
    }));
  }, [leads]);

  // Won vs Lost over time (simplified by creation date)
  const wonLostData = React.useMemo(() => {
    const grouped = {};
    leads.forEach(lead => {
      if (lead.status === 'won' || lead.status === 'lost') {
        const month = new Date(lead.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!grouped[month]) grouped[month] = { month, won: 0, lost: 0 };
        grouped[month][lead.status]++;
      }
    });
    return Object.values(grouped).slice(-6);
  }, [leads]);

  // Conversion funnel
  const funnelData = React.useMemo(() => {
    const newCount = leads.filter(l => l.status === 'new').length;
    const contactedCount = leads.filter(l => ['contacted', 'qualified', 'won'].includes(l.status)).length;
    const qualifiedCount = leads.filter(l => ['qualified', 'won'].includes(l.status)).length;
    const wonCount = leads.filter(l => l.status === 'won').length;

    return [
      { name: 'New Leads', value: newCount, fill: '#3b82f6' },
      { name: 'Contacted', value: contactedCount, fill: '#8b5cf6' },
      { name: 'Qualified', value: qualifiedCount, fill: '#10b981' },
      { name: 'Won', value: wonCount, fill: '#22c55e' },
    ];
  }, [leads]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#22c55e', '#ef4444'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Pipeline Value by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Won vs Lost Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={wonLostData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="won" fill="#10b981" name="Won" />
              <Bar dataKey="lost" fill="#ef4444" name="Lost" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={funnelData}>
                <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}