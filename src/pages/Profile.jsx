import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    display_name: '',
    profile_picture: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setFormData({
          display_name: userData.display_name || userData.full_name || '',
          profile_picture: userData.profile_picture || '',
        });
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, profile_picture: file_url });
      toast.success('Photo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await base44.auth.updateMe({
        display_name: formData.display_name.trim(),
        profile_picture: formData.profile_picture
      });
      
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      toast.success('Profile updated successfully');
      
      // Reload the page to refresh the layout
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile & Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Profile Picture */}
                  <div className="space-y-2">
                    <Label>Profile Picture</Label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                        {formData.profile_picture ? (
                          <img src={formData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                            <User className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
                          </div>
                        )}
                      </Avatar>
                      <div className="flex-1 w-full">
                        <input
                          type="file"
                          id="photo-upload"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('photo-upload').click()}
                          disabled={uploading}
                          className="w-full sm:w-auto"
                        >
                          {uploading ? (
                            'Uploading...'
                          ) : (
                            <>
                              <Camera className="w-4 h-4 mr-2" />
                              Upload Photo
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max 5MB.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_name">Full Name</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={user.role}
                      disabled
                      className="bg-gray-50 capitalize"
                    />
                  </div>

                  <div className="pt-4">
                    <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-20 h-20 mb-4">
                    {user.profile_picture ? (
                      <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                        <User className="w-10 h-10 text-blue-600" />
                      </div>
                    )}
                  </Avatar>
                  <h3 className="font-semibold text-lg">{user.display_name || user.full_name || 'User'}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <Badge className="mt-2 capitalize">{user.role}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Account Type</p>
                    <p className="font-semibold capitalize truncate">{user.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Email Verified</p>
                    <p className="font-semibold">Yes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Security</p>
                    <p className="font-semibold">Protected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}