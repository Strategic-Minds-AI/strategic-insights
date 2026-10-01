import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Calendar as CalendarIcon,
  Phone,
  Users,
  Target,
  Edit2,
  MessageCircle,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  startOfDay,
  endOfDay,
  addDays,
  parseISO,
  isSameMonth
} from 'date-fns';
import CalendarKPICard from '../components/calendar/CalendarKPICard';
import CalendarFilters from '../components/calendar/CalendarFilters';
import EventDialog from '../components/calendar/EventDialog';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    eventTypes: [],
    dateRange: null,
  });
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setDialogOpen(false);
      setSelectedEvent(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setDialogOpen(false);
      setSelectedEvent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchSearch = event.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filters.eventTypes.length === 0 || filters.eventTypes.includes(event.event_type);
      
      let matchDate = true;
      if (filters.dateRange) {
        const eventDate = parseISO(event.start_date);
        const today = startOfDay(new Date());
        
        if (filters.dateRange === 'today') {
          matchDate = isSameDay(eventDate, today);
        } else if (filters.dateRange === 'tomorrow') {
          matchDate = isSameDay(eventDate, addDays(today, 1));
        } else if (filters.dateRange === 'thisWeek') {
          matchDate = isWithinInterval(eventDate, {
            start: startOfWeek(today),
            end: endOfWeek(today),
          });
        } else if (filters.dateRange === 'nextWeek') {
          const nextWeekStart = addDays(endOfWeek(today), 1);
          matchDate = isWithinInterval(eventDate, {
            start: nextWeekStart,
            end: endOfWeek(nextWeekStart),
          });
        }
      }
      
      return matchSearch && matchType && matchDate;
    });
  }, [events, searchTerm, filters]);

  // KPI calculations
  const kpis = useMemo(() => {
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(today);
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);

    const todayEvents = events.filter(e => {
      const eventDate = parseISO(e.start_date);
      return isWithinInterval(eventDate, { start: today, end: todayEnd });
    }).length;

    const totalEvents = events.length;

    const meetingsThisWeek = events.filter(e => {
      const eventDate = parseISO(e.start_date);
      return e.event_type === 'meeting' && isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
    }).length;

    const callsThisWeek = events.filter(e => {
      const eventDate = parseISO(e.start_date);
      return e.event_type === 'call' && isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
    }).length;

    return { todayEvents, totalEvents, meetingsThisWeek, callsThisWeek };
  }, [events]);

  // Get events for a specific day
  const getEventsForDay = (day) => {
    return filteredEvents.filter(event => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, day);
    });
  };

  // Upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    return filteredEvents
      .filter(e => {
        const eventDate = parseISO(e.start_date);
        return eventDate >= today && eventDate <= nextWeek && e.status === 'scheduled';
      })
      .slice(0, 5);
  }, [filteredEvents]);

  const getEventColor = (type) => {
    const colors = {
      meeting: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-600' },
      call: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-600' },
      demo: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-600' },
      task: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-600' },
      reminder: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-600' },
      appointment: { bg: 'bg-cyan-100', text: 'text-cyan-800', dot: 'bg-cyan-600' },
    };
    return colors[type] || colors.meeting;
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleSubmit = (data) => {
    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFilterChange = (key, value) => {
    if (key === 'reset') {
      setFilters({ eventTypes: [], dateRange: null });
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your schedule and events</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setSelectedEvent(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CalendarKPICard
          title="Today's Events"
          value={kpis.todayEvents}
          trend="up"
          trendValue="+3"
          icon={CalendarIcon}
          color="blue"
        />
        <CalendarKPICard
          title="Total Events"
          value={kpis.totalEvents}
          trend="up"
          trendValue="+34"
          icon={Target}
          color="green"
        />
        <CalendarKPICard
          title="Meetings This Week"
          value={kpis.meetingsThisWeek}
          trend="up"
          trendValue="+2"
          icon={Users}
          color="purple"
        />
        <CalendarKPICard
          title="Calls This Week"
          value={kpis.callsThisWeek}
          trend="up"
          trendValue="+3"
          icon={Phone}
          color="orange"
        />
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          {/* Calendar Card */}
          <Card className="p-4 sm:p-6 mb-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={goToToday} className="hidden sm:flex">
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs sm:text-sm font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                const dayEvents = getEventsForDay(day);

                return (
                  <div
                    key={day.toString()}
                    className={`min-h-20 sm:min-h-24 p-1 sm:p-2 rounded-lg border transition-all ${
                      isToday
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isCurrentMonth
                        ? 'bg-white hover:bg-gray-50'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <div className={`text-xs sm:text-sm font-medium mb-1 ${isToday ? 'text-white' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((event) => {
                        const color = getEventColor(event.event_type);
                        return (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer ${
                              isToday ? 'bg-white/20 text-white' : `${color.bg} ${color.text}`
                            }`}
                            onClick={() => handleEdit(event)}
                            title={event.title}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${isToday ? 'bg-white' : color.dot}`}></span>
                            {event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className={`text-xs ${isToday ? 'text-white' : 'text-gray-500'}`}>
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Upcoming Events & Agenda View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Events */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No upcoming events</p>
                ) : (
                  upcomingEvents.map((event) => {
                    const color = getEventColor(event.event_type);
                    return (
                      <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <div className={`w-2 h-12 rounded-full ${color.dot}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{event.title}</p>
                          <p className="text-sm text-gray-600">
                            {format(parseISO(event.start_date), 'MMM d, h:mm a')}
                          </p>
                          {event.related_to_name && (
                            <p className="text-xs text-gray-500">{event.related_to_type}: {event.related_to_name}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(event)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {event.event_type === 'call' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Phone className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Agenda View */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Agenda View</h3>
              <div className="space-y-3">
                {filteredEvents.slice(0, 10).map((event) => {
                  const color = getEventColor(event.event_type);
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                        <div className={`w-2 h-2 rounded-full ${color.dot}`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{event.title}</p>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(event.start_date), 'EEEE, MMM d • h:mm a')}
                        </p>
                        {event.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(event)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteMutation.mutate(event.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
                {filteredEvents.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No events found</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Right Sidebar - Filters */}
        <div className="hidden lg:block w-80">
          <CalendarFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        event={selectedEvent}
      />
    </div>
  );
}