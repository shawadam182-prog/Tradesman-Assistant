
import React, { useState, useEffect } from 'react';
import { Users, FileText, Settings, Briefcase, ReceiptText, CalendarDays, Home, LogOut, Receipt, Landmark, Link2, Calculator, CreditCard, FolderOpen, ChevronDown, ChevronRight, Package, MoreHorizontal, X, QrCode, Shield, MessageSquare, TrendingUp, Activity, Download, Clock, Moon, Sun, Plus, PoundSterling, Camera } from 'lucide-react';
import { hapticTap } from '../src/hooks/useHaptic';
import { useAuth } from '../src/contexts/AuthContext';
import { useData } from '../src/contexts/DataContext';
import { isAdminUser } from '../src/lib/constants';
import { useDarkMode } from '../src/hooks/useDarkMode';

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['work']));
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
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
      enterprise: 'Enterprise',
    };
    return tierNames[settings.subscriptionTier] || 'Free';
  };

  const navGroups: NavGroup[] = [
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
    {
      id: 'accounting',
      label: 'Accounting',
      icon: Calculator,
      tier: 'business',
      badge: 'BIZ',
      items: [
        { id: 'bank', label: 'Bank Import', icon: Landmark, tier: 'business' },
        { id: 'reconcile', label: 'Reconcile', icon: Link2, tier: 'business' },
        { id: 'vat', label: 'VAT Summary', icon: Calculator, tier: 'business' },
        { id: 'profitloss', label: 'Profit & Loss', icon: TrendingUp, tier: 'business' },
        { id: 'payables', label: 'Payables', icon: CreditCard, tier: 'business' },
        { id: 'accountant_export', label: 'Export Data', icon: Download, tier: 'business' },
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      tier: 'starter',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings, tier: 'starter' },
      ]
    },
    // Admin section - only visible to admin users
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

  // Primary navigation items for mobile bottom bar (4 tabs + center FAB)
  const primaryNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'jobpacks', label: 'Jobs', icon: Briefcase },
    // FAB goes in center (rendered separately)
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

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

      {/* Mobile Nav - Modern Bar with Center FAB */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 z-[100] safe-area-bottom pb-1">
        <div className="flex justify-around items-end h-[50px] px-1 relative">
          {/* Left tabs */}
          {primaryNavItems.slice(0, 2).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { hapticTap(); setActiveTab(item.id); }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 h-full active:scale-95 transition-all relative ${isActive ? 'text-teal-500' : 'text-slate-400 dark:text-slate-500'}`}
              >
                {isActive && <div className="absolute top-0 w-8 h-0.5 bg-teal-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.6)]" />}
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={`text-[8px] xs:text-[9px] font-medium tracking-tight leading-none ${isActive ? 'opacity-100 font-bold' : 'opacity-70'}`}>{item.label}</span>
              </button>
            );
          })}

          {/* Center FAB */}
          <div className="flex-1 flex items-center justify-center relative">
            <button
              onClick={() => { hapticTap(); setShowFabMenu(!showFabMenu); }}
              className={`absolute -top-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30 active:scale-90 transition-all ${showFabMenu ? 'bg-slate-800 rotate-45' : 'bg-teal-500 hover:bg-teal-600'}`}
            >
              <Plus size={28} strokeWidth={2.5} className="text-white" />
            </button>
          </div>

          {/* Right tabs */}
          {primaryNavItems.slice(2).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'more') { handleMoreClick(); }
                  else { hapticTap(); setActiveTab(item.id); }
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 h-full active:scale-95 transition-all relative ${isActive ? 'text-teal-500' : 'text-slate-400 dark:text-slate-500'}`}
              >
                {isActive && <div className="absolute top-0 w-8 h-0.5 bg-teal-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.6)]" />}
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={`text-[8px] xs:text-[9px] font-medium tracking-tight leading-none ${isActive ? 'opacity-100 font-bold' : 'opacity-70'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB Quick Create Menu */}
      {showFabMenu && (
        <div className="md:hidden fixed inset-0 z-[99] bg-black/30 backdrop-blur-sm" onClick={() => setShowFabMenu(false)}>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {[
              { label: 'New Job', icon: Briefcase, color: 'bg-teal-500', action: () => { setShowFabMenu(false); onCreateJob?.(); } },
              { label: 'Quote', icon: FileText, color: 'bg-blue-500', action: () => { setShowFabMenu(false); onCreateQuote?.(); } },
              { label: 'Invoice', icon: PoundSterling, color: 'bg-emerald-500', action: () => { setShowFabMenu(false); onCreateInvoice?.(); } },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { hapticTap(); item.action(); }}
                className={`flex items-center gap-3 ${item.color} text-white pl-4 pr-5 py-3 rounded-full shadow-lg active:scale-95 transition-all animate-in slide-in-from-bottom-4 duration-200`}
              >
                <item.icon size={20} />
                <span className="font-bold text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
