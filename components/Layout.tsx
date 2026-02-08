
import React, { useState, useEffect } from 'react';
import { Users, FileText, Settings, Briefcase, ReceiptText, CalendarDays, Home, LogOut, Receipt, Landmark, Link2, Calculator, CreditCard, FolderOpen, ChevronDown, ChevronRight, Package, MoreHorizontal, X, QrCode, Shield, MessageSquare, TrendingUp, Activity, Download, Clock, Moon, Sun, User } from 'lucide-react';
import { hapticTap } from '../src/hooks/useHaptic';
import { useAuth } from '../src/contexts/AuthContext';
import { useData } from '../src/contexts/DataContext';
import { isAdminUser } from '../src/lib/constants';
import { useDarkMode } from '../src/hooks/useDarkMode';
import { usePermissions } from '../src/hooks/usePermissions';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onSignOut?: () => void;
  onCreateJob?: () => void;
  onCreateQuote?: () => void;
  onCreateInvoice?: () => void;
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  tier?: 'starter' | 'professional' | 'business' | 'enterprise';
  badge?: string;
  items: {
    id: string;
    label: string;
    icon: any;
    tier?: 'starter' | 'professional' | 'business' | 'enterprise';
  }[];
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onSignOut, onCreateJob, onCreateQuote, onCreateInvoice }) => {
  const { user } = useAuth();
  const { settings } = useData();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const permissions = usePermissions();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['work']));
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [moreMenuGroup, setMoreMenuGroup] = useState<string | null>(null);

  const isAdmin = isAdminUser(user?.id);

  // Reset expanded groups when user changes (login/logout/app return)
  useEffect(() => {
    setExpandedGroups(new Set(['work']));
  }, [user?.id]);

  // Get display tier name
  const getTierDisplay = () => {
    if (settings.subscriptionStatus === 'trialing') {
      return 'Trial';
    }
    const tierNames: Record<string, string> = {
      free: 'Free',
      starter: 'Starter',
      professional: 'Professional',
      business: 'Business',
      team: 'Team',
      enterprise: 'Enterprise',
    };
    return tierNames[settings.subscriptionTier || 'free'] || 'Free';
  };

  // Field workers get a minimal navigation
  const navGroups: NavGroup[] = permissions.isFieldWorker ? [
    {
      id: 'work',
      label: 'Work',
      icon: Briefcase,
      tier: 'starter',
      items: [
        { id: 'home', label: 'Home', icon: Home, tier: 'starter' },
        { id: 'jobpacks', label: 'My Jobs', icon: Briefcase, tier: 'starter' },
        { id: 'schedule', label: 'Schedule', icon: CalendarDays, tier: 'starter' },
      ]
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      items: [
        { id: 'timesheet_approval', label: 'My Timesheets', icon: Clock },
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      tier: 'starter',
      items: [
        { id: 'settings', label: 'Profile', icon: User, tier: 'starter' },
      ]
    },
  ] : [
    {
      id: 'work',
      label: 'Work',
      icon: Briefcase,
      tier: 'starter',
      items: [
        { id: 'home', label: 'Home', icon: Home, tier: 'starter' },
        { id: 'jobpacks', label: 'Jobs', icon: Briefcase, tier: 'starter' },
        { id: 'schedule', label: 'Schedule', icon: CalendarDays, tier: 'starter' },
        { id: 'quotes', label: 'Quotes', icon: FileText, tier: 'starter' },
        { id: 'invoices', label: 'Invoices', icon: ReceiptText, tier: 'starter' },
        { id: 'aged_receivables', label: 'Receivables', icon: Clock, tier: 'professional' },
        { id: 'customers', label: 'Customers', icon: Users, tier: 'starter' },
      ]
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: Receipt,
      tier: 'professional',
      badge: 'PRO',
      items: [
        { id: 'expenses', label: 'Log Expense', icon: Receipt, tier: 'professional' },
        { id: 'materials', label: 'Materials', icon: Package, tier: 'professional' },
        { id: 'files', label: 'Files', icon: FolderOpen, tier: 'professional' },
      ]
    },
    ...(permissions.canAccessAccounting ? [{
      id: 'accounting',
      label: 'Accounting',
      icon: Calculator,
      tier: 'business' as const,
      badge: 'BIZ',
      items: [
        { id: 'bank', label: 'Bank Import', icon: Landmark, tier: 'business' as const },
        { id: 'reconcile', label: 'Reconcile', icon: Link2, tier: 'business' as const },
        { id: 'vat', label: 'VAT Summary', icon: Calculator, tier: 'business' as const },
        { id: 'profitloss', label: 'Profit & Loss', icon: TrendingUp, tier: 'business' as const },
        { id: 'payables', label: 'Payables', icon: CreditCard, tier: 'business' as const },
        { id: 'accountant_export', label: 'Export Data', icon: Download, tier: 'business' as const },
      ]
    }] : []),
    // Team section — visible for owners/admins with paid subscription or seats
    ...((settings.subscriptionStatus === 'active' || settings.subscriptionStatus === 'trialing' || (settings.adminSeatCount ?? settings.teamSeatCount ?? 0) > 0) ? [{
      id: 'team',
      label: 'Team',
      icon: Users,
      badge: 'TEAM',
      items: [
        { id: 'team_dashboard', label: 'Dashboard', icon: Users },
        { id: 'timesheet_approval', label: 'Timesheets', icon: Clock },
        ...(permissions.isOwner ? [{ id: 'team_settings', label: 'Team Setup', icon: Settings }] : []),
      ]
    }] : []),
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      tier: 'starter',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings, tier: 'starter' },
      ]
    },
    // Admin section - only visible to admin users (system admins, not team admins)
    ...(isAdmin ? [{
      id: 'admin',
      label: 'Admin',
      icon: Shield,
      items: [
        { id: 'wholesalers', label: 'Referrals', icon: QrCode },
        { id: 'support', label: 'Support Requests', icon: MessageSquare },
        { id: 'trial_analytics', label: 'Trial Analytics', icon: Activity },
      ]
    }] : []),
  ];

  // Auto-expand the group containing the active tab
  useEffect(() => {
    if (!activeTab) return;
    const activeGroup = navGroups.find(g => g.items.some(item => item.id === activeTab));
    if (activeGroup && !expandedGroups.has(activeGroup.id)) {
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.add(activeGroup.id);
        return next;
      });
    }
  }, [activeTab]);

  // Flat list for mobile nav
  const navItems = navGroups.flatMap(g => g.items);

  // Primary navigation items for mobile bottom bar
  const mobileNavItems = permissions.isFieldWorker ? [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'jobpacks', label: 'My Jobs', icon: Briefcase },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'timesheet_approval', label: 'Timesheets', icon: Clock },
    { id: 'settings', label: 'Profile', icon: User },
  ] : [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'jobpacks', label: 'Jobs', icon: Briefcase },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'quotes', label: 'Quotes', icon: FileText },
    { id: 'invoices', label: 'Invoices', icon: ReceiptText },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];
  // Keep flat list for More menu filtering
  const primaryNavItems = mobileNavItems;

  const handleMoreClick = () => {
    hapticTap();
    setShowMoreMenu(true);
    setMoreMenuGroup(null);
  };

  const handleMoreMenuItemClick = (itemId: string) => {
    hapticTap();
    setActiveTab(itemId);
    setShowMoreMenu(false);
    setMoreMenuGroup(null);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const isActiveInGroup = (group: NavGroup) => group.items.some(item => item.id === activeTab);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col h-screen sticky top-0">
        <button
          onClick={onSignOut}
          className="w-full p-6 flex items-center gap-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors text-left"
          title="Go to landing page"
        >
          <img src="/tradesync-logo.png" alt="TradeSync" className="h-10 rounded-lg" />
          <h1 className="text-xl font-black tracking-tight text-white">Trade<span className="text-teal-500">Sync</span></h1>
        </button>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors border-l-2 ${isActiveInGroup(group)
                  ? 'bg-slate-800 text-white border-teal-500'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 border-transparent hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <group.icon size={18} className="opacity-80" />
                  <span className="font-black text-[11px] uppercase tracking-widest">{group.label}</span>
                  {group.badge && (
                    <span className={`text-[9px] text-white px-1.5 py-0.5 rounded-full font-bold ${group.tier === 'professional' ? 'bg-teal-600' :
                      group.tier === 'business' ? 'bg-purple-500' : 'bg-slate-500'
                      }`}>{group.badge}</span>
                  )}
                </div>
                {expandedGroups.has(group.id) ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-600" />}
              </button>
              {expandedGroups.has(group.id) && (
                <div className="mt-1.5 ml-4 space-y-0.5 border-l border-slate-700/50 pl-3">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors ${activeTab === item.id
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                        }`}
                    >
                      <item.icon size={16} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
                      <span className="font-medium text-[13px]">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors mb-1"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span className="font-bold text-sm">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          {onSignOut && (<button onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><LogOut size={20} /><span className="font-bold text-sm">Sign Out</span></button>)}
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-black text-slate-900 text-xs">
              {(settings.companyName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="text-sm min-w-0">
              <p className="font-bold text-white truncate">{settings.companyName || 'Your Business'}</p>
              <p className="text-slate-500 text-[10px] font-black uppercase">{getTierDisplay()} Tier</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Nav — 5 tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] safe-area-bottom px-4 pb-4">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-slate-100 dark:border-slate-800 px-2 py-1">
          <ul className="flex justify-between items-center h-16">
            {mobileNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="flex-1 flex justify-center">
                  <button
                    onClick={() => {
                      if (item.id === 'more') { handleMoreClick(); }
                      else { hapticTap(); setActiveTab(item.id); }
                    }}
                    className={`flex flex-col items-center gap-1 w-full active:scale-95 transition-all ${isActive ? 'text-teal-500' : 'text-slate-400 dark:text-slate-500'}`}
                  >
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                    <span className={`text-[10px] font-bold ${isActive ? '' : 'opacity-70'}`}>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* More Menu Overlay - Categorized */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900 dark:text-white">More Options</h3>
              <button onClick={() => setShowMoreMenu(false)} className="p-1.5 rounded-lg hover:bg-slate-100 active:scale-95">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-50px)] p-2">
              {navGroups.map((group) => (
                <div key={group.id} className="mb-2">
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg mb-1">
                    <group.icon size={14} className="text-slate-600" />
                    <span className="font-black text-[10px] uppercase tracking-wider text-slate-700">{group.label}</span>
                    {group.badge && (
                      <span className={`text-[9px] text-white px-1.5 py-0.5 rounded-full font-bold ${group.tier === 'professional' ? 'bg-teal-600' :
                        group.tier === 'business' ? 'bg-purple-500' : 'bg-slate-500'
                        }`}>{group.badge}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-1">
                    {group.items.map((item) => {
                      // Skip items already in primary nav
                      if (primaryNavItems.some(p => p.id === item.id)) return null;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleMoreMenuItemClick(item.id)}
                          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl min-h-[72px] active:scale-95 transition-all ${activeTab === item.id
                            ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                            : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                            }`}
                        >
                          <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                          <span className={`text-[8px] font-black uppercase tracking-tight text-center leading-tight line-clamp-2 max-w-full`}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Sign Out Button */}
              {onSignOut && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 active:bg-red-100 active:scale-95 transition-all"
                  >
                    <LogOut size={18} />
                    <span className="font-black text-sm">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-0 overflow-y-auto dark:text-slate-100">
        <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-[50] shadow-md">
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 active:opacity-70 transition-opacity"
            title="Go to landing page"
          >
            <img src="/tradesync-logo.png" alt="TradeSync" className="h-8 rounded-lg" />
            <span className="font-black text-lg tracking-tight">Trade<span className="text-teal-500">Sync</span></span>
          </button>
        </header>
        <div className="px-4 py-4 md:p-8 max-w-7xl mx-auto dark:bg-slate-950">
          {children}
        </div>
      </main>
    </div>
  );
};
