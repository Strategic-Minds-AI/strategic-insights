import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';

export default function SalesFunnelChart({ opportunities = [] }) {
  const data = React.useMemo(() => {
    const monthlyData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    opportunities.forEach(opp => {
      const date = new Date(opp.created_date || opp.close_date || new Date());
      const monthKey = months[date.getMonth()];
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, prospecting: 0, qualification: 0, negotiation: 0 };
      }
      
      if (opp.stage === 'prospecting') monthlyData[monthKey].prospecting += opp.amount || 0;
      else if (opp.stage === 'qualification') monthlyData[monthKey].qualification += opp.amount || 0;
      else if (opp.stage === 'negotiation') monthlyData[monthKey].negotiation += opp.amount || 0;
    });
    
    return months.map(month => monthlyData[month] || { month, prospecting: 0, qualification: 0, negotiation: 0 });
  }, [opportunities]);
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Sales Funnel</CardTitle>
        <Button variant="ghost" size="sm" className="text-gray-500">
          <SlidersHorizontal className="mr-2 w-4 h-4" />
          Filters
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span className="text-sm text-gray-600">Prospecting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span className="text-sm text-gray-600">Qualification</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-sm text-gray-600">Negotiation</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Bar dataKey="prospecting" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="qualification" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="negotiation" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}