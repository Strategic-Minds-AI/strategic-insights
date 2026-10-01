import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Building2, MoreVertical, Download, Star, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AccountDialog from '../components/forms/AccountDialog';
import EditAccountDialog from '../components/forms/EditAccountDialog';
import AccountKPICard from '../components/accounts/AccountKPICard';
import AccountFilters from '../components/accounts/AccountFilters';
import AccountInsightsDialog from '../components/accounts/AccountInsightsDialog';

export default function Accounts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [insightsDialogOpen, setInsightsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [filters, setFilters] = useState({
    owner: 'all',
    industry: 'all',
    revenue: 'all',
    tiers: [],
  });
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list('-created_date'),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-date'),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date'),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Account.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Account.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setEditDialogOpen(false);
      setSelectedAccount(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Account.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const enrichedAccounts = useMemo(() => {
    return accounts.map(account => {
      const accountActivities = activities.filter(a => a.related_to_name === account.name);
      const lastActivity = accountActivities.length > 0 
        ? new Date(Math.max(...accountActivities.map(a => new Date(a.date))))
        : null;
      
      const openDeals = opportunities.filter(
        o => o.account_name === account.name && 
        o.stage !== 'closed_won' && 
        o.stage !== 'closed_lost'
      ).length;

      const overdueActivities = accountActivities.filter(a => 
        new Date(a.date) < new Date() && !a.completed
      ).length;

      // Assign random tier for demo (in real app, this would be in the entity)
      const tiers = ['Key', 'A', 'B', 'C'];
      const tier = account.annual_revenue > 1000000 ? 'Key' : 
                   account.annual_revenue > 500000 ? 'A' : 
                   account.annual_revenue > 100000 ? 'B' : 'C';

      // Calculate health status
      const daysSinceLastActivity = lastActivity 
        ? Math.floor((new Date() - lastActivity) / (1000 * 60 * 60 * 24))
        : 999;
      
      const health = overdueActivities > 0 ? 'Needs Attention' :
                     daysSinceLastActivity > 30 ? 'At Risk' : 'Healthy';

      return {
        ...account,
        tier,
        lastActivity,
        openDeals,
        overdueActivities,
        health,
        owner: account.created_by || 'John Kuy',
      };
    });
  }, [accounts, activities, opportunities]);

  const filteredAccounts = useMemo(() => {
    return enrichedAccounts.filter(account => {
      const matchSearch = account.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchIndustry = filters.industry === 'all' || account.industry === filters.industry;
      const matchTier = filters.tiers.length === 0 || filters.tiers.includes(account.tier) || 
                        (filters.tiers.includes('Key Account') && account.tier === 'Key');
      
      return matchSearch && matchIndustry && matchTier;
    });
  }, [enrichedAccounts, searchTerm, filters]);

  const kpis = useMemo(() => {
    const totalAccounts = enrichedAccounts.length;
    const activeAccounts = enrichedAccounts.filter(a => a.status === 'active').length;
    const keyAccounts = enrichedAccounts.filter(a => a.tier === 'Key').length;
    const totalRevenue = opportunities
      .filter(o => o.stage === 'closed_won')
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    const overdueAccounts = enrichedAccounts.filter(a => a.overdueActivities > 0).length;

    return {
      totalAccounts,
      activeAccounts,
      keyAccounts,
      totalRevenue,
      overdueAccounts,
    };
  }, [enrichedAccounts, opportunities]);

  const handleEdit = (account) => {
    setSelectedAccount(account);
    setEditDialogOpen(true);
  };

  const handleViewInsights = (account) => {
    setSelectedAccount(account);
    setInsightsDialogOpen(true);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportToCSV = () => {
    if (accounts.length === 0) return;
    
    const headers = ['Name', 'Industry', 'Phone', 'Email', 'Website', 'Annual Revenue', 'Employees', 'Status', 'Tier', 'Health'];
    const rows = filteredAccounts.map(account => [
      account.name || '',
      account.industry || '',
      account.phone || '',
      account.email || '',
      account.website || '',
      account.annual_revenue || '',
      account.employees || '',
      account.status || '',
      account.tier || '',
      account.health || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTierBadge = (tier) => {
    const colors = {
      'Key': 'bg-yellow-100 text-yellow-800',
      'A': 'bg-green-100 text-green-800',
      'B': 'bg-blue-100 text-blue-800',
      'C': 'bg-gray-100 text-gray-800',
    };
    return colors[tier] || 'bg-gray-100 text-gray-800';
  };

  const getHealthBadge = (health) => {
    const colors = {
      'Healthy': 'bg-green-100 text-green-800',
      'At Risk': 'bg-yellow-100 text-yellow-800',
      'Needs Attention': 'bg-red-100 text-red-800',
    };
    return colors[health] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Accounts</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={accounts.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Account
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <AccountKPICard
          title="Total Accounts"
          value={kpis.totalAccounts}
          trend="up"
          trendValue="+2%"
          chartData={[50, 60, 55, 70, 65, 75]}
          color="blue"
        />
        <AccountKPICard
          title="Active Accounts"
          value={kpis.activeAccounts}
          trend="up"
          trendValue="+2%"
          chartData={[55, 60, 58, 68, 65, 72]}
          color="green"
        />
        <AccountKPICard
          title="Key Accounts"
          value={kpis.keyAccounts}
          trend="up"
          trendValue="+5%"
          chartData={[40, 45, 50, 55, 58, 62]}
          color="cyan"
        />
        <AccountKPICard
          title="Total Revenue"
          value={`$${(kpis.totalRevenue / 1000000).toFixed(1)}M`}
          trend="up"
          trendValue="+3.6%"
          chartData={[60, 65, 70, 75, 78, 82]}
          color="purple"
        />
        <AccountKPICard
          title="Overdue Activities"
          value={kpis.overdueAccounts}
          chartData={[30, 35, 40, 38, 42, 45]}
          color="red"
        />
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value="table">
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="cards">Cards</SelectItem>
                  </SelectContent>
                </Select>

                <Select value="format">
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm">More</Button>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No accounts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map((account) => (
                      <TableRow 
                        key={account.id} 
                        className={`cursor-pointer hover:bg-gray-50 ${
                          account.tier === 'Key' ? 'bg-yellow-50/30' : ''
                        } ${account.overdueActivities > 0 ? 'border-l-4 border-l-red-500' : ''}`}
                        onClick={() => handleViewInsights(account)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{account.name}</p>
                                {account.tier === 'Key' && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                                {account.overdueActivities > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {account.overdueActivities} Overdue
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{account.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{account.industry || '-'}</TableCell>
                        <TableCell>
                          {account.annual_revenue ? `$${(account.annual_revenue / 1000000).toFixed(1)}M` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTierBadge(account.tier)}>
                            {account.tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6 bg-blue-100 text-blue-600 text-xs font-semibold flex items-center justify-center">
                              {account.owner?.split(' ').map(n => n[0]).join('') || 'A'}
                            </Avatar>
                            <span className="text-sm">{account.owner}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {account.lastActivity 
                              ? new Date(account.lastActivity).toLocaleDateString()
                              : 'No activity'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getHealthBadge(account.health)}>
                            {account.health}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(account);
                              }}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleViewInsights(account);
                              }}>View Insights</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(account.id);
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Right Sidebar Filters */}
        <div className="hidden lg:block w-80">
          <AccountFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      <EditAccountDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        account={selectedAccount}
        onSubmit={(data) => updateMutation.mutate({ id: selectedAccount.id, data })}
        isLoading={updateMutation.isPending}
      />

      <AccountInsightsDialog
        open={insightsDialogOpen}
        onOpenChange={setInsightsDialogOpen}
        account={selectedAccount}
        activities={activities}
        contacts={contacts}
        opportunities={opportunities}
      />
    </div>
  );
}