import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Phone, Mail, MessageCircle, Building2, Calendar, Star, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import moment from 'moment';

export default function ContactDetailsPanel({ contact, onClose }) {
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', contact?.id],
    queryFn: () => base44.entities.Activity.filter({ related_to_id: contact.id }),
    enabled: !!contact,
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', contact?.id],
    queryFn: () => base44.entities.Opportunity.filter({ account_name: contact.company }),
    enabled: !!contact?.company,
  });

  if (!contact) return null;

  const priorityColors = {
    'Key': 'bg-amber-100 text-amber-800 border-amber-300',
    'Standard': 'bg-blue-100 text-blue-800 border-blue-300',
    'At Risk': 'bg-red-100 text-red-800 border-red-300'
  };

  const engagementColors = {
    'High': 'bg-green-600',
    'Medium': 'bg-yellow-600',
    'Low': 'bg-red-600'
  };

  return (
    <div className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto border-l">
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
        <h2 className="text-xl font-bold">Contact Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Section */}
        <div className="text-center pb-6 border-b">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">
              {contact.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-1">{contact.name}</h3>
          <p className="text-gray-600 mb-3">{contact.position || 'No position'}</p>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge className={priorityColors[contact.priority] || priorityColors['Standard']}>
              {contact.priority || 'Standard'}
            </Badge>
            {contact.role && (
              <Badge variant="outline">{contact.role}</Badge>
            )}
          </div>

          {contact.engagement_level && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-600">Engagement:</span>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-6 rounded ${
                      i < (contact.engagement_level === 'High' ? 3 : contact.engagement_level === 'Medium' ? 2 : 1)
                        ? engagementColors[contact.engagement_level]
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="w-full">
            <Phone className="w-4 h-4 mr-1" />
            Call
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <Mail className="w-4 h-4 mr-1" />
            Email
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
        </div>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-gray-400 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{contact.email}</p>
              </div>
            </div>
            {contact.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gray-400 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{contact.phone}</p>
                </div>
              </div>
            )}
            {contact.company && (
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-gray-400 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Company</p>
                  <p className="font-medium">{contact.company}</p>
                  {contact.company_size && (
                    <p className="text-sm text-gray-500">{contact.company_size}</p>
                  )}
                </div>
              </div>
            )}
            {contact.last_activity_date && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Last Activity</p>
                  <p className="font-medium">{moment(contact.last_activity_date).format('MMM D, YYYY')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="activities" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="mt-4 space-y-3">
            {activities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No activities yet</p>
            ) : (
              activities.slice(0, 5).map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Activity className="w-4 h-4 text-blue-600 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium">{activity.type}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {moment(activity.date).format('MMM D, YYYY h:mm A')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="deals" className="mt-4 space-y-3">
            {opportunities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No deals found</p>
            ) : (
              opportunities.map((opp) => (
                <Card key={opp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{opp.name}</p>
                        <p className="text-sm text-gray-600">${opp.amount?.toLocaleString()}</p>
                      </div>
                      <Badge>{opp.stage}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <p className="text-center text-gray-500 py-8">No notes yet</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}