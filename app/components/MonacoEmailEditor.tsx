'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Mail, Send, Loader2, Eye, Code, Users, CheckCircle, 
  AlertTriangle, Sparkles, FileCode, Palette,
  UserCheck, Crown, BarChart3, RefreshCw, UserX
} from 'lucide-react';
import { 
  getEmailTemplates, sendCustomEmail, EmailTemplate, 
  getEmailStats, getEmailRecipientCounts,
  EmailTargetGroup, EmailStats, RecipientCounts,
  sendEmailToCustomRecipients, SkippedRow
} from '../lib/api';
import toast from 'react-hot-toast';

// Dynamic import Monaco to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), { 
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center bg-zinc-900 rounded-lg">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  ),
});

// Extended target group type to include no_team_name
type ExtendedTargetGroup = EmailTargetGroup | 'no_team_name';

interface MonacoEmailEditorProps {
  unverifiedCount: number;
  verifiedCount: number;
  skippedRows?: SkippedRow[];
  onEmailsSent?: () => void;
}

export default function MonacoEmailEditor({ 
  unverifiedCount, 
  verifiedCount,
  skippedRows = [],
  onEmailsSent 
}: MonacoEmailEditorProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [subject, setSubject] = useState('Loop Hackathon Update');
  const [htmlContent, setHtmlContent] = useState('');
  const [targetGroup, setTargetGroup] = useState<ExtendedTargetGroup>('unverified_all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  
  // New states for stats
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [recipientCounts, setRecipientCounts] = useState<RecipientCounts | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadRecipientCounts();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await getEmailTemplates();
      setTemplates(response.templates);
      
      const customTemplate = response.templates.find(t => t.id === 'custom');
      if (customTemplate) {
        setHtmlContent(customTemplate.content);
        setSubject(customTemplate.subject);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setHtmlContent(getDefaultTemplate());
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecipientCounts = async () => {
    try {
      const response = await getEmailRecipientCounts();
      setRecipientCounts(response.counts);
    } catch (error) {
      console.error('Failed to load recipient counts:', error);
    }
  };

  const loadEmailStats = async () => {
    setLoadingStats(true);
    try {
      const response = await getEmailStats();
      setEmailStats(response.stats);
    } catch (error) {
      console.error('Failed to load email stats:', error);
      toast.error('Failed to load email stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const getDefaultTemplate = () => `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Loop Hackathon</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>Write your message here...</p>
      <p>Best regards,<br>Loop Hackathon Team</p>
    </div>
    <div class="footer">
      <p>© 2026 Loop Hackathon. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setHtmlContent(template.content);
    }
  };

  const handleSendEmails = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      toast.error('Please provide both subject and content');
      return;
    }

    const count = getRecipientCount();
    if (count === 0) {
      toast.error('No recipients found for the selected group');
      return;
    }

    const filterLabel = getFilterLabel(targetGroup);
    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${count} recipients?\n\nFilter: ${filterLabel}`
    );

    if (!confirmed) return;

    setIsSending(true);
    setSendResult(null);

    try {
      let result;
      
      // Handle no_team_name separately - send to custom recipients
      if (targetGroup === 'no_team_name') {
        const recipients = skippedRows.map(row => ({
          email: row.candidateEmail,
          name: row.candidateName,
        }));
        result = await sendEmailToCustomRecipients(subject, htmlContent, recipients);
      } else {
        result = await sendCustomEmail(subject, htmlContent, targetGroup as EmailTargetGroup);
      }
      
      setSendResult({ sent: result.stats.sent, failed: result.stats.failed });
      
      if (result.stats.sent > 0) {
        toast.success(`Successfully sent ${result.stats.sent} emails!`);
      }
      if (result.stats.failed > 0) {
        toast.error(`Failed to send ${result.stats.failed} emails`);
      }
      
      // Refresh stats after sending
      loadEmailStats();
      onEmailsSent?.();
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Failed to send emails. Check console for details.');
    } finally {
      setIsSending(false);
    }
  };

  const getRecipientCount = (): number => {
    // Handle no_team_name first
    if (targetGroup === 'no_team_name') {
      return skippedRows.length;
    }
    
    if (!recipientCounts) {
      // Fallback to props if counts not loaded
      if (targetGroup === 'verified_all' || targetGroup === 'verified') return verifiedCount;
      if (targetGroup === 'unverified_all' || targetGroup === 'unverified') return unverifiedCount;
      if (targetGroup === 'verified_leader') return Math.ceil(verifiedCount / 3); // Estimate
      if (targetGroup === 'unverified_leader') return Math.ceil(unverifiedCount / 3); // Estimate
      return verifiedCount + unverifiedCount;
    }
    
    switch (targetGroup) {
      case 'unverified_all':
      case 'unverified':
        return recipientCounts.unverified_all;
      case 'unverified_leader':
        return recipientCounts.unverified_leader;
      case 'verified_all':
      case 'verified':
        return recipientCounts.verified_all;
      case 'verified_leader':
        return recipientCounts.verified_leader;
      case 'all':
        return recipientCounts.all;
      default:
        return 0;
    }
  };

  const getFilterLabel = (filter: ExtendedTargetGroup): string => {
    switch (filter) {
      case 'unverified_all':
        return 'Unverified Teams (Leader + Members)';
      case 'unverified_leader':
        return 'Unverified Team Leaders Only';
      case 'verified_all':
        return 'Verified Teams (Leader + Members)';
      case 'verified_leader':
        return 'Verified Team Leaders Only';
      case 'no_team_name':
        return 'No Team Name (Skipped Rows)';
      case 'all':
        return 'All Teams';
      default:
        return filter;
    }
  };

  const insertVariable = (variable: string) => {
    const insertion = `{{${variable}}}`;
    setHtmlContent(prev => prev + insertion);
    toast.success(`Inserted ${insertion}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            Email Template Editor
          </h2>
          <p className="text-zinc-500 mt-1">
            Design beautiful emails with HTML/CSS using Monaco Editor
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Email Stats Toggle */}
          <button
            onClick={() => {
              setShowStats(!showStats);
              if (!showStats && !emailStats) {
                loadEmailStats();
              }
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-800/40 text-purple-700 dark:text-purple-300 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Email Stats
          </button>
          
          {/* Theme Toggle */}
          <button
            onClick={() => setEditorTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Palette className="w-4 h-4" />
            {editorTheme === 'vs-dark' ? 'Light' : 'Dark'} Theme
          </button>
        </div>
      </div>

      {/* Email Stats Panel */}
      {showStats && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Email Sending Statistics
            </h3>
            <button
              onClick={loadEmailStats}
              disabled={loadingStats}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-200 dark:bg-purple-800 hover:bg-purple-300 dark:hover:bg-purple-700 text-purple-800 dark:text-purple-200 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : emailStats ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{emailStats.totalSent}</p>
                  <p className="text-sm text-zinc-500">Total Sent</p>
                </div>
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{emailStats.totalFailed}</p>
                  <p className="text-sm text-zinc-500">Total Failed</p>
                </div>
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{emailStats.bySubject.length}</p>
                  <p className="text-sm text-zinc-500">Unique Subjects</p>
                </div>
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {emailStats.totalSent > 0 
                      ? Math.round((emailStats.totalSent / (emailStats.totalSent + emailStats.totalFailed)) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-zinc-500">Success Rate</p>
                </div>
              </div>

              {/* Emails by Subject */}
              {emailStats.bySubject.length > 0 && (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-medium text-zinc-900 dark:text-white mb-3">Emails Sent by Subject</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {emailStats.bySubject.map((stat, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between py-2 px-3 bg-zinc-50 dark:bg-zinc-700 rounded-lg"
                      >
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate max-w-md" title={stat.subject}>
                          {stat.subject}
                        </span>
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-full">
                          {stat.sentCount} sent
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-zinc-500 py-4">No email stats available</p>
          )}
        </div>
      )}

      {/* Template Variables Quick Insert */}
      <div className="flex items-center gap-2 flex-wrap p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
          Quick Insert Variables:
        </span>
        {['name', 'teamName', 'email', 'collegeName'].map((variable) => (
          <button
            key={variable}
            onClick={() => insertVariable(variable)}
            className="px-3 py-1 rounded-full bg-white dark:bg-zinc-800 border border-purple-300 dark:border-purple-600 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            {`{{${variable}}}`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="space-y-4">
          {/* Controls Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Template Selector */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                <FileCode className="w-4 h-4 inline mr-1" />
                Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Email subject..."
              />
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 shadow-lg">
            <div className="bg-zinc-800 px-4 py-2 flex items-center justify-between border-b border-zinc-700">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-green-400" />
                <span className="text-sm text-zinc-300">HTML Editor</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
            <Editor
              height="350px"
              defaultLanguage="html"
              value={htmlContent}
              onChange={(value) => setHtmlContent(value || '')}
              theme={editorTheme}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                formatOnPaste: true,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 10 },
              }}
            />
          </div>

          {/* Target Group Selection - New Filters */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              <Users className="w-4 h-4 inline mr-1" />
              Send To (Select Filter)
            </label>
            
            {/* Unverified Teams Section */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-2 uppercase tracking-wide">
                Unverified Teams
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTargetGroup('unverified_all')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    targetGroup === 'unverified_all'
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 text-yellow-700 dark:text-yellow-400 shadow-lg'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-xs font-medium">Leader + Members</span>
                  <span className="text-xl font-bold">{recipientCounts?.unverified_all ?? unverifiedCount}</span>
                </button>
                
                <button
                  onClick={() => setTargetGroup('unverified_leader')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    targetGroup === 'unverified_leader'
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 text-yellow-700 dark:text-yellow-400 shadow-lg'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Crown className="w-5 h-5" />
                  <span className="text-xs font-medium">Leaders Only</span>
                  <span className="text-xl font-bold">{recipientCounts?.unverified_leader ?? '?'}</span>
                </button>
              </div>
            </div>

            {/* Verified Teams Section */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">
                Verified Teams
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTargetGroup('verified_all')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    targetGroup === 'verified_all'
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-400 shadow-lg'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  <UserCheck className="w-5 h-5" />
                  <span className="text-xs font-medium">Leader + Members</span>
                  <span className="text-xl font-bold">{recipientCounts?.verified_all ?? verifiedCount}</span>
                </button>
                
                <button
                  onClick={() => setTargetGroup('verified_leader')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    targetGroup === 'verified_leader'
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-400 shadow-lg'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Crown className="w-5 h-5" />
                  <span className="text-xs font-medium">Leaders Only</span>
                  <span className="text-xl font-bold">{recipientCounts?.verified_leader ?? '?'}</span>
                </button>
              </div>
            </div>

            {/* No Team Name Section */}
            {skippedRows.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2 uppercase tracking-wide">
                  No Team Name (Skipped Rows)
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setTargetGroup('no_team_name')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      targetGroup === 'no_team_name'
                        ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-400 text-orange-700 dark:text-orange-400 shadow-lg'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <UserX className="w-5 h-5" />
                    <span className="text-xs font-medium">Contacts without Team Name</span>
                    <span className="text-xl font-bold">{skippedRows.length}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendEmails}
            disabled={isSending || getRecipientCount() === 0}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending Emails...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send to {getRecipientCount()} Recipients
              </>
            )}
          </button>

          {/* Selected Filter Info */}
          <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Filter: <span className="font-medium text-zinc-700 dark:text-zinc-300">{getFilterLabel(targetGroup)}</span>
          </div>

          {/* Send Result */}
          {sendResult && (
            <div className={`p-4 rounded-xl border ${
              sendResult.failed === 0 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex items-center gap-3">
                {sendResult.failed === 0 ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {sendResult.sent} emails sent successfully
                  </p>
                  {sendResult.failed > 0 && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {sendResult.failed} emails failed
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              Live Preview
            </h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>

          <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden shadow-lg bg-white">
            {/* Email Client Header Mockup */}
            <div className="bg-zinc-100 dark:bg-zinc-800 p-4 border-b border-zinc-200 dark:border-zinc-700">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-16">From:</span>
                  <span className="text-sm text-zinc-900 dark:text-white">Loop Hackathon &lt;hello@loophackathon.tech&gt;</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-16">To:</span>
                  <span className="text-sm text-zinc-900 dark:text-white">{getRecipientCount()} recipients</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-16">Subject:</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">{subject || 'No subject'}</span>
                </div>
              </div>
            </div>
            
            {/* Email Content Preview */}
            <div className="h-[450px] overflow-auto">
              <iframe
                srcDoc={htmlContent.replace(/\{\{name\}\}/g, 'John Doe').replace(/\{\{teamName\}\}/g, 'Awesome Team').replace(/\{\{email\}\}/g, 'john@example.com').replace(/\{\{collegeName\}\}/g, 'MIT')}
                className="w-full h-full border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
