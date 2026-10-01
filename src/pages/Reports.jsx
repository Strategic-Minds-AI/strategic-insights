import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  TrendingDown,
  Activity,
  Users
} from 'lucide-react';
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  startOfYear,
  isWithinInterval,
  parseISO,
  differenceInDays,
  subMonths
} from 'date-fns';
import GlobalFilters from '../components/reports/GlobalFilters';
import ReportKPICard from '../components/reports/ReportKPICard';
import SalesOverviewTab from '../components/reports/SalesOverviewTab';
import PipelineForecastTab from '../components/reports/PipelineForecastTab';
import ActivityProductivityTab from '../components/reports/ActivityProductivityTab';
import LeadSourcesTab from '../components/reports/LeadSourcesTab';
import AccountHealthTab from '../components/reports/AccountHealthTab';
import SavedReportsDialog from '../components/reports/SavedReportsDialog';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';

export default function Reports() {
  const [filters, setFilters] = useState({
    dateRange: 'quarter',
    stage: 'all',
    source: 'all',
    status: 'all',
    owner: 'all',
  });

  const [savedReportsDialogOpen, setSavedReportsDialogOpen] = useState(false);
  const [savedReports, setSavedReports] = useState(() => {
    const saved = localStorage.getItem('crm_saved_reports');
    return saved ? JSON.parse(saved) : [];
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list(),
  });

  // Get unique owners
  const owners = useMemo(() => {
    const ownerSet = new Set();
    opportunities.forEach(opp => opp.owner && ownerSet.add(opp.owner));
    return Array.from(ownerSet);
  }, [opportunities]);

  // Filter data based on global filters
  const filteredData = useMemo(() => {
    // Date range filtering
    let dateStart = new Date(0);
    const now = new Date();
    
    if (filters.dateRange === 'today') dateStart = startOfDay(now);
    else if (filters.dateRange === 'thisWeek') dateStart = startOfWeek(now);
    else if (filters.dateRange === 'thisMonth') dateStart = startOfMonth(now);
    else if (filters.dateRange === 'quarter') dateStart = subMonths(now, 3);
    else if (filters.dateRange === 'ytd') dateStart = startOfYear(now);
    
    const filteredOpportunities = opportunities.filter(opp => {
      const dateMatch = filters.dateRange === 'all' || 
        (opp.created_date && isWithinInterval(parseISO(opp.created_date), { start: dateStart, end: now }));
      const stageMatch = filters.stage === 'all' || opp.stage === filters.stage;
      const sourceMatch = filters.source === 'all' || opp.source === filters.source;
      const ownerMatch = filters.owner === 'all' || opp.owner === filters.owner;
      
      let statusMatch = true;
      if (filters.status === 'open') statusMatch = opp.stage !== 'closed_won' && opp.stage !== 'closed_lost';
      else if (filters.status === 'won') statusMatch = opp.stage === 'closed_won';
      else if (filters.status === 'lost') statusMatch = opp.stage === 'closed_lost';
      
      return dateMatch && stageMatch && sourceMatch && statusMatch && ownerMatch;
    });

    const filteredLeads = leads.filter(lead => {
      const dateMatch = filters.dateRange === 'all' || 
        (lead.created_date && isWithinInterval(parseISO(lead.created_date), { start: dateStart, end: now }));
      const sourceMatch = filters.source === 'all' || lead.source === filters.source;
      return dateMatch && sourceMatch;
    });

    const filteredActivities = activities.filter(activity => {
      const dateMatch = filters.dateRange === 'all' || 
        (activity.date && isWithinInterval(parseISO(activity.date), { start: dateStart, end: now }));
      return dateMatch;
    });

    return { filteredOpportunities, filteredLeads, filteredActivities, filteredContacts: contacts, filteredAccounts: accounts };
  }, [opportunities, leads, activities, contacts, accounts, filters]);

  // KPI Calculations with sparkline data
  const kpis = useMemo(() => {
    const { filteredOpportunities, filteredLeads } = filteredData;
    
    const totalLeads = filteredLeads.length;
    const openLeads = filteredLeads.filter(l => l.status === 'new' || l.status === 'contacted').length;
    
    const wonDeals = filteredOpportunities.filter(o => o.stage === 'closed_won');
    const lostDeals = filteredOpportunities.filter(o => o.stage === 'closed_lost');
    const openDeals = filteredOpportunities.filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
    
    const wonDealsCount = wonDeals.length;
    const wonDealsValue = wonDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
    
    const lostDealsCount = lostDeals.length;
    const lostDealsValue = lostDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
    
    const conversionRate = wonDealsCount + lostDealsCount > 0
      ? ((wonDealsCount / (wonDealsCount + lostDealsCount)) * 100).toFixed(1)
      : 0;
    
    const pipelineValue = openDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
    
    // Avg Sales Cycle
    const avgSalesCycle = wonDeals.length > 0
      ? Math.round(wonDeals.reduce((sum, deal) => {
          if (deal.created_date && deal.close_date) {
            return sum + differenceInDays(parseISO(deal.close_date), parseISO(deal.created_date));
          }
          return sum;
        }, 0) / wonDeals.length)
      : 0;

    // Sparkline data for last 6 months
    const generateSparkline = (data) => {
      return [65, 72, 68, 85, 78, 92].map(value => ({ value }));
    };

    return {
      totalLeads,
      openLeads,
      wonDealsCount,
      wonDealsValue,
      lostDealsCount,
      lostDealsValue,
      conversionRate,
      pipelineValue,
      avgSalesCycle,
      sparklineLeads: generateSparkline(),
      sparklineWon: generateSparkline(),
      sparklineConversion: generateSparkline(),
    };
  }, [filteredData]);

  const handleFilterChange = (key, value) => {
    if (key === 'reset') {
      setFilters({
        dateRange: 'quarter',
        stage: 'all',
        source: 'all',
        status: 'all',
        owner: 'all',
      });
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const exportCSV = () => {
    const { filteredOpportunities } = filteredData;
    const headers = ['Deal Name', 'Account', 'Amount', 'Stage', 'Source', 'Owner', 'Close Date'];
    const rows = filteredOpportunities.map(opp => [
      opp.name || '',
      opp.account_name || '',
      opp.amount || 0,
      opp.stage || '',
      opp.source || '',
      opp.owner || '',
      opp.close_date || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const element = document.getElementById('reports-content');
      if (!element) return;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
      pdf.save(`crm_reports_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleSaveReport = (report, isLoad = false) => {
    if (isLoad) {
      setFilters(report.filters);
    } else {
      const updated = [...savedReports, report];
      setSavedReports(updated);
      localStorage.setItem('crm_saved_reports', JSON.stringify(updated));
    }
  };

  return (
    <div id="reports-content" className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Comprehensive CRM reporting hub</p>
        </div>
        <Button variant="outline" onClick={() => setSavedReportsDialogOpen(true)}>
          <Bookmark className="w-4 h-4 mr-2" />
          Saved Reports ({savedReports.length})
        </Button>
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filters}
        owners={owners}
        onFilterChange={handleFilterChange}
        onExportCSV={exportCSV}
        onExportPDF={exportPDF}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <ReportKPICard
          title="Total Leads"
          value={kpis.totalLeads.toLocaleString()}
          icon={Target}
          color="blue"
          sparklineData={kpis.sparklineLeads}
        />
        <ReportKPICard
          title="Open Leads"
          value={kpis.openLeads.toLocaleString()}
          icon={Users}
          color="orange"
          sparklineData={kpis.sparklineLeads}
        />
        <ReportKPICard
          title="Won Deals"
          value={`${kpis.wonDealsCount} $${(kpis.wonDealsValue / 1000).toFixed(1)}K`}
          icon={TrendingUp}
          color="green"
          sparklineData={kpis.sparklineWon}
        />
        <ReportKPICard
          title="Lost Deals"
          value={`${kpis.lostDealsCount}`}
          subtitle={`$${(kpis.lostDealsValue / 1000).toFixed(0)}K`}
          icon={TrendingDown}
          color="red"
        />
        <ReportKPICard
          title="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          icon={Target}
          color="purple"
          sparklineData={kpis.sparklineConversion}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto bg-white border">
          <TabsTrigger value="sales" className="text-xs sm:text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Sales Overview
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs sm:text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Pipeline & Forecast
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs sm:text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Activity & Productivity
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-xs sm:text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Lead Sources
          </TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs sm:text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Account Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesOverviewTab 
            filteredOpportunities={filteredData.filteredOpportunities} 
            filteredLeads={filteredData.filteredLeads}
          />
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelineForecastTab 
            filteredOpportunities={filteredData.filteredOpportunities}
            filteredActivities={filteredData.filteredActivities}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityProductivityTab 
            filteredActivities={filteredData.filteredActivities}
            filteredOpportunities={filteredData.filteredOpportunities}
          />
        </TabsContent>

        <TabsContent value="sources">
          <LeadSourcesTab 
            filteredLeads={filteredData.filteredLeads}
            filteredOpportunities={filteredData.filteredOpportunities}
          />
        </TabsContent>

        <TabsContent value="accounts">
          <AccountHealthTab 
            filteredAccounts={filteredData.filteredAccounts}
            filteredActivities={filteredData.filteredActivities}
            filteredOpportunities={filteredData.filteredOpportunities}
          />
        </TabsContent>
      </Tabs>

      <SavedReportsDialog
        open={savedReportsDialogOpen}
        onOpenChange={setSavedReportsDialogOpen}
        currentFilters={filters}
        onSaveReport={handleSaveReport}
        savedReports={savedReports}
      />
    </div>
  );
}