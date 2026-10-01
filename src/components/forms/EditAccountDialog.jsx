import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EditAccountDialog({ open, onOpenChange, account, onSubmit, isLoading, readOnly = false }) {
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    annual_revenue: '',
    employees: '',
    status: 'active'
  });

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        industry: account.industry || '',
        website: account.website || '',
        phone: account.phone || '',
        email: account.email || '',
        annual_revenue: account.annual_revenue || '',
        employees: account.employees || '',
        status: account.status || 'active'
      });
    }
  }, [account]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (readOnly) return;
    
    const dataToSubmit = {
      ...formData,
      annual_revenue: formData.annual_revenue ? Number(formData.annual_revenue) : undefined,
      employees: formData.employees ? Number(formData.employees) : undefined
    };
    onSubmit(dataToSubmit);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{readOnly ? 'Account Details' : 'Edit Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Account Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={readOnly}
              />
            </div>
            <div>
              <Label>Industry</Label>
              <Input
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </div>

          <div>
            <Label>Website</Label>
            <Input
              type="url"
              placeholder="https://example.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              disabled={readOnly}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Annual Revenue</Label>
              <Input
                type="number"
                placeholder="100000"
                value={formData.annual_revenue}
                onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label>Employees</Label>
              <Input
                type="number"
                placeholder="50"
                value={formData.employees}
                onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? 'Close' : 'Cancel'}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}