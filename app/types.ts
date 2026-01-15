export type TabType =
  | 'upload'
  | 'verified'
  | 'unverified'
  | 'contacts'
  | 'skipped'
  | 'email';

export interface TeamStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
}

export interface SkippedRow {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  rowNumber: number;
  reason: string;
}
