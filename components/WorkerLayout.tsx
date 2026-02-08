import React from 'react';
import { Home, Briefcase, CalendarDays, Clock, User } from 'lucide-react';
import { hapticTap } from '../src/hooks/useHaptic';

interface WorkerLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  teamName: string;
  displayName: string;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'my_jobs', label: 'Jobs', icon: Briefcase },
  { id: 'my_schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'timesheets', label: 'Clock', icon: Clock },
];

export const WorkerLayout: React.FC<WorkerLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  teamName,
  displayName,
}) => {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/tradesync-logo.png" alt="TradeSync" className="h-8 rounded-lg" />
            <div>
              <p className="text-sm font-semibold text-slate-200">{teamName}</p>
              <p className="text-xs text-slate-500">{displayName}</p>
            </div>
          </div>
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-24">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 pb-safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id ||
              (item.id === 'my_jobs' && activeTab === 'job_detail') ||
              (item.id === 'timesheets' && activeTab === 'timesheet_history');

            return (
              <button
                key={item.id}
                onClick={() => {
                  hapticTap();
                  setActiveTab(item.id);
                }}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[64px] transition-colors ${
                  isActive
                    ? 'text-teal-400'
                    : 'text-slate-500 active:text-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
