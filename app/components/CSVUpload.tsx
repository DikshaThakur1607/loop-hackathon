'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { uploadCSV, UploadResponse } from '../lib/api';
import toast from 'react-hot-toast';

interface CSVUploadProps {
  onUploadSuccess?: (data: UploadResponse) => void;
}

export default function CSVUpload({ onUploadSuccess }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [showSkippedRows, setShowSkippedRows] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await uploadCSV(file);
      setUploadResult(result);
      
      if (result.success) {
        toast.success(`Successfully processed ${result.stats.totalTeams} teams!`);
        onUploadSuccess?.(result);
      } else {
        toast.error('Upload failed: ' + result.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload CSV. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Processing CSV...</p>
            <p className="text-sm text-zinc-500">This may take a moment</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                Upload Unstop registration CSV (max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className={`mt-6 p-6 rounded-xl ${
          uploadResult.success 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-start gap-4">
            {uploadResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1">
              <h3 className={`font-semibold ${
                uploadResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
              }`}>
                {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
              </h3>
              
              {uploadResult.success && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <FileText className="w-4 h-4" />
                      Total Teams
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                      {uploadResult.stats.totalTeams}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg">
                    <div className="text-zinc-500 text-sm">New Teams</div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {uploadResult.stats.newTeams}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg">
                    <div className="text-zinc-500 text-sm">Updated</div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {uploadResult.stats.updatedTeams}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg">
                    <div className="text-zinc-500 text-sm">Removed</div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                      {uploadResult.stats.removedTeams || 0}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg">
                    <div className="text-zinc-500 text-sm">Skipped Rows</div>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                      {uploadResult.stats.skippedRows || 0}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg">
                    <div className="text-zinc-500 text-sm">Errors</div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {uploadResult.stats.errors}
                    </p>
                  </div>
                </div>
              )}

              {/* Skipped Rows Section */}
              {uploadResult.success && uploadResult.skippedRows && uploadResult.skippedRows.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowSkippedRows(!showSkippedRows)}
                    className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-medium hover:underline"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {uploadResult.skippedRows.length} rows skipped (missing Team ID/Name)
                    {showSkippedRows ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {showSkippedRows && (
                    <div className="mt-3 max-h-64 overflow-auto bg-white dark:bg-zinc-800 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <table className="w-full text-sm">
                        <thead className="bg-yellow-50 dark:bg-yellow-900/30 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium text-yellow-800 dark:text-yellow-300">Row</th>
                            <th className="text-left p-2 font-medium text-yellow-800 dark:text-yellow-300">Name</th>
                            <th className="text-left p-2 font-medium text-yellow-800 dark:text-yellow-300">Email</th>
                            <th className="text-left p-2 font-medium text-yellow-800 dark:text-yellow-300">Phone</th>
                            <th className="text-left p-2 font-medium text-yellow-800 dark:text-yellow-300">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.skippedRows.map((row, i) => (
                            <tr key={i} className="border-t border-yellow-100 dark:border-yellow-900">
                              <td className="p-2 text-zinc-600 dark:text-zinc-400">{row.rowNumber}</td>
                              <td className="p-2 text-zinc-900 dark:text-white">{row.candidateName}</td>
                              <td className="p-2 text-zinc-600 dark:text-zinc-400">{row.candidateEmail}</td>
                              <td className="p-2 text-zinc-600 dark:text-zinc-400">{row.candidatePhone}</td>
                              <td className="p-2 text-yellow-700 dark:text-yellow-400">{row.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Errors:</p>
                  <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    {uploadResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li>... and {uploadResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
