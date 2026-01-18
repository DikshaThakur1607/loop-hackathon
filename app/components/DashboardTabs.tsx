'use client';

import { Search, User } from 'lucide-react';
import type { TeamStats } from '@/lib/api';

type TabType =
  | 'upload'
  | 'verified'
  | 'unverified'
  | 'contacts'
  | 'skipped'
  | 'email';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ElementType;
}

interface DashboardTabsProps {
  tabs: Tab[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  stats: TeamStats | null;
  skippedRows: any[];
  callerName: string;
  onCallClick: () => void;
  onSkippedClick: () => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}

export default function DashboardTabs({
  tabs,
  activeTab,
  setActiveTab,
  skippedRows,
  callerName,
  onCallClick,
  onSkippedClick,
  searchQuery,
  setSearchQuery,
}: DashboardTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            if (tab.id === 'contacts') onCallClick();
            else if (tab.id === 'skipped') onSkippedClick();
            else setActiveTab(tab.id);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : tab.id === 'skipped' && skippedRows.length > 0
              ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700'
              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}

      {callerName && (
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-400">
            {callerName}
          </span>
        </div>
      )}

      {(activeTab === 'verified' || activeTab === 'unverified') && (
        <div className="flex-1 flex justify-end">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams..."
              className="pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm w-64"
            />
          </div>
        </div>
      )}
    </div>
  );
}
