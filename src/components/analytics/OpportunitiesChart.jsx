import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

export default function OpportunitiesChart({ opportunities = [] }) {
  const data = React.useMemo(() => {
    const monthlyData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    opportunities.forEach(opp => {
      const date = new Date(opp.created_date || opp.close_date || new Date());
      const monthKey = months[date.getMonth()];
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, amount: 0, weighted: 0, count: 0 };
      }
      
      monthlyData[monthKey].amount += opp.amount || 0;
      monthlyData[monthKey].weighted += (opp.amount || 0) * (opp.probability || 50) / 100;
      monthlyData[monthKey].count += 1;
    });
    
    return months.map(month => monthlyData[month] || { month, amount: 0, weighted: 0, count: 0 });
  }, [opportunities]);

  const totals = React.useMemo(() => {
    const totalAmount = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalWeighted = opportunities.reduce((sum, o) => sum + ((o.amount || 0) * (o.probability || 50) / 100), 0);
    const weightedPercent = totalAmount > 0 ? (totalWeighted / totalAmount * 100) : 0;
    
    return {
      amount: totalAmount,
      weighted: weightedPercent,
      count: opportunities.length,
    };
  }, [opportunities]);
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Opportunities by user</CardTitle>
        <Button variant="ghost" size="sm" className="text-gray-500">
          Month <ChevronDown className="ml-1 w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Amount</span>
            <p className="text-lg font-bold">${totals.amount.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-500">Amount Weighted</span>
            <p className="text-lg font-bold">{totals.weighted.toFixed(1)}%</p>
          </div>
          <div>
            <span className="text-gray-500">Count</span>
            <p className="text-lg font-bold">{totals.count}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="weighted" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}