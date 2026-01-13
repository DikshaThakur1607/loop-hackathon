'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, Loader2, Eye, Code, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { getEmailTemplates, sendCustomEmail, EmailTemplate } from '../lib/api';
import toast from 'react-hot-toast';

interface EmailTemplateEditorProps {
  unverifiedCount: number;
  verifiedCount: number;
  onEmailsSent?: () => void;
}

export default function EmailTemplateEditor({ 
  unverifiedCount, 
  verifiedCount, 
  onEmailsSent 
}: EmailTemplateEditorProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [subject, setSubject] = useState('Loop Hackathon Update');
  const [htmlContent, setHtmlContent] = useState('');
  const [targetGroup, setTargetGroup] = useState<'all' | 'verified' | 'unverified'>('unverified');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await getEmailTemplates();
      setTemplates(response.templates);
      
      // Set default template
      const customTemplate = response.templates.find(t => t.id === 'custom');
      if (customTemplate) {
        setHtmlContent(customTemplate.content);
        setSubject(customTemplate.subject);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      // Set a default template if API fails
      setHtmlContent(getDefaultTemplate());
    } finally {
      setIsLoading(false);
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

    const recipientCount = targetGroup === 'verified' 
      ? verifiedCount 
      : targetGroup === 'unverified' 
        ? unverifiedCount 
        : verifiedCount + unverifiedCount;

    if (recipientCount === 0) {
      toast.error('No recipients found for the selected group');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${recipientCount} ${targetGroup} team members?`
    );

    if (!confirmed) return;

    setIsSending(true);
    setSendResult(null);

    try {
      const result = await sendCustomEmail(subject, htmlContent, targetGroup);
      setSendResult({ sent: result.stats.sent, failed: result.stats.failed });
      
      if (result.stats.sent > 0) {
        toast.success(`Successfully sent ${result.stats.sent} emails!`);
      }
      if (result.stats.failed > 0) {
        toast.error(`Failed to send ${result.stats.failed} emails`);
      }
      
      onEmailsSent?.();
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Failed to send emails. Check console for details.');
    } finally {
      setIsSending(false);
    }
  };

  const getRecipientCount = () => {
    if (targetGroup === 'verified') return verifiedCount;
    if (targetGroup === 'unverified') return unverifiedCount;
    return verifiedCount + unverifiedCount;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Email Template Editor
          </h2>
          <p className="text-zinc-500">
            Compose and send custom emails to team members
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="space-y-4">
          {/* Template Selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Select Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Group */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Send To
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTargetGroup('unverified')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                  targetGroup === 'unverified'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 text-yellow-700 dark:text-yellow-400'
                    : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">Unverified</div>
                  <div className="text-xs opacity-75">{unverifiedCount} members</div>
                </div>
              </button>
              <button
                onClick={() => setTargetGroup('verified')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                  targetGroup === 'verified'
                    ? 'bg-green-100 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-400'
                    : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">Verified</div>
                  <div className="text-xs opacity-75">{verifiedCount} members</div>
                </div>
              </button>
              <button
                onClick={() => setTargetGroup('all')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                  targetGroup === 'all'
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400'
                    : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">All Teams</div>
                  <div className="text-xs opacity-75">{verifiedCount + unverifiedCount} members</div>
                </div>
              </button>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* HTML Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email Content (HTML)
              </label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showPreview ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Edit HTML' : 'Preview'}
              </button>
            </div>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Enter HTML content..."
              rows={12}
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          {/* Placeholders Help */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">
              Available Placeholders:
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{'{{name}}'}</code> - Recipient's name, 
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded ml-2">{'{{email}}'}</code> - Recipient's email, 
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded ml-2">{'{{teamName}}'}</code> - Team name
            </p>
          </div>

          {/* Send Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSendEmails}
              disabled={isSending || getRecipientCount() === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send to {getRecipientCount()} Recipients
                </>
              )}
            </button>
          </div>

          {/* Send Result */}
          {sendResult && (
            <div className={`p-4 rounded-lg ${
              sendResult.failed === 0 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex items-center gap-3">
                {sendResult.failed === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
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
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
            <Eye className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email Preview</span>
          </div>
          <div className="p-4">
            <div className="mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 mb-1">Subject:</p>
              <p className="font-medium text-zinc-900 dark:text-white">{subject || 'No subject'}</p>
            </div>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none overflow-auto max-h-[500px]"
              dangerouslySetInnerHTML={{ 
                __html: htmlContent
                  .replace(/\{\{name\}\}/gi, 'John Doe')
                  .replace(/\{\{email\}\}/gi, 'john@example.com')
                  .replace(/\{\{teamName\}\}/gi, 'Team Alpha')
                  .replace(/\{\{team_name\}\}/gi, 'Team Alpha')
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
