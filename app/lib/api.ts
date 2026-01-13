import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  degree?: string;
  yearOfStudy?: number;
  isLeader: boolean;
}

export interface Team {
  id: string;
  unstopTeamId: string;
  teamName: string;
  collegeName: string;
  teamSize: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  submissionStatus: string;
  evaluationStatus: string;
  paymentStatus: string;
  leader?: TeamMember;
  members?: TeamMember[];
}

export interface TeamStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  jobId?: string;
  stats: {
    totalTeams: number;
    newTeams: number;
    updatedTeams: number;
    removedTeams?: number;
    skippedRows?: number;
    errors: number;
  };
  skippedRows?: SkippedRow[];
  errors: string[];
}

export interface SkippedRow {
  rowNumber: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  reason: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

export interface UnverifiedTeam {
  teamId: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  leaderPhone: string;
  verificationStatus: string;
}

export interface Contact {
  teamId: string;
  teamName: string;
  members: TeamMember[];
}

// API Functions

export const uploadCSV = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/teams/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getTeamStats = async (): Promise<{ success: boolean; stats: TeamStats }> => {
  const response = await api.get('/api/teams/stats');
  return response.data;
};

export const getVerifiedTeams = async (): Promise<{ success: boolean; count: number; teams: Team[] }> => {
  const response = await api.get('/api/teams/verified');
  return response.data;
};

export const getUnverifiedTeams = async (): Promise<{ success: boolean; count: number; teams: UnverifiedTeam[] }> => {
  const response = await api.get('/api/teams/unverified');
  return response.data;
};

export const getUnverifiedPhoneNumbers = async (): Promise<{ success: boolean; count: number; phoneNumbers: string[] }> => {
  const response = await api.get('/api/teams/unverified/phone-numbers');
  return response.data;
};

export const getUnverifiedAllContacts = async (): Promise<{ success: boolean; count: number; contacts: Contact[] }> => {
  const response = await api.get('/api/teams/unverified/all-contacts');
  return response.data;
};

export const sendVerificationReminders = async (): Promise<{ success: boolean; message: string; stats: { sent: number; failed: number; total: number } }> => {
  const response = await api.post('/api/teams/send-verification-reminders');
  return response.data;
};

export const verifyTeam = async (teamId: string): Promise<{ success: boolean; message: string; team: Team }> => {
  const response = await api.patch(`/api/teams/${teamId}/verify`);
  return response.data;
};

export const exportTeams = (status?: 'PENDING' | 'VERIFIED' | 'REJECTED'): string => {
  const params = status ? `?status=${status}` : '';
  return `${API_BASE_URL}/api/teams/export${params}`;
};

export const getEmailTemplates = async (): Promise<{ success: boolean; templates: EmailTemplate[] }> => {
  const response = await api.get('/api/teams/email-templates');
  return response.data;
};

// Email filter type
export type EmailTargetGroup = 
  | 'unverified_all' 
  | 'unverified_leader' 
  | 'verified_all' 
  | 'verified_leader'
  | 'all'
  // Legacy support
  | 'verified'
  | 'unverified';

export const sendCustomEmail = async (
  subject: string,
  htmlContent: string,
  targetGroup: EmailTargetGroup
): Promise<{ success: boolean; message: string; stats: { sent: number; failed: number; total: number }; errors: Array<{ email: string; error: string }> }> => {
  const response = await api.post('/api/teams/send-custom-email', {
    subject,
    htmlContent,
    targetGroup,
  });
  return response.data;
};

// Send emails to custom recipients (for skipped rows / no team name)
export interface CustomRecipient {
  email: string;
  name: string;
}

export const sendEmailToCustomRecipients = async (
  subject: string,
  htmlContent: string,
  recipients: CustomRecipient[]
): Promise<{ success: boolean; message: string; stats: { sent: number; failed: number; total: number }; errors: Array<{ email: string; error: string }> }> => {
  const response = await api.post('/api/teams/send-custom-email-recipients', {
    subject,
    htmlContent,
    recipients,
  });
  return response.data;
};

// Email Stats Types
export interface EmailSubjectStat {
  subject: string;
  sentCount: number;
}

export interface RecentEmail {
  id: string;
  subject: string | null;
  recipientEmail: string | null;
  status: string;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
}

export interface EmailStats {
  totalSent: number;
  totalFailed: number;
  bySubject: EmailSubjectStat[];
  recentEmails: RecentEmail[];
}

export interface RecipientCounts {
  unverified_all: number;
  unverified_leader: number;
  verified_all: number;
  verified_leader: number;
  all: number;
}

export const getEmailStats = async (): Promise<{ success: boolean; stats: EmailStats }> => {
  const response = await api.get('/api/teams/email-stats');
  return response.data;
};

export const getEmailRecipientCounts = async (): Promise<{ success: boolean; counts: RecipientCounts }> => {
  const response = await api.get('/api/teams/email-recipient-counts');
  return response.data;
};

// Call Log Types and Functions

export interface CallLogEntry {
  teamId: string;
  teamName: string;
  leaderName: string;
  leaderPhone: string;
  leaderEmail: string;
  callStatus: 'NOT_CALLED' | 'CALLED_WILL_VERIFY' | 'CALLED_NOT_PICKED' | 'CALLED_REJECTED' | 'BEING_CALLED';
  calledBy: string | null;
  lockedBy: string | null;
  lockedAt: string | null;
  notes: string | null;
  lastCalledAt: string | null;
}

export interface CallStats {
  total: number;
  notCalled: number;
  willVerify: number;
  notPicked: number;
  rejected: number;
  beingCalled: number;
}

export const getTeamsWithCallStatus = async (): Promise<{ success: boolean; count: number; teams: CallLogEntry[] }> => {
  const response = await api.get('/api/call-log/teams');
  return response.data;
};

export const getCallStats = async (): Promise<{ success: boolean; stats: CallStats }> => {
  const response = await api.get('/api/call-log/stats');
  return response.data;
};

export const lockTeamForCalling = async (teamId: string, callerName: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/api/call-log/teams/${teamId}/lock`, { callerName });
  return response.data;
};

export const updateCallStatus = async (
  teamId: string,
  status: 'CALLED_WILL_VERIFY' | 'CALLED_NOT_PICKED' | 'CALLED_REJECTED',
  callerName: string,
  notes?: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/api/call-log/teams/${teamId}/status`, {
    status,
    callerName,
    notes,
  });
  return response.data;
};

export const releaseTeamLock = async (teamId: string, callerName: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/api/call-log/teams/${teamId}/release`, { callerName });
  return response.data;
};

export default api;
