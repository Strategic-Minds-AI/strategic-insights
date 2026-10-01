import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Target, MoreVertical, Download, ArrowUpDown, AlertCircle } from 'lucide-react';
import LeadDialog from '../components/forms/LeadDialog';
import EditLeadDialog from '../components/forms/EditLeadDialog';
import KPICard from '../components/leads/KPICard';
import LeadFilters from '../components/leads/LeadFilters';
import LeadsAnalytics from '../components/leads/LeadsAnalytics';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, CheckCircle, XCircle, Percent, Calendar } from 'lucide-react';

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [sortColumn, setSortColumn] = useState('created_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filters, setFilters] = useState({
    status: 'all',
    source: 'all',
    minValue: '',
    followUpDate: '',
  });
  const [savedViews, setSavedViews] = useState([]);
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setEditDialogOpen(false);
      setSelectedLead(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const handleEdit = (lead) => {
    setSelectedLead(lead);
    setEditDialogOpen(true);
  };

  const handleQuickUpdate = (leadId, field, value) => {
    updateMutation.mutate({ id: leadId, data: { [field]: value } });
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      source: 'all',
      minValue: '',
      followUpDate: '',
    });
  };

  const handleSaveView = (name) => {
    setSavedViews(prev => [...prev, { name, filters: { ...filters } }]);
  };

  const filteredAndSortedLeads = useMemo(() => {
    let result = leads.filter(lead => {
      const matchSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = filters.status === 'all' || lead.status === filters.status;
      const matchSource = filters.source === 'all' || lead.source === filters.source;
      const matchValue = !filters.minValue || (lead.value && lead.value >= parseFloat(filters.minValue));
      const matchFollowUp = !filters.followUpDate || lead.next_follow_up === filters.followUpDate;

      return matchSearch && matchStatus && matchSource && matchValue && matchFollowUp;
    });

    result.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'created_date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [leads, searchTerm, filters, sortColumn, sortDirection]);

  const kpis = useMemo(() => {
    const totalLeads = filteredAndSortedLeads.length;
    const openLeads = filteredAndSortedLeads.filter(l => ['new', 'contacted', 'qualified'].includes(l.status)).length;
    const wonDeals = filteredAndSortedLeads.filter(l => l.status === 'won');
    const lostDeals = filteredAndSortedLeads.filter(l => l.status === 'lost');
    
    const wonCount = wonDeals.length;
    const wonValue = wonDeals.reduce((sum, l) => sum + (l.value || 0), 0);
    const lostCount = lostDeals.length;
    const lostValue = lostDeals.reduce((sum, l) => sum + (l.value || 0), 0);
    
    const conversionRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : 0;
    
    // Average sales cycle (simplified - days from creation to won)
    const avgCycle = wonDeals.length > 0
      ? Math.round(wonDeals.reduce((sum, l) => {
          const days = Math.floor((new Date() - new Date(l.created_date)) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / wonDeals.length)
      : 0;

    return {
      totalLeads,
      openLeads,
      wonCount,
      wonValue,
      lostCount,
      lostValue,
      conversionRate,
      avgCycle,
    };
  }, [filteredAndSortedLeads]);

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Value', 'Status', 'Source', 'Next Follow-up'];
    const rows = filteredAndSortedLeads.map(lead => [
      lead.name,
      lead.email || '',
      lead.phone || '',
      lead.company || '',
      lead.value || 0,
      lead.status,
      lead.source || '',
      lead.next_follow_up || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const isOverdue = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-purple-100 text-purple-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800',
    unqualified: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">Manage your sales leads</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportToCSV} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Lead
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KPICard
          title="Total Leads"
          value={kpis.totalLeads}
          Icon={TrendingUp}
          color="blue"
        />
        <KPICard
          title="Open Leads"
          value={kpis.openLeads}
          Icon={Target}
          color="orange"
        />
        <KPICard
          title="Won Deals"
          value={kpis.wonCount}
          subValue={`$${kpis.wonValue.toLocaleString()}`}
          Icon={CheckCircle}
          color="green"
        />
        <KPICard
          title="Dropped Deals"
          value={kpis.lostCount}
          subValue={`$${kpis.lostValue.toLocaleString()}`}
          Icon={XCircle}
          color="red"
        />
        <KPICard
          title="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          Icon={Percent}
          color="purple"
        />
        <KPICard
          title="Avg. Sales Cycle"
          value={`${kpis.avgCycle} days`}
          Icon={Calendar}
          color="cyan"
        />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <LeadFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            savedViews={savedViews}
            onSaveView={handleSaveView}
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">
                    Lead Name
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                  <div className="flex items-center gap-2">
                    Email
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Company</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('value')}>
                  <div className="flex items-center gap-2">
                    Value
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Source</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Target className="w-5 h-5 text-orange-600" />
                        </div>
                        <p className="font-medium">{lead.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{lead.email || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{lead.phone || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{lead.company || '-'}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={lead.value || ''}
                        onChange={(e) => handleQuickUpdate(lead.id, 'value', parseFloat(e.target.value) || 0)}
                        className="w-24 h-8 text-sm"
                        placeholder="$0"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.status || 'new'}
                        onValueChange={(value) => handleQuickUpdate(lead.id, 'status', value)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {lead.source ? (
                        <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={lead.next_follow_up || ''}
                          onChange={(e) => handleQuickUpdate(lead.id, 'next_follow_up', e.target.value)}
                          className={`w-36 h-8 text-sm ${isOverdue(lead.next_follow_up) ? 'border-red-500' : ''}`}
                        />
                        {isOverdue(lead.next_follow_up) && (
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(lead)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Convert to Opportunity</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteMutation.mutate(lead.id)}
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

      {/* Analytics Section */}
      <LeadsAnalytics leads={filteredAndSortedLeads} />

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      <EditLeadDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        lead={selectedLead}
        onSubmit={(data) => updateMutation.mutate({ id: selectedLead.id, data })}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}