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

import CSVUpload from './components/CSVUpload';
import StatsCards from './components/StatsCards';
import TeamList from './components/TeamList';
import BulkEmailButton from './components/BulkEmailButton';
import MonacoEmailEditor from './components/MonacoEmailEditor';
import CallVerifyPage from './components/CallVerifyPage';

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
      
      {/* Caller Name Modal */}
      {showCallerPrompt && <CallerNameModal />}

      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Loop Hackathon
                </h1>
                <p className="text-xs text-zinc-500">Team Management Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 text-zinc-600 dark:text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <div className="relative">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  onClick={() => handleExport()}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="mb-8">
          <StatsCards stats={stats} isLoading={isLoading} />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'contacts') {
                  handleCallTabClick();
                } else if (tab.id === 'skipped') {
                  handleSkippedTabClick();
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : tab.id === 'skipped' && skippedRows.length > 0
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}

          {/* Caller Name Indicator */}
          {callerName && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-400">{callerName}</span>
              <button
                onClick={() => setShowCallerPrompt(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Change
              </button>
            </div>
          )}

          {/* Search - only show for list views */}
          {(activeTab === 'verified' || activeTab === 'unverified') && (
            <div className="flex-1 flex justify-end">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search teams..."
                  className="pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Upload Unstop Registration CSV
              </h2>
              <p className="text-zinc-500 mb-6">
                Upload the registration export from Unstop to sync team data
              </p>
              <CSVUpload onUploadSuccess={handleUploadSuccess} />
            </div>
          )}

          {/* Verified Teams Tab */}
          {activeTab === 'verified' && (
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
                  onClick={() => handleExport('VERIFIED')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export Verified
                </button>
              </div>
              <TeamList
                teams={filteredVerifiedTeams}
                title="Verified Teams"
                emptyMessage="No verified teams yet"
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Unverified Teams Tab */}
          {activeTab === 'unverified' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    Pending Verification
                  </h2>
                  <p className="text-zinc-500">
                    Teams with incomplete registration - need follow-up
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <BulkEmailButton
                    unverifiedCount={unverifiedTeams.length}
                    onEmailsSent={fetchData}
                  />
                  <button
                    onClick={() => handleExport('PENDING')}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Export Pending
                  </button>
                </div>
              </div>
              
              {/* Show as simple list without expansion */}
              <div className="space-y-3">
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                  ))
                ) : filteredUnverifiedTeams.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                    <p>All teams are verified! 🎉</p>
                  </div>
                ) : (
                  filteredUnverifiedTeams.map((team) => (
                    <div
                      key={team.teamId}
                      className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl"
                    >
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-white">{team.teamName}</h3>
                        <p className="text-sm text-zinc-500">{team.leaderName} • {team.leaderEmail}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={`tel:${team.leaderPhone}`}
                          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Phone className="w-4 h-4" />
                          {team.leaderPhone}
                        </a>
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full font-medium">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Contacts Tab - Call & Verify */}
          {activeTab === 'contacts' && (
            <CallVerifyPage 
              callerName={callerName}
              onRefreshNeeded={fetchData}
            />
          )}

          {/* Skipped Rows Tab - People without Team Name */}
          {activeTab === 'skipped' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    People Without Team Name
                  </h2>
                  <p className="text-zinc-500">
                    These people registered but don&apos;t have a Team Name. They may need to be contacted separately.
                  </p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-medium">
                  {skippedRows.length} people
                </span>
              </div>

              {skippedRows.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p>No skipped rows! All registrations have Team Names.</p>
                  <p className="text-sm mt-2">Upload a new CSV to see skipped rows here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {skippedRows.map((row, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-zinc-900 dark:text-white">{row.candidateName}</h3>
                        <p className="text-sm text-zinc-500">{row.candidateEmail}</p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          Row #{row.rowNumber} • {row.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={`tel:${row.candidatePhone}`}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          {row.candidatePhone}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email Tab */}
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
}
