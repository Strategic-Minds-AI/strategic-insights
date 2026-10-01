import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Percent, 
  Calendar,
  CheckCircle,
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('month');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date'),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-date', 10),
  });

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      if (ownerFilter !== 'all' && opp.owner !== ownerFilter) return false;
      if (stageFilter !== 'all' && opp.stage !== stageFilter) return false;
      if (sourceFilter !== 'all' && opp.source !== sourceFilter) return false;
      return true;
    });
  }, [opportunities, ownerFilter, stageFilter, sourceFilter]);

  const kpis = useMemo(() => {
    const totalLeads = leads.length;
    const closedDeals = filteredOpportunities.filter(o => o.stage === 'closed_won');
    const dealsClosedValue = closedDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
    
    const currentMonth = new Date().getMonth();
    const revenueThisMonth = filteredOpportunities
      .filter(o => o.stage === 'closed_won' && new Date(o.updated_date).getMonth() === currentMonth)
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    
    const salesTarget = 0;
    const targetProgress = salesTarget > 0 ? ((revenueThisMonth / salesTarget) * 100).toFixed(1) : 0;
    
    const conversionRate = leads.length > 0 
      ? ((leads.filter(l => l.status === 'won').length / leads.length) * 100).toFixed(1) 
      : 0;
    
    const wonLeads = leads.filter(l => l.status === 'won');
    const avgSalesCycle = wonLeads.length > 0
      ? Math.round(wonLeads.reduce((sum, l) => {
          const days = Math.floor((new Date() - new Date(l.created_date)) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / wonLeads.length)
      : 0;

    return {
      totalLeads,
      dealsClosedValue,
      revenueThisMonth,
      salesTarget,
      targetProgress,
      conversionRate,
      avgSalesCycle,
    };
  }, [leads, filteredOpportunities]);

  const pipelineData = useMemo(() => {
    const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won'];
    return stages.map(stage => ({
      stage: stage === 'closed_won' ? 'Won' : stage.charAt(0).toUpperCase() + stage.slice(1),
      value: filteredOpportunities.filter(o => o.stage === stage).reduce((sum, o) => sum + (o.amount || 0), 0),
      count: filteredOpportunities.filter(o => o.stage === stage).length,
    }));
  }, [filteredOpportunities]);

  const revenueOverTime = useMemo(() => {
    const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const currentMonth = new Date().getMonth();
    
    return months.map((month, idx) => {
      const monthRevenue = opportunities
        .filter(o => {
          const oppMonth = new Date(o.updated_date).getMonth();
          return oppMonth === (currentMonth - 6 + idx + 12) % 12 && o.stage === 'closed_won';
        })
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      
      return {
        month,
        won: monthRevenue,
        target: 55000 + Math.random() * 10000,
      };
    });
  }, [opportunities]);

  const topPerformers = useMemo(() => {
    const performerMap = {};
    filteredOpportunities.forEach(opp => {
      if (opp.owner) {
        if (!performerMap[opp.owner]) {
          performerMap[opp.owner] = { name: opp.owner, deals: 0, value: 0 };
        }
        if (opp.stage === 'closed_won') {
          performerMap[opp.owner].deals++;
          performerMap[opp.owner].value += opp.amount || 0;
        }
      }
    });
    return Object.values(performerMap).sort((a, b) => b.value - a.value).slice(0, 3);
  }, [filteredOpportunities]);

  const leadSources = useMemo(() => {
    const sourceMap = {};
    leads.forEach(lead => {
      const source = lead.source || 'Unknown';
      sourceMap[source] = (sourceMap[source] || 0) + 1;
    });
    return Object.entries(sourceMap).map(([source, count]) => ({ source, count }));
  }, [leads]);

  const recentDeals = useMemo(() => {
    return filteredOpportunities
      .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
      .slice(0, 5);
  }, [filteredOpportunities]);

  const upcomingActivities = useMemo(() => {
    return activities
      .filter(a => new Date(a.date) >= new Date())
      .slice(0, 3);
  }, [activities]);

  const stageColors = {
    prospecting: 'bg-blue-500',
    qualification: 'bg-cyan-500',
    proposal: 'bg-yellow-500',
    negotiation: 'bg-orange-500',
    closed_won: 'bg-green-500',
    closed_lost: 'bg-red-500',
  };

  const statusColors = {
    prospecting: 'bg-blue-100 text-blue-800',
    qualification: 'bg-purple-100 text-purple-800',
    proposal: 'bg-yellow-100 text-yellow-800',
    negotiation: 'bg-orange-100 text-orange-800',
    closed_won: 'bg-green-100 text-green-800',
    closed_lost: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add</span>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Total Leads</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl sm:text-3xl font-bold">{kpis.totalLeads}</span>
              <div className="text-xs text-green-600 mb-1">+5.3%</div>
            </div>
            <div className="mt-2 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[{v:10},{v:12},{v:11},{v:14},{v:13},{v:15}]}>
                  <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Deals Closed</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl sm:text-3xl font-bold">${(kpis.dealsClosedValue / 1000).toFixed(1)}k</span>
            </div>
            <div className="mt-2 h-8 flex items-end gap-1">
              {[40, 55, 45, 70, 60, 80, 75].map((h, i) => (
                <div key={i} className="flex-1 bg-cyan-400 rounded-sm" style={{height: `${h}%`}}></div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Revenue This Month</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl sm:text-3xl font-bold">${(kpis.revenueThisMonth / 1000).toFixed(1)}k</span>
              <div className="text-xs text-green-600 mb-1">+15%</div>
            </div>
            <div className="mt-2 h-8 flex items-end gap-1">
              {[30, 40, 50, 45, 60, 70, 80].map((h, i) => (
                <div key={i} className="flex-1 bg-green-400 rounded-sm" style={{height: `${h}%`}}></div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Sales Target</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl sm:text-3xl font-bold">${(kpis.salesTarget / 1000).toFixed(0)}k</span>
              <div className="text-xs text-gray-600 mb-1">{kpis.targetProgress}%</div>
            </div>
            <div className="mt-2 h-8 flex items-end gap-1">
              {[30, 45, 60, 50, 70, 65, 75].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm" style={{
                  height: `${h}%`,
                  backgroundColor: i < 4 ? '#fbbf24' : '#3b82f6'
                }}></div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Conversion Rate</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl sm:text-3xl font-bold">{kpis.conversionRate}%</span>
            </div>
            <div className="mt-2 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{v:25},{v:28},{v:30},{v:29},{v:32},{v:31}]}>
                  <Area type="monotone" dataKey="v" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Avg. Sales Cycle</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl sm:text-3xl font-bold">{kpis.avgSalesCycle}</span>
              <span className="text-xs text-gray-600 mb-1">days</span>
            </div>
            <div className="mt-2 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[{v:30},{v:28},{v:29},{v:27},{v:26},{v:26}]}>
                  <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" size="sm" className="sm:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
          
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="prospecting">Prospecting</SelectItem>
              <SelectItem value="qualification">Qualification</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="closed_won">Won</SelectItem>
            </SelectContent>
          </Select>

          <Select value="format">
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="table">Table</SelectItem>
              <SelectItem value="cards">Cards</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Stage: Source" className="pl-9 h-9" />
          </div>

          <Button variant="ghost" size="sm">More...</Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Sales Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 mt-4 text-xs">
              {pipelineData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${stageColors[item.stage.toLowerCase().replace(' ', '_')] || 'bg-gray-400'}`}></div>
                  <span className="text-gray-600">{item.stage}: ${(item.value/1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-lg">Revenue Over Time</CardTitle>
              <span className="text-xs text-gray-500">Last 6 months</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="won" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Won" />
                <Area type="monotone" dataKey="target" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-lg">Top Performing Sales Reps</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b">
                <span>Sales Rep</span>
                <div className="flex gap-8">
                  <span>Deals</span>
                  <span>Owner</span>
                </div>
              </div>
              {topPerformers.map((performer, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold">
                      {performer.name.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{performer.name}</p>
                      <p className="text-xs text-gray-500">Top Admin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">${(performer.value/1000).toFixed(0)}k</span>
                    <Badge className={performer.deals > 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {performer.deals > 0 ? 'Won' : 'Active'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-lg">Lead Sources</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-600 h-8">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leadSources.slice(0, 4).map((source, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <Checkbox />
                    <span className="text-sm">Follow up with {source.source}</span>
                  </div>
                  <span className="text-xs text-gray-500">{source.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-lg">Upcoming Activities</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-600 h-8">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingActivities.length > 0 ? upcomingActivities.map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <Checkbox />
                    <div>
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.related_to_name}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.date).toLocaleDateString()}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming activities</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Deals */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg">Recent Deals</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left py-2 font-medium">Lead</th>
                  <th className="text-left py-2 font-medium">Company</th>
                  <th className="text-left py-2 font-medium">Deal Value</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Owner</th>
                  <th className="text-left py-2 font-medium">Close Date</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {recentDeals.map((deal, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8 bg-gray-200" />
                        <div>
                          <p className="text-sm font-medium">{deal.name}</p>
                          <p className="text-xs text-gray-500">{deal.account_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{deal.account_name}</td>
                    <td className="text-sm font-semibold">${(deal.amount || 0).toLocaleString()}</td>
                    <td>
                      <Badge className={statusColors[deal.stage] || 'bg-gray-100 text-gray-800'}>
                        {deal.stage === 'closed_won' ? 'Won' : deal.stage}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6 bg-blue-100" />
                        <span className="text-sm">{deal.owner}</span>
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">
                      {new Date(deal.close_date).toLocaleDateString()}
                    </td>
                    <td>
                      <Badge variant="outline" className="text-xs">
                        {deal.stage === 'closed_won' ? 'Contacted' : 
                         deal.stage === 'negotiation' ? 'Proposal' : 'Contacted'}
                      </Badge>
                    </td>
                    <td>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}