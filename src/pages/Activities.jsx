import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Phone, Mail, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';
import ActivityDialog from '../components/forms/ActivityDialog';
import ActivityKPICard from '../components/activities/ActivityKPICard';
import PriorityActivityItem from '../components/activities/PriorityActivityItem';
import ActivityTimeline from '../components/activities/ActivityTimeline';
import ActivityFilters from '../components/activities/ActivityFilters';
import ActivitiesAnalytics from '../components/activities/ActivitiesAnalytics';

export default function Activities() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activityType, setActivityType] = useState(null);
  const [priorityTab, setPriorityTab] = useState('overdue');
  const [filters, setFilters] = useState({
    types: [],
    owner: 'all',
    status: '7days',
  });
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Activity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setDialogOpen(false);
      setActivityType(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Activity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Activity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const handleQuickLog = (type) => {
    setActivityType(type);
    setDialogOpen(true);
  };

  const handleMarkComplete = (id) => {
    updateMutation.mutate({ id, data: { completed: true } });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchSearch = activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.related_to_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchType = filters.types.length === 0 || filters.types.includes(activity.type);
      
      return matchSearch && matchType;
    });
  }, [activities, searchTerm, filters]);

  const kpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activitiesToday = filteredActivities.filter(a => {
      const activityDate = new Date(a.date);
      return activityDate >= today && activityDate < tomorrow;
    }).length;

    const overdueActivities = filteredActivities.filter(a => 
      new Date(a.date) < today && !a.completed
    ).length;

    const emailsSent = filteredActivities.filter(a => a.type === 'Email').length;
    const callsLogged = filteredActivities.filter(a => a.type === 'Call').length;
    const meetingsScheduled = filteredActivities.filter(a => a.type === 'Meeting').length;
    const whatsappInteractions = filteredActivities.filter(a => a.type === 'WhatsApp').length;

    return {
      activitiesToday,
      overdueActivities,
      emailsSent,
      callsLogged,
      meetingsScheduled,
      whatsappInteractions,
    };
  }, [filteredActivities]);

  const priorityActivities = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      overdue: filteredActivities.filter(a => new Date(a.date) < today && !a.completed),
      dueToday: filteredActivities.filter(a => {
        const activityDate = new Date(a.date);
        return activityDate >= today && activityDate < tomorrow && !a.completed;
      }),
      upcoming: filteredActivities.filter(a => new Date(a.date) >= tomorrow && !a.completed),
      completed: filteredActivities.filter(a => a.completed),
    };
  }, [filteredActivities]);

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Activities</h1>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button size="sm" variant="outline" onClick={() => handleQuickLog('Call')}>
            <Phone className="w-4 h-4 mr-2" />
            Log Call
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleQuickLog('Email')}>
            <Mail className="w-4 h-4 mr-2" />
            Log Email
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleQuickLog('Meeting')}>
            <CalendarIcon className="w-4 h-4 mr-2" />
            Log Meeting
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleQuickLog('WhatsApp')}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Log WhatsApp
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <ActivityKPICard
          title="Activities Today"
          value={kpis.activitiesToday}
          trend="up"
          trendValue="+23%"
          chartData={[60, 70, 65, 80, 75, 85]}
          color="blue"
        />
        <ActivityKPICard
          title="Overdue Activities"
          value={kpis.overdueActivities}
          subText="Due now"
          trend="down"
          trendValue="2h overdue"
          chartData={[40, 50, 45, 60, 55, 50]}
          color="red"
        />
        <ActivityKPICard
          title="Emails Sent"
          value={kpis.emailsSent}
          subText="+7 today"
          chartData={[30, 40, 50, 60, 70, 80]}
          color="cyan"
        />
        <ActivityKPICard
          title="Calls Logged"
          value={kpis.callsLogged}
          subText="+4 today"
          chartData={[50, 55, 60, 65, 70, 75]}
          color="green"
        />
        <ActivityKPICard
          title="Meetings Scheduled"
          value={kpis.meetingsScheduled}
          subText="+1h 12m"
          chartData={[40, 50, 55, 60, 70, 65]}
          color="purple"
        />
        <ActivityKPICard
          title="WhatsApp"
          value={kpis.whatsappInteractions}
          chartData={[30, 35, 40, 45, 50, 55]}
          color="green"
        />
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          {/* Priority Activities */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Priority Activities</h2>
                <Button variant="ghost" size="sm">More</Button>
              </div>
              <Tabs value={priorityTab} onValueChange={setPriorityTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overdue">
                    Overdue
                    {priorityActivities.overdue.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                        {priorityActivities.overdue.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="dueToday">Due Today</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
                <TabsContent value="overdue" className="mt-4 space-y-2">
                  {priorityActivities.overdue.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No overdue activities</p>
                  ) : (
                    priorityActivities.overdue.map(activity => (
                      <PriorityActivityItem 
                        key={activity.id}
                        activity={activity}
                        onMarkComplete={handleMarkComplete}
                      />
                    ))
                  )}
                </TabsContent>
                <TabsContent value="dueToday" className="mt-4 space-y-2">
                  {priorityActivities.dueToday.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No activities due today</p>
                  ) : (
                    priorityActivities.dueToday.map(activity => (
                      <PriorityActivityItem 
                        key={activity.id}
                        activity={activity}
                        onMarkComplete={handleMarkComplete}
                      />
                    ))
                  )}
                </TabsContent>
                <TabsContent value="upcoming" className="mt-4 space-y-2">
                  {priorityActivities.upcoming.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No upcoming activities</p>
                  ) : (
                    priorityActivities.upcoming.slice(0, 5).map(activity => (
                      <PriorityActivityItem 
                        key={activity.id}
                        activity={activity}
                        onMarkComplete={handleMarkComplete}
                      />
                    ))
                  )}
                </TabsContent>
                <TabsContent value="completed" className="mt-4 space-y-2">
                  {priorityActivities.completed.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No completed activities</p>
                  ) : (
                    priorityActivities.completed.slice(0, 5).map(activity => (
                      <PriorityActivityItem 
                        key={activity.id}
                        activity={activity}
                        onMarkComplete={handleMarkComplete}
                      />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Activity Timeline</h2>
              <Button variant="ghost" size="sm">•••</Button>
            </div>
            
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading activities...</div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No activities found</div>
            ) : (
              <ActivityTimeline activities={filteredActivities} />
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="hidden lg:block w-80 space-y-6">
          <ActivityFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onSaveView={() => {}}
          />
          
          <ActivitiesAnalytics activities={filteredActivities} />
        </div>
      </div>

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(data) => createMutation.mutate({ ...data, type: activityType || data.type })}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}