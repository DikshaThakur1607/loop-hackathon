'use client';

import { useState } from 'react';
import { Mail, Loader2, Send, CheckCircle } from 'lucide-react';
import { sendVerificationReminders } from '../lib/api';
import toast from 'react-hot-toast';

interface BulkEmailButtonProps {
  unverifiedCount: number;
  onEmailsSent?: () => void;
}

export default function BulkEmailButton({ unverifiedCount, onEmailsSent }: BulkEmailButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number } | null>(null);

  const handleSendEmails = async () => {
    if (unverifiedCount === 0) {
      toast.error('No unverified teams to send emails to');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send verification reminder emails to all ${unverifiedCount} unverified team members?`
    );

    if (!confirmed) return;

    setIsSending(true);
    setEmailResult(null);

    try {
      const result = await sendVerificationReminders();
      setEmailResult({ sent: result.stats.sent, failed: result.stats.failed });
      
      if (result.stats.sent > 0) {
        toast.success(`Successfully sent ${result.stats.sent} emails!`);
      }
      if (result.stats.failed > 0) {
        toast.error(`Failed to send ${result.stats.failed} emails`);
      }
      
      onEmailsSent?.();
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Failed to send verification emails. Check SendGrid configuration.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleSendEmails}
        disabled={isSending || unverifiedCount === 0}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending Emails...
          </>
        ) : (
          <>
            <Mail className="w-5 h-5" />
            Send Bulk Verification Reminders
          </>
        )}
      </button>

      {emailResult && (
        <div className="flex items-center gap-4 text-sm">
          {emailResult.sent > 0 && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              {emailResult.sent} sent
            </span>
          )}
          {emailResult.failed > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {emailResult.failed} failed
            </span>
          )}
        </div>
      )}
    </div>
  );
}
