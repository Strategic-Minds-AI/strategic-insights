import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Target, 
  Calendar,
  Activity,
  BarChart3,
  ChevronDown,
  Search,
  Mail,
  Bell,
  Settings
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const [expandedMenu, setExpandedMenu] = useState('Dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to fetch current user", error);
      }
    };
    fetchUser();
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: 'Dashboard' },
    { name: 'Accounts', icon: Users, path: 'Accounts' },
    { name: 'Contacts', icon: UserCircle, path: 'Contacts' },
    { name: 'Leads', icon: Target, path: 'Leads' },
    { name: 'Calendar', icon: Calendar, path: 'Calendar' },
    { name: 'Activities', icon: Activity, path: 'Activities' },
    { name: 'Reports', icon: BarChart3, path: 'Reports' }
  ];

  const bottomMenuItems = [
    { name: 'Settings', icon: Settings, path: 'Settings' }
  ];

  const isActive = (itemName) => {
    return currentPageName === itemName;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 bg-[#2563eb] text-white flex-col">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <div className="w-6 h-6 bg-[#2563eb] rounded-full"></div>
          </div>
          <span className="text-2xl font-bold">CRM</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 flex flex-col">
          <div className="space-y-1">
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.subItems ? (
                <div>
                  <button
                    onClick={() => setExpandedMenu(expandedMenu === item.name ? null : item.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      expandedMenu === item.name ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenu === item.name ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedMenu === item.name && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.name}
                          to={createPageUrl(subItem.name)}
                          className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
                            isActive(subItem.name) ? 'bg-white/20 font-medium' : 'hover:bg-white/5'
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={createPageUrl(item.path)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path) ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )}
              </div>
              ))}
              </div>
              <div className="mt-auto space-y-1 pt-4 border-t border-white/10">
              {bottomMenuItems.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path) ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
              ))}
              </div>
              </nav>
              </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="hidden sm:flex flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search Anything..."
                  className="pl-10 bg-gray-50 border-gray-200"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="icon" className="text-gray-600 hidden sm:flex">
                <Mail className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-600 hidden sm:flex">
                <Bell className="w-5 h-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 sm:gap-2">
                    <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                      Hi, {currentUser?.display_name || currentUser?.full_name || currentUser?.email || 'Guest'}
                    </span>
                    <Avatar className="w-8 h-8">
                      {currentUser?.profile_picture ? (
                        <img src={currentUser.profile_picture} alt="Profile" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">
                          {currentUser?.display_name ? currentUser.display_name.charAt(0).toUpperCase() : currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : currentUser?.email?.charAt(0).toUpperCase() || 'G'}
                        </div>
                      )}
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Profile')}>Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => base44.auth.logout()}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}