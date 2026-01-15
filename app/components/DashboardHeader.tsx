'use client';

import { RefreshCw, Download, Users } from 'lucide-react';

interface DashboardHeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export default function DashboardHeader({
  isLoading,
  onRefresh,
  onExport,
}: DashboardHeaderProps) {
  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Loop Hackathon
              </h1>
              <p className="text-xs text-zinc-500">
                Team Management Dashboard
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh data"
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-5 h-5 text-zinc-600 dark:text-zinc-400 ${
                  isLoading ? 'animate-spin' : ''
                }`}
              />
            </button>

            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
