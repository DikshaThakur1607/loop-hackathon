'use client';

import { Download } from 'lucide-react';
import TeamList from '../TeamList';
import { Team } from '../../lib/api';

interface VerifiedTabProps {
  teams: Team[];
  isLoading: boolean;
  onExport: () => void;
}

export default function VerifiedTab({
  teams,
  isLoading,
  onExport,
}: VerifiedTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Verified Teams
          </h2>
          <p className="text-zinc-500">
            Teams with complete registration on Unstop
          </p>
        </div>

        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2
          bg-green-100 dark:bg-green-900/30
          text-green-700 dark:text-green-400
          rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50
          transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Export Verified
        </button>
      </div>

      <TeamList
        teams={teams}
        title="Verified Teams"
        emptyMessage="No verified teams yet"
        isLoading={isLoading}
      />
    </div>
  );
}
