'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  Phone, PhoneOff, PhoneCall, Clock, CheckCircle, XCircle, 
  Users, RefreshCw, Loader2, MessageSquare, User, Lock
} from 'lucide-react';
import { 
  getTeamsWithCallStatus, 
  getCallStats,
  lockTeamForCalling, 
  updateCallStatus, 
  releaseTeamLock,
  CallLogEntry, 
  CallStats 
} from '../lib/api';
import toast from 'react-hot-toast';

interface CallVerifyPageProps {
  callerName: string;
  onRefreshNeeded?: () => void;
}

export default function CallVerifyPage({ callerName, onRefreshNeeded }: CallVerifyPageProps) {
  const [teams, setTeams] = useState<CallLogEntry[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'NOT_CALLED' | 'CALLED_WILL_VERIFY' | 'CALLED_NOT_PICKED' | 'CALLED_REJECTED'>('all');
  const [activeCallTeamId, setActiveCallTeamId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [teamsResponse, statsResponse] = await Promise.all([
        getTeamsWithCallStatus(),
        getCallStats()
      ]);
      setTeams(teamsResponse.teams);
      setStats(statsResponse.stats);
    } catch (error) {
      console.error('Error loading call data:', error);
      toast.error('Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds for multi-user coordination
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleStartCall = async (teamId: string) => {
    setActionLoading(teamId);
    try {
      const result = await lockTeamForCalling(teamId, callerName);
      if (result.success) {
        setActiveCallTeamId(teamId);
        toast.success('Team locked - you can now call');
        // Open phone dialer
        const team = teams.find(t => t.teamId === teamId);
        if (team) {
          window.location.href = `tel:${team.leaderPhone}`;
        }
        await loadData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error locking team:', error);
      toast.error('Failed to lock team for calling');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCallComplete = async (
    teamId: string, 
    status: 'CALLED_WILL_VERIFY' | 'CALLED_NOT_PICKED' | 'CALLED_REJECTED'
  ) => {
    setActionLoading(teamId);
    try {
      const teamNotes = notes[teamId] || '';
      await updateCallStatus(teamId, status, callerName, teamNotes);
      
      const statusMessages = {
        'CALLED_WILL_VERIFY': 'Marked as "Will Verify Soon"',
        'CALLED_NOT_PICKED': 'Marked as "Not Picked"',
        'CALLED_REJECTED': 'Marked as "Rejected"',
      };
      
      toast.success(statusMessages[status]);
      setActiveCallTeamId(null);
      await loadData();
      onRefreshNeeded?.();
    } catch (error) {
      console.error('Error updating call status:', error);
      toast.error('Failed to update call status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelCall = async (teamId: string) => {
    setActionLoading(teamId);
    try {
      await releaseTeamLock(teamId, callerName);
      setActiveCallTeamId(null);
      toast.success('Call cancelled');
      await loadData();
    } catch (error) {
      console.error('Error releasing lock:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, lockedBy: string | null) => {
    if (lockedBy) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <Lock className="w-3 h-3" />
          {lockedBy === callerName ? 'You are calling' : `${lockedBy} is calling`}
        </span>
      );
    }

    const statusConfig: Record<string, { bg: string; text: string; icon: ReactNode; label: string }> = {
      'NOT_CALLED': { 
        bg: 'bg-zinc-100 dark:bg-zinc-800', 
        text: 'text-zinc-700 dark:text-zinc-300',
        icon: <Phone className="w-3 h-3" />,
        label: 'Not Called'
      },
      'CALLED_WILL_VERIFY': { 
        bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
        text: 'text-yellow-700 dark:text-yellow-400',
        icon: <Clock className="w-3 h-3" />,
        label: 'Will Verify'
      },
      'CALLED_NOT_PICKED': { 
        bg: 'bg-orange-100 dark:bg-orange-900/30', 
        text: 'text-orange-700 dark:text-orange-400',
        icon: <PhoneOff className="w-3 h-3" />,
        label: 'Not Picked'
      },
      'CALLED_REJECTED': { 
        bg: 'bg-red-100 dark:bg-red-900/30', 
        text: 'text-red-700 dark:text-red-400',
        icon: <XCircle className="w-3 h-3" />,
        label: 'Rejected'
      },
      'BEING_CALLED': { 
        bg: 'bg-purple-100 dark:bg-purple-900/30', 
        text: 'text-purple-700 dark:text-purple-400',
        icon: <PhoneCall className="w-3 h-3" />,
        label: 'Being Called'
      },
    };

    const config = statusConfig[status] || statusConfig['NOT_CALLED'];
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const filteredTeams = teams.filter(team => {
    if (filter === 'all') return true;
    return team.callStatus === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with User Info */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-blue-500" />
            Call Teams
          </h2>
          <p className="text-zinc-500 mt-1 flex items-center gap-2">
            <User className="w-4 h-4" />
            Logged in as: <span className="font-medium text-blue-600">{callerName}</span>
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Call Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.total}</p>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Phone className="w-4 h-4" />
              <span className="text-sm">Not Called</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.notCalled}</p>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Will Verify</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.willVerify}</p>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
              <PhoneOff className="w-4 h-4" />
              <span className="text-sm">Not Picked</span>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{stats.notPicked}</p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.rejected}</p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
              <PhoneCall className="w-4 h-4" />
              <span className="text-sm">Being Called</span>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.beingCalled}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'All' },
          { value: 'NOT_CALLED', label: 'Not Called' },
          { value: 'CALLED_WILL_VERIFY', label: 'Will Verify' },
          { value: 'CALLED_NOT_PICKED', label: 'Not Picked' },
          { value: 'CALLED_REJECTED', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Team Cards */}
      <div className="space-y-4">
        {filteredTeams.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No teams found with this filter
          </div>
        ) : (
          filteredTeams.map((team) => {
            const isLocked = !!team.lockedBy;
            const isLockedByMe = team.lockedBy === callerName;
            const isLockedByOther = isLocked && !isLockedByMe;
            const isActiveCall = activeCallTeamId === team.teamId;

            return (
              <div
                key={team.teamId}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isLockedByOther 
                    ? 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-700 opacity-60' 
                    : isActiveCall
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 shadow-lg'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {/* Team Header */}
                <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">{team.teamName}</h3>
                  {getStatusBadge(team.callStatus, team.lockedBy)}
                </div>

                {/* Team Details */}
                <div className="p-4">
                  <div className="flex items-center gap-6 flex-wrap">
                    {/* Leader Info */}
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{team.leaderName}</p>
                      <p className="text-sm text-zinc-500">{team.leaderEmail}</p>
                    </div>

                    {/* Phone */}
                    <div className="font-mono text-lg text-zinc-700 dark:text-zinc-300">
                      {team.leaderPhone}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!isActiveCall && !isLockedByOther && (
                        <button
                          onClick={() => handleStartCall(team.teamId)}
                          disabled={actionLoading === team.teamId || isLockedByOther}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoading === team.teamId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Phone className="w-4 h-4" />
                          )}
                          Call
                        </button>
                      )}

                      {isActiveCall && (
                        <>
                          {/* Mark as Will Verify */}
                          <button
                            onClick={() => handleCallComplete(team.teamId, 'CALLED_WILL_VERIFY')}
                            disabled={actionLoading === team.teamId}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 font-medium transition-colors disabled:opacity-50"
                            title="Team said they will verify soon"
                          >
                            <Clock className="w-4 h-4" />
                            Will Verify
                          </button>

                          {/* Mark as Not Picked */}
                          <button
                            onClick={() => handleCallComplete(team.teamId, 'CALLED_NOT_PICKED')}
                            disabled={actionLoading === team.teamId}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400 font-medium transition-colors disabled:opacity-50"
                            title="Team didn't pick up the call"
                          >
                            <PhoneOff className="w-4 h-4" />
                            Not Picked
                          </button>

                          {/* Mark as Rejected */}
                          <button
                            onClick={() => handleCallComplete(team.teamId, 'CALLED_REJECTED')}
                            disabled={actionLoading === team.teamId}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-medium transition-colors disabled:opacity-50"
                            title="Team rejected / not interested"
                          >
                            <XCircle className="w-4 h-4" />
                            Rejected
                          </button>

                          {/* Cancel */}
                          <button
                            onClick={() => handleCancelCall(team.teamId)}
                            disabled={actionLoading === team.teamId}
                            className="px-3 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes Section - Only for active call */}
                  {isActiveCall && (
                    <div className="mt-4 flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-zinc-400 mt-2" />
                      <textarea
                        value={notes[team.teamId] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [team.teamId]: e.target.value }))}
                        placeholder="Add notes about the call (e.g., 'Team needs more time', 'Will verify by tomorrow')"
                        className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Show existing notes */}
                  {team.notes && !isActiveCall && (
                    <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">Note:</span> {team.notes}
                      </p>
                      {team.calledBy && (
                        <p className="text-xs text-zinc-500 mt-1">
                          Called by {team.calledBy} {team.lastCalledAt && `on ${new Date(team.lastCalledAt).toLocaleString()}`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Locked by other indicator */}
                  {isLockedByOther && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-500" />
                      <p className="text-sm text-purple-700 dark:text-purple-400">
                        <span className="font-medium">{team.lockedBy}</span> is currently calling this team
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
