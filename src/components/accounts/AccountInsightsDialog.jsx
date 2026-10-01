import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, Calendar, TrendingUp, Users, Target } from 'lucide-react';

export default function AccountInsightsDialog({ account, open, onOpenChange, activities = [], contacts = [], opportunities = [] }) {
  if (!account) return null;

  const accountActivities = activities.filter(a => a.related_to_name === account.name);
  const accountContacts = contacts.filter(c => c.company === account.name);
  const accountOpps = opportunities.filter(o => o.account_name === account.name);
  
  const totalRevenue = accountOpps
    .filter(o => o.stage === 'closed_won')
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{account.name}</DialogTitle>
              <p className="text-sm text-gray-500">{account.industry}</p>
            </div>
            <Badge className={
              account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }>
              {account.status}
            </Badge>
          </div>
        </DialogHeader>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">${(totalRevenue / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-gray-500">Total Revenue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{accountOpps.filter(o => o.stage !== 'closed_lost').length}</div>
              <div className="text-xs text-gray-500">Open Deals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{accountContacts.length}</div>
              <div className="text-xs text-gray-500">Contacts</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="activities">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activities">Recent Activities</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="deals">Open Deals</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activities" className="space-y-3 mt-4">
            {accountActivities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No recent activities</p>
            ) : (
              accountActivities.slice(0, 5).map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activity.type === 'Email' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'Call' ? 'bg-green-100 text-green-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {activity.type === 'Email' ? <Mail className="w-5 h-5" /> :
                     activity.type === 'Call' ? <Phone className="w-5 h-5" /> :
                     <Calendar className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="contacts" className="space-y-3 mt-4">
            {accountContacts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No contacts found</p>
            ) : (
              accountContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar className="w-10 h-10 bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.position || 'Contact'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{contact.email}</p>
                    <p className="text-xs text-gray-500">{contact.phone}</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="deals" className="space-y-3 mt-4">
            {accountOpps.filter(o => o.stage !== 'closed_lost' && o.stage !== 'closed_won').length === 0 ? (
              <p className="text-center text-gray-500 py-8">No open deals</p>
            ) : (
              accountOpps.filter(o => o.stage !== 'closed_lost' && o.stage !== 'closed_won').map((opp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{opp.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Close Date: {new Date(opp.close_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${(opp.amount || 0).toLocaleString()}</p>
                    <Badge className="mt-1 text-xs">
                      {opp.stage}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}