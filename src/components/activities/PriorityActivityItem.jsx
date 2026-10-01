import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';

export default function PriorityActivityItem({ activity, onMarkComplete, onReschedule }) {
  const isOverdue = new Date(activity.date) < new Date();
  const hoursDiff = Math.abs(Math.floor((new Date(activity.date) - new Date()) / (1000 * 60 * 60)));
  
  const getOverdueText = () => {
    const days = Math.floor(hoursDiff / 24);
    if (days > 0) return `${days}d overdue`;
    return `${hoursDiff}h overdue`;
  };

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border-b">
      <div className="flex items-center gap-3 flex-1">
        <Avatar className="w-10 h-10 bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">
          {activity.related_to_name?.split(' ').map(n => n[0]).join('') || 'A'}
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{activity.related_to_name || 'Activity'}</p>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                {getOverdueText()}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-600">{activity.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
          {new Date(activity.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs"
          onClick={() => onMarkComplete(activity.id)}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Check as completed
        </Button>
      </div>
    </div>
  );
}