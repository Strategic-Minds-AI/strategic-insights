import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Calendar, MessageSquare, FileText } from 'lucide-react';

export default function ActivityTimeline({ activities }) {
  const groupedActivities = React.useMemo(() => {
    const grouped = {};
    activities.forEach(activity => {
      const date = new Date(activity.date).toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(activity);
    });
    return grouped;
  }, [activities]);

  const getActivityIcon = (type) => {
    const icons = {
      'Email': Mail,
      'Call': Phone,
      'Meeting': Calendar,
      'WhatsApp': MessageSquare,
      'Note': FileText,
    };
    const Icon = icons[type] || FileText;
    return Icon;
  };

  const getIconColor = (type) => {
    const colors = {
      'Email': 'bg-blue-100 text-blue-600',
      'Call': 'bg-green-100 text-green-600',
      'Meeting': 'bg-purple-100 text-purple-600',
      'WhatsApp': 'bg-emerald-100 text-emerald-600',
      'Note': 'bg-gray-100 text-gray-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedActivities).map(([date, dayActivities]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{date}</h3>
          <div className="space-y-3">
            {dayActivities.map((activity, idx) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconColor(activity.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{activity.description}</p>
                          {activity.related_to_name && (
                            <p className="text-xs text-gray-500 mt-1">
                              Related to: <span className="text-blue-600 hover:underline cursor-pointer">
                                {activity.related_to_type}: {activity.related_to_name}
                              </span>
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.date).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="w-6 h-6 bg-gray-200" />
                        <span className="text-xs text-gray-600">{activity.created_by}</span>
                        <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}