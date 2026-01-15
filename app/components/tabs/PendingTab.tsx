'use client';

import { Download, Phone, CheckCircle } from 'lucide-react';
import BulkEmailButton from '../BulkEmailButton';
import { UnverifiedTeam } from '../../lib/api';

interface PendingTabProps {
  teams: UnverifiedTeam[];
  isLoading: boolean;
  onExport: () => void;
  onEmailsSent: () => void;
}

export default function PendingTab({
  teams,
  isLoading,
  onExport,
  onEmailsSent,
}: PendingTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Pending Verification
          </h2>
          <p className="text-zinc-500">
            Teams with incomplete registration – need follow-up
          </p>
        </div>

        <div className="flex items-center gap-3">
          <BulkEmailButton
            unverifiedCount={teams.length}
            onEmailsSent={onEmailsSent}
          />

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2
            bg-yellow-100 dark:bg-yellow-900/30
            text-yellow-700 dark:text-yellow-400
            rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50
            transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export Pending
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse"
            />
          ))
        ) : teams.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
            <p>All teams are verified! 🎉</p>
          </div>
        ) : (
          teams.map((team) => (
            <div
              key={team.teamId}
              className="flex items-center justify-between p-4
              bg-zinc-50 dark:bg-zinc-800/50 rounded-xl"
            >
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-white">
                  {team.teamName}
                </h3>
                <p className="text-sm text-zinc-500">
                  {team.leaderName} • {team.leaderEmail}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={`tel:${team.leaderPhone}`}
                  className="flex items-center gap-1 text-sm
                  text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  {team.leaderPhone}
                </a>

                <span className="px-2 py-1 text-xs rounded-full font-medium
                bg-yellow-100 dark:bg-yellow-900/30
                text-yellow-700 dark:text-yellow-400">
                  Pending
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
