import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Download, Upload, Trash2 } from 'lucide-react';
import ConfigListManager from '../components/settings/ConfigListManager';

export default function Settings() {
  const [resetConfirmation, setResetConfirmation] = useState('');
  const queryClient = useQueryClient();

  const { data: contactSources = [] } = useQuery({
    queryKey: ['contactSources'],
    queryFn: () => base44.entities.ContactSource.list('order'),
  });

  const { data: leadStages = [] } = useQuery({
    queryKey: ['leadStages'],
    queryFn: () => base44.entities.LeadStage.list('order'),
  });

  const { data: activityTypes = [] } = useQuery({
    queryKey: ['activityTypes'],
    queryFn: () => base44.entities.ActivityType.list('order'),
  });

  const { data: accountTiers = [] } = useQuery({
    queryKey: ['accountTiers'],
    queryFn: () => base44.entities.AccountTier.list('order'),
  });

  const { data: industries = [] } = useQuery({
    queryKey: ['industries'],
    queryFn: () => base44.entities.Industry.list('order'),
  });

  const { data: defaultSettings } = useQuery({
    queryKey: ['defaultSettings'],
    queryFn: async () => {
      const settings = await base44.entities.DefaultSettings.list();
      return settings[0] || null;
    },
  });

  const createSettingsMutation = useMutation({
    mutationFn: (data) => base44.entities.DefaultSettings.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defaultSettings'] }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DefaultSettings.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defaultSettings'] }),
  });

  const handleUpdateSettings = async (field, value) => {
    if (defaultSettings?.id) {
      await updateSettingsMutation.mutateAsync({
        id: defaultSettings.id,
        data: { [field]: value }
      });
    } else {
      await createSettingsMutation.mutateAsync({ [field]: value });
    }
  };

  const handleResetData = async () => {
    if (resetConfirmation !== 'RESET') {
      alert('Please type RESET to confirm');
      return;
    }

    if (!confirm('This will permanently delete all contacts, accounts, leads, opportunities, activities, and calendar events. Are you sure?')) {
      return;
    }

    try {
      await Promise.all([
        base44.entities.Contact.list().then(items => Promise.all(items.map(i => base44.entities.Contact.delete(i.id)))),
        base44.entities.Account.list().then(items => Promise.all(items.map(i => base44.entities.Account.delete(i.id)))),
        base44.entities.Lead.list().then(items => Promise.all(items.map(i => base44.entities.Lead.delete(i.id)))),
        base44.entities.Opportunity.list().then(items => Promise.all(items.map(i => base44.entities.Opportunity.delete(i.id)))),
        base44.entities.Activity.list().then(items => Promise.all(items.map(i => base44.entities.Activity.delete(i.id)))),
        base44.entities.CalendarEvent.list().then(items => Promise.all(items.map(i => base44.entities.CalendarEvent.delete(i.id)))),
      ]);

      queryClient.invalidateQueries();
      setResetConfirmation('');
      alert('Data reset complete');
    } catch (error) {
      alert('Failed to reset data');
    }
  };

  const exportData = async (entityName) => {
    const data = await base44.entities[entityName].list();
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityName.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = (type) => {
    const templates = {
      contacts: 'name,email,phone,company,position,source\nJohn Doe,john@example.com,+1234567890,Acme Inc,Sales Manager,email',
      accounts: 'name,industry,website,phone,email,annual_revenue,employees,status\nAcme Inc,Technology,acme.com,+1234567890,info@acme.com,1000000,50,active',
      leads: 'name,email,phone,company,status,source,value\nJane Smith,jane@example.com,+1234567890,Beta Corp,new,website,50000'
    };

    const csv = templates[type];
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure your CRM preferences and defaults</p>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">CRM Configuration</TabsTrigger>
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ConfigListManager
                title="Contact Sources"
                items={contactSources}
                onAdd={(data) => base44.entities.ContactSource.create(data).then(() => queryClient.invalidateQueries({ queryKey: ['contactSources'] }))}
                onUpdate={(id, data) => base44.entities.ContactSource.update(id, data).then(() => queryClient.invalidateQueries({ queryKey: ['contactSources'] }))}
                onDelete={(id) => base44.entities.ContactSource.delete(id).then(() => queryClient.invalidateQueries({ queryKey: ['contactSources'] }))}
              />
              <ConfigListManager
                title="Lead Stages"
                items={leadStages}
                onAdd={(data) => base44.entities.LeadStage.create(data).then(() => queryClient.invalidateQueries({ queryKey: ['leadStages'] }))}
                onUpdate={(id, data) => base44.entities.LeadStage.update(id, data).then(() => queryClient.invalidateQueries({ queryKey: ['leadStages'] }))}
                onDelete={(id) => base44.entities.LeadStage.delete(id).then(() => queryClient.invalidateQueries({ queryKey: ['leadStages'] }))}
              />
              <ConfigListManager
                title="Activity Types"
                items={activityTypes}
                onAdd={(data) => base44.entities.ActivityType.create(data).then(() => queryClient.invalidateQueries({ queryKey: ['activityTypes'] }))}
                onUpdate={(id, data) => base44.entities.ActivityType.update(id, data).then(() => queryClient.invalidateQueries({ queryKey: ['activityTypes'] }))}
                onDelete={(id) => base44.entities.ActivityType.delete(id).then(() => queryClient.invalidateQueries({ queryKey: ['activityTypes'] }))}
              />
              <ConfigListManager
                title="Account Tiers"
                items={accountTiers}
                onAdd={(data) => base44.entities.AccountTier.create(data).then(() => queryClient.invalidateQueries({ queryKey: ['accountTiers'] }))}
                onUpdate={(id, data) => base44.entities.AccountTier.update(id, data).then(() => queryClient.invalidateQueries({ queryKey: ['accountTiers'] }))}
                onDelete={(id) => base44.entities.AccountTier.delete(id).then(() => queryClient.invalidateQueries({ queryKey: ['accountTiers'] }))}
              />
              <ConfigListManager
                title="Industries"
                items={industries}
                onAdd={(data) => base44.entities.Industry.create(data).then(() => queryClient.invalidateQueries({ queryKey: ['industries'] }))}
                onUpdate={(id, data) => base44.entities.Industry.update(id, data).then(() => queryClient.invalidateQueries({ queryKey: ['industries'] }))}
                onDelete={(id) => base44.entities.Industry.delete(id).then(() => queryClient.invalidateQueries({ queryKey: ['industries'] }))}
              />
            </div>
          </TabsContent>

          <TabsContent value="defaults" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Default Values</CardTitle>
                <CardDescription>Set default values for new records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Input
                    value={defaultSettings?.default_currency || 'AED'}
                    onChange={(e) => handleUpdateSettings('default_currency', e.target.value)}
                    placeholder="AED"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Lead Stage</Label>
                  <Input
                    value={defaultSettings?.default_lead_stage || 'new'}
                    onChange={(e) => handleUpdateSettings('default_lead_stage', e.target.value)}
                    placeholder="new"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Account Tier</Label>
                  <Input
                    value={defaultSettings?.default_account_tier || 'B'}
                    onChange={(e) => handleUpdateSettings('default_account_tier', e.target.value)}
                    placeholder="B"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Follow-up Days After Activity</Label>
                  <Input
                    type="number"
                    value={defaultSettings?.default_follow_up_days || 3}
                    onChange={(e) => handleUpdateSettings('default_follow_up_days', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Calendar View</Label>
                  <Select
                    value={defaultSettings?.default_calendar_view || 'month'}
                    onValueChange={(value) => handleUpdateSettings('default_calendar_view', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>First Day of Week</Label>
                  <Select
                    value={defaultSettings?.first_day_of_week || 'monday'}
                    onValueChange={(value) => handleUpdateSettings('first_day_of_week', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Templates</CardTitle>
                <CardDescription>Download CSV templates for bulk imports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" onClick={() => downloadTemplate('contacts')} className="w-full sm:w-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Download Contacts Template
                </Button>
                <Button variant="outline" onClick={() => downloadTemplate('accounts')} className="w-full sm:w-auto ml-0 sm:ml-2">
                  <Download className="w-4 h-4 mr-2" />
                  Download Accounts Template
                </Button>
                <Button variant="outline" onClick={() => downloadTemplate('leads')} className="w-full sm:w-auto ml-0 sm:ml-2">
                  <Download className="w-4 h-4 mr-2" />
                  Download Leads Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Export your CRM data to CSV</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" onClick={() => exportData('Contact')} className="w-full sm:w-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Export Contacts
                </Button>
                <Button variant="outline" onClick={() => exportData('Account')} className="w-full sm:w-auto ml-0 sm:ml-2">
                  <Download className="w-4 h-4 mr-2" />
                  Export Accounts
                </Button>
                <Button variant="outline" onClick={() => exportData('Lead')} className="w-full sm:w-auto ml-0 sm:ml-2">
                  <Download className="w-4 h-4 mr-2" />
                  Export Leads
                </Button>
                <Button variant="outline" onClick={() => exportData('Activity')} className="w-full sm:w-auto ml-0 sm:ml-2">
                  <Download className="w-4 h-4 mr-2" />
                  Export Activities
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-600">
                  Permanently delete all CRM data. This cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Type "RESET" to confirm</Label>
                  <Input
                    value={resetConfirmation}
                    onChange={(e) => setResetConfirmation(e.target.value)}
                    placeholder="RESET"
                    className="max-w-xs"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleResetData}
                  disabled={resetConfirmation !== 'RESET'}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset All Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}