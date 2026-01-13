'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Users, Mail, Phone, User } from 'lucide-react';
import { Team } from '../lib/api';

interface TeamListProps {
  teams: Team[];
  title: string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export default function TeamList({ teams, title, emptyMessage = 'No teams found', isLoading }: TeamListProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => (
        <div
          key={team.id}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
        >
          {/* Header Row */}
          <div
            onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">{team.teamName}</h3>
                <p className="text-sm text-zinc-500">{team.collegeName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-zinc-500">Team Size</p>
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">{team.teamSize}</p>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                team.verificationStatus === 'VERIFIED'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : team.verificationStatus === 'REJECTED'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {team.verificationStatus}
              </span>

              {expandedTeam === team.id ? (
                <ChevronUp className="w-5 h-5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              )}
            </div>
          </div>

          {/* Expanded Content */}
          {expandedTeam === team.id && (
            <div className="border-t border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-800/50">
              <h4 className="text-sm font-medium text-zinc-500 mb-3">Team Members</h4>
              
              {team.leader && (
                <div className="flex items-center gap-4 p-3 bg-white dark:bg-zinc-900 rounded-lg mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                      {team.leader.fullName}
                      <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full">
                        Leader
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <a href={`mailto:${team.leader.email}`} className="flex items-center gap-1 hover:text-blue-600">
                      <Mail className="w-4 h-4" />
                      {team.leader.email}
                    </a>
                    <a href={`tel:${team.leader.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                      <Phone className="w-4 h-4" />
                      {team.leader.phone}
                    </a>
                  </div>
                </div>
              )}

              {team.members && team.members.filter(m => !m.isLeader).map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-3 bg-white dark:bg-zinc-900 rounded-lg mb-2">
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                    <User className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{member.fullName}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <a href={`mailto:${member.email}`} className="flex items-center gap-1 hover:text-blue-600">
                      <Mail className="w-4 h-4" />
                      {member.email}
                    </a>
                    <a href={`tel:${member.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                      <Phone className="w-4 h-4" />
                      {member.phone}
                    </a>
                  </div>
                </div>
              ))}

              <div className="mt-4 text-xs text-zinc-400">
                Unstop ID: {team.unstopTeamId}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
