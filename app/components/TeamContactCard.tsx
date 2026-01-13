'use client';

import { useState } from 'react';
import { Phone, Check, X, MessageSquare } from 'lucide-react';
import { UnverifiedTeam, verifyTeam } from '../lib/api';
import toast from 'react-hot-toast';

interface TeamContactCardProps {
  team: UnverifiedTeam;
  onStatusChange?: (teamId: string, action: 'done' | 'rejected') => void;
}

export default function TeamContactCard({ team, onStatusChange }: TeamContactCardProps) {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'done' | 'rejected'>('pending');

  const handleCall = () => {
    // Open phone dialer
    window.location.href = `tel:${team.leaderPhone}`;
  };

  const handleDone = async () => {
    setIsLoading(true);
    try {
      await verifyTeam(team.teamId);
      setStatus('done');
      toast.success(`Team "${team.teamName}" marked as verified`);
      onStatusChange?.(team.teamId, 'done');
    } catch (error) {
      console.error('Error verifying team:', error);
      toast.error('Failed to verify team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    setStatus('rejected');
    toast.success(`Team "${team.teamName}" marked as rejected`);
    onStatusChange?.(team.teamId, 'rejected');
  };

  if (status !== 'pending') {
    return (
      <div className={`rounded-xl border p-4 ${
        status === 'done' 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">{team.teamName}</p>
            <p className="text-sm text-zinc-500">{team.leaderName}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'done'
              ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300'
          }`}>
            {status === 'done' ? 'Verified' : 'Rejected'}
          </div>
        </div>
        {notes && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 italic">Note: {notes}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Team Name Header */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-900 dark:text-white">{team.teamName}</h3>
      </div>

      {/* Contact Info Row */}
      <div className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Leader Info */}
          <div className="flex-1 min-w-[200px]">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">{team.leaderName}</p>
            <p className="text-sm text-zinc-500">{team.leaderEmail}</p>
          </div>

          {/* Phone Number */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-700 dark:text-zinc-300">{team.leaderPhone}</span>
          </div>

          {/* Call Icon Button */}
          <button
            onClick={handleCall}
            className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            title="Call leader"
          >
            <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </button>

          {/* Done Button */}
          <button
            onClick={handleDone}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Done
          </button>

          {/* Reject Button */}
          <button
            onClick={handleReject}
            disabled={isLoading}
            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            title="Mark as rejected"
          >
            <X className="w-5 h-5 text-red-600 dark:text-red-400" />
          </button>

          {/* Notes Input */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <MessageSquare className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
