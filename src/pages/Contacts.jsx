import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, UserCircle, MoreVertical, Download, Scan, Phone, Mail, MessageCircle, Activity, Users, TrendingUp, AlertCircle, Award, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import ContactDialog from '../components/forms/ContactDialog';
import EditContactDialog from '../components/forms/EditContactDialog';
import BusinessCardScanner from '../components/forms/BusinessCardScanner';
import ImportContactsDialog from '../components/forms/ImportContactsDialog';
import ContactKPICard from '../components/contacts/ContactKPICard';
import ContactDetailsPanel from '../components/contacts/ContactDetailsPanel';
import ContactFiltersPanel from '../components/contacts/ContactFiltersPanel';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import moment from 'moment';

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [scannedData, setScannedData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'last_activity_date', direction: 'desc' });
  const [filters, setFilters] = useState({
    roles: [],
    priorities: [],
    companySizes: [],
    sources: [],
    engagementLevels: [],
    noRecentActivity: false
  });
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date'),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setEditDialogOpen(false);
      setSelectedContact(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const handleEdit = (contact) => {
    setSelectedContact(contact);
    setEditDialogOpen(true);
  };

  const handleViewDetails = (contact) => {
    setSelectedContact(contact);
    setShowDetailsPanel(true);
  };

  const handleInlinePriorityChange = async (contactId, newPriority) => {
    try {
      await updateMutation.mutateAsync({
        id: contactId,
        data: { priority: newPriority }
      });
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleInlineRoleChange = async (contactId, newRole) => {
    try {
      await updateMutation.mutateAsync({
        id: contactId,
        data: { role: newRole }
      });
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleFilterChange = (category, value) => {
    if (category === 'reset') {
      setFilters({
        roles: [],
        priorities: [],
        companySizes: [],
        sources: [],
        engagementLevels: [],
        noRecentActivity: false
      });
    } else if (category === 'noRecentActivity') {
      setFilters(prev => ({ ...prev, noRecentActivity: value }));
    } else {
      setFilters(prev => ({ ...prev, [category]: value }));
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleContactExtracted = (data) => {
    setScannedData(data);
    setDialogOpen(true);
  };

  const exportToCSV = () => {
    if (contacts.length === 0) return;
    
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Position', 'Status', 'Source'];
    const rows = contacts.map(contact => [
      contact.name || '',
      contact.email || '',
      contact.phone || '',
      contact.company || '',
      contact.position || '',
      contact.status || '',
      contact.source || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter and sort contacts
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = contacts.filter(contact => {
      // Search filter
      const matchesSearch = contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Role filter
      if (filters.roles.length > 0 && !filters.roles.includes(contact.role)) return false;
      
      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(contact.priority)) return false;
      
      // Company size filter
      if (filters.companySizes.length > 0 && !filters.companySizes.includes(contact.company_size)) return false;
      
      // Source filter
      if (filters.sources.length > 0 && !filters.sources.includes(contact.source)) return false;
      
      // Engagement level filter
      if (filters.engagementLevels.length > 0 && !filters.engagementLevels.includes(contact.engagement_level)) return false;
      
      // No recent activity filter
      if (filters.noRecentActivity) {
        if (!contact.last_activity_date) return true;
        const daysSinceActivity = moment().diff(moment(contact.last_activity_date), 'days');
        if (daysSinceActivity < 30) return false;
      }

      return true;
    });

    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'last_activity_date') {
          const aDate = aVal ? new Date(aVal) : new Date(0);
          const bDate = bVal ? new Date(bVal) : new Date(0);
          return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [contacts, searchTerm, filters, sortConfig]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = filteredAndSortedContacts.length;
    const thisMonth = filteredAndSortedContacts.filter(c => 
      moment(c.created_date).isAfter(moment().startOf('month'))
    ).length;
    const decisionMakers = filteredAndSortedContacts.filter(c => 
      c.role === 'Decision Maker' || c.role === 'Key Contact'
    ).length;
    const noActivity = filteredAndSortedContacts.filter(c => {
      if (!c.last_activity_date) return true;
      return moment().diff(moment(c.last_activity_date), 'days') >= 30;
    }).length;

    return { total, thisMonth, decisionMakers, noActivity };
  }, [filteredAndSortedContacts]);

  const priorityColors = {
    'Key': 'bg-amber-100 text-amber-800 border-amber-300',
    'Standard': 'bg-blue-100 text-blue-800 border-blue-300',
    'At Risk': 'bg-red-100 text-red-800 border-red-300'
  };

  const getDaysSinceActivity = (contact) => {
    if (!contact.last_activity_date) return 'Never';
    const days = moment().diff(moment(contact.last_activity_date), 'days');
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className={`flex-1 overflow-auto ${showDetailsPanel ? 'mr-[500px]' : ''}`}>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
              <p className="text-gray-500 mt-1">Manage your contacts</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={exportToCSV} disabled={contacts.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => setScannerOpen(true)}>
                <Scan className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Scan Card</span>
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setScannedData(null); setDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                New Contact
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ContactKPICard
              title="Total Contacts"
              value={kpis.total}
              icon={Users}
              iconColor="bg-blue-500"
            />
            <ContactKPICard
              title="New This Month"
              value={kpis.thisMonth}
              trend="up"
              trendValue={`+${kpis.thisMonth}`}
              icon={TrendingUp}
              iconColor="bg-green-500"
            />
            <ContactKPICard
              title="Top Decision Makers"
              value={kpis.decisionMakers}
              icon={Award}
              iconColor="bg-amber-500"
            />
            <ContactKPICard
              title="No Recent Activity"
              value={kpis.noActivity}
              icon={AlertCircle}
              iconColor="bg-red-500"
            />
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b">
              <div className="flex gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <TableRow className="border-b-2 border-gray-200">
                    <TableHead className="cursor-pointer w-64 font-semibold text-gray-700" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                        Name
                        {sortConfig.key === 'name' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">Role</TableHead>
                    <TableHead className="font-semibold text-gray-700">Priority</TableHead>
                    <TableHead className="cursor-pointer font-semibold text-gray-700" onClick={() => handleSort('last_activity_date')}>
                      <div className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                        Last Activity
                        {sortConfig.key === 'last_activity_date' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">Engagement</TableHead>
                    <TableHead className="font-semibold text-gray-700">Company</TableHead>
                    <TableHead className="font-semibold text-gray-700">Source</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading contacts...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAndSortedContacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <UserCircle className="w-12 h-12 text-gray-300" />
                          <span className="font-medium">No contacts found</span>
                          <span className="text-sm">Try adjusting your search or filters</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedContacts.map((contact) => {
                      const daysSinceActivity = contact.last_activity_date 
                        ? moment().diff(moment(contact.last_activity_date), 'days')
                        : 999;
                      const isKeyContact = contact.priority === 'Key';
                      const hasNoRecentActivity = daysSinceActivity >= 30;

                      return (
                        <TableRow 
                          key={contact.id}
                          className={`
                            cursor-pointer transition-all border-b border-gray-100
                            hover:bg-blue-50/50 hover:shadow-sm
                            ${isKeyContact ? 'bg-gradient-to-r from-amber-50/50 to-amber-50/30 border-l-4 border-l-amber-400' : ''} 
                            ${hasNoRecentActivity ? 'opacity-70' : ''}
                          `}
                          onClick={() => handleViewDetails(contact)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()} className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md ring-2 ring-blue-100 overflow-hidden">
                                  {contact.photo_url ? (
                                    <img src={contact.photo_url} alt={contact.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-white font-semibold text-base">
                                      {contact.name?.charAt(0)?.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                {isKeyContact && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                                    <Award className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 flex items-center gap-2">
                                  {contact.name}
                                </p>
                                <p className="text-sm text-gray-600">{contact.position || 'No position'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select 
                              value={contact.role || ''} 
                              onValueChange={(value) => handleInlineRoleChange(contact.id, value)}
                            >
                              <SelectTrigger className="h-9 w-[140px] border-gray-300 hover:border-blue-400 transition-colors">
                                <SelectValue placeholder="Set role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Decision Maker">Decision Maker</SelectItem>
                                <SelectItem value="Key Contact">Key Contact</SelectItem>
                                <SelectItem value="Influencer">Influencer</SelectItem>
                                <SelectItem value="End User">End User</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Badge className={`${priorityColors[contact.priority || 'Standard']} border font-medium px-3 py-1`}>
                              {contact.priority || 'Standard'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Activity className={`w-4 h-4 ${hasNoRecentActivity ? 'text-red-500' : 'text-green-500'}`} />
                              <span className={`text-sm font-medium ${hasNoRecentActivity ? 'text-red-600' : 'text-gray-700'}`}>
                                {getDaysSinceActivity(contact)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {contact.engagement_level && (
                              <div className="flex gap-1.5">
                                {[...Array(3)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-2 h-6 rounded-full transition-all ${
                                      i < (contact.engagement_level === 'High' ? 3 : contact.engagement_level === 'Medium' ? 2 : 1)
                                        ? contact.engagement_level === 'High' ? 'bg-green-500 shadow-sm' : contact.engagement_level === 'Medium' ? 'bg-yellow-500 shadow-sm' : 'bg-red-500 shadow-sm'
                                        : 'bg-gray-200'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{contact.company || '-'}</p>
                              {contact.company_size && (
                                <p className="text-xs text-gray-500 mt-0.5">{contact.company_size}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {contact.source && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                                {contact.source}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-green-100 hover:text-green-700 transition-colors">
                                <Phone className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-purple-100 hover:text-purple-700 transition-colors">
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-blue-100 hover:text-blue-700 transition-colors">
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-gray-100">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(contact)}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem>Log Activity</DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => deleteMutation.mutate(contact.id)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile View - Contact Cards */}
          <div className="lg:hidden mt-6 space-y-4">
            {filteredAndSortedContacts.map((contact) => (
              <Card key={contact.id} className="cursor-pointer" onClick={() => handleViewDetails(contact)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center overflow-hidden">
                        {contact.photo_url ? (
                          <img src={contact.photo_url} alt={contact.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-semibold text-lg">
                            {contact.name?.charAt(0)?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{contact.name}</p>
                        <p className="text-sm text-gray-600">{contact.position}</p>
                      </div>
                    </div>
                    <Badge className={priorityColors[contact.priority] || priorityColors['Standard']}>
                      {contact.priority || 'Standard'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">{contact.company}</p>
                    <p className="text-gray-600">{contact.email}</p>
                    {contact.last_activity_date && (
                      <p className="text-gray-500">Last activity: {getDaysSinceActivity(contact)}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="fixed right-0 top-16 bottom-0 w-80 bg-white shadow-2xl z-40 lg:static lg:shadow-none">
          <ContactFiltersPanel 
            filters={filters}
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Details Panel */}
      {showDetailsPanel && (
        <ContactDetailsPanel
          contact={selectedContact}
          onClose={() => {
            setShowDetailsPanel(false);
            setSelectedContact(null);
          }}
        />
      )}

      <ContactDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setScannedData(null);
        }}
        onSubmit={(data) => {
          createMutation.mutate(data);
          setScannedData(null);
        }}
        isLoading={createMutation.isPending}
        initialData={scannedData}
      />

      <EditContactDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        contact={selectedContact}
        onSubmit={(data) => updateMutation.mutate({ id: selectedContact.id, data })}
        isLoading={updateMutation.isPending}
      />

      <EditContactDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        contact={selectedContact}
        onSubmit={() => {}}
        isLoading={false}
        readOnly={true}
      />

      <BusinessCardScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onContactExtracted={handleContactExtracted}
      />

      <ImportContactsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })}
      />
    </div>
  );
}