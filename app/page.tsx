'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
  Download, 
  Users, 
  Clock, 
  CheckCircle,
  Phone,
  Search,
  Mail,
  User,
  AlertTriangle
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import DashboardTabs from './components/DashboardTabs';

import CSVUpload from './components/CSVUpload';
import StatsCards from './components/StatsCards';
import TeamList from './components/TeamList';
import BulkEmailButton from './components/BulkEmailButton';
import MonacoEmailEditor from './components/MonacoEmailEditor';
import CallVerifyPage from './components/CallVerifyPage';
import DashboardHeader from './components/DashboardHeader';
import UploadTab from './components/tabs/UploadTab';
import VerifiedTab from './components/tabs/VerifiedTab';
import PendingTab from './components/tabs/PendingTab';

import {
  TeamStats,
  Team,
  UnverifiedTeam,
  SkippedRow,
  getTeamStats,
  getVerifiedTeams,
  getUnverifiedTeams,
  exportTeams,
} from './lib/api';

type TabType = 'upload' | 'verified' | 'unverified' | 'contacts' | 'skipped' | 'email';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [verifiedTeams, setVerifiedTeams] = useState<Team[]>([]);
  const [unverifiedTeams, setUnverifiedTeams] = useState<UnverifiedTeam[]>([]);
  const [skippedRows, setSkippedRows] = useState<SkippedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [callerName, setCallerName] = useState<string>('');
  const [showCallerPrompt, setShowCallerPrompt] = useState(false);

  // Load caller name and skipped rows from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('callerName');
    if (savedName) {
      setCallerName(savedName);
    }
    const savedSkipped = localStorage.getItem('skippedRows');
    if (savedSkipped) {
      try {
        setSkippedRows(JSON.parse(savedSkipped));
      } catch (e) {
        console.error('Failed to parse skipped rows:', e);
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, verifiedRes, unverifiedRes] = await Promise.all([
        getTeamStats(),
        getVerifiedTeams(),
        getUnverifiedTeams(),
      ]);

      setStats(statsRes.stats);
      setVerifiedTeams(verifiedRes.teams);
      setUnverifiedTeams(unverifiedRes.teams);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUploadSuccess = (data: { skippedRows?: SkippedRow[] }) => {
    // Save skipped rows from this upload
    if (data.skippedRows && data.skippedRows.length > 0) {
      setSkippedRows(data.skippedRows);
      localStorage.setItem('skippedRows', JSON.stringify(data.skippedRows));
    } else {
      setSkippedRows([]);
      localStorage.removeItem('skippedRows');
    }
    fetchData();
    setActiveTab('verified');
  };

  const handleExport = (status?: 'VERIFIED' | 'PENDING' | 'REJECTED') => {
    window.open(exportTeams(status), '_blank');
  };

  const handleCallerNameSubmit = (name: string) => {
    setCallerName(name);
    localStorage.setItem('callerName', name);
    setShowCallerPrompt(false);
  };

  const handleCallTabClick = () => {
    if (!callerName) {
      setShowCallerPrompt(true);
    } else {
      setActiveTab('contacts');
    }
  };

  const handleSkippedTabClick = () => {
    if (!callerName) {
      setShowCallerPrompt(true);
    } else {
      setActiveTab('skipped');
    }
  };

  const filteredVerifiedTeams = verifiedTeams.filter((team) =>
    team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.collegeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.leader?.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUnverifiedTeams = unverifiedTeams.filter((team) =>
    team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.leaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.leaderEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'upload' as TabType, label: 'Upload CSV', icon: Download },
    { id: 'verified' as TabType, label: `Verified (${stats?.verified ?? 0})`, icon: CheckCircle },
    { id: 'unverified' as TabType, label: `Pending (${stats?.pending ?? 0})`, icon: Clock },
    { id: 'contacts' as TabType, label: 'Call', icon: Phone },
    { id: 'skipped' as TabType, label: `No Team Name (${skippedRows.length})`, icon: AlertTriangle },
    { id: 'email' as TabType, label: 'Send Emails', icon: Mail },
  ];

  // Caller Name Prompt Modal
  const CallerNameModal = () => {
    const [tempName, setTempName] = useState('');
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Enter Your Name
            </h3>
          </div>
          <p className="text-zinc-500 mb-4">
            Your name will be used to track calls and prevent duplicate calling by multiple people.
          </p>
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={() => setShowCallerPrompt(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (tempName.trim()) {
                  handleCallerNameSubmit(tempName.trim());
                  setActiveTab('contacts');
                }
              }}
              disabled={!tempName.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
  <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
    <Toaster position="top-right" />

    {/* Header */}
    
    <DashboardHeader
      isLoading={isLoading}
      onRefresh={fetchData}
      onExport={() => handleExport()}
    />

    {/* Main */}
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats */}
      <StatsCards stats={stats} isLoading={isLoading} />

      {/* Tabs */}
      import { TeamStats } from '@/types';
      <DashboardTabs
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats: TeamStats | null;   // ✅ ADD THIS
        skippedRows={skippedRows}
        callerName={callerName}
        onCallClick={handleCallTabClick}
        onSkippedClick={handleSkippedTabClick}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Tab Content */}
      <div className="mt-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        {activeTab === 'upload' && (
          <CSVUpload onUploadSuccess={handleUploadSuccess} />
        )}

        {activeTab === 'verified' && (
          <TeamList
            teams={filteredVerifiedTeams}
            title="Verified Teams"
            emptyMessage="No verified teams"
            isLoading={isLoading}
          />
        )}

        {activeTab === 'unverified' && (
          <PendingTab
            teams={filteredUnverifiedTeams}
            onExport={() => handleExport('PENDING')}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'contacts' && (
          <CallVerifyPage
            callerName={callerName}
            onRefreshNeeded={fetchData}
          />
        )}

        {activeTab === 'email' && (
          <MonacoEmailEditor
            unverifiedCount={unverifiedTeams.length}
            verifiedCount={verifiedTeams.length}
            skippedRows={skippedRows}
            onEmailsSent={fetchData}
          />
        )}
      </div>
    </main>

    {/* Footer */}
    <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-zinc-500">
          Loop Hackathon Team Management • Backend running on port 3001
        </p>
      </div>
    </footer>
  </div>
);
