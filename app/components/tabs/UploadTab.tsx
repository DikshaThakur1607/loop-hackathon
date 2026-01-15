'use client';

import CSVUpload from '../CSVUpload';

interface UploadTabProps {
  onUploadSuccess: (data: { skippedRows?: any[] }) => void;
}

export default function UploadTab({ onUploadSuccess }: UploadTabProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
        Upload Unstop Registration CSV
      </h2>
      <p className="text-zinc-500 mb-6">
        Upload the registration export from Unstop to sync team data
      </p>

      <CSVUpload onUploadSuccess={onUploadSuccess} />
    </div>
  );
}
