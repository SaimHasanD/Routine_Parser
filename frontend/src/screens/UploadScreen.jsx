import React, { useState, useRef } from 'react';
import { Upload, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadExcel } from '../services/api.js';

const ADMIN_PASSWORD = "admin123_nu";

export default function UploadScreen() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid admin password. Access denied.');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadSuccess(null);
    setUploadError(null);

    try {
      const data = await uploadExcel(file, password);
      setUploadSuccess({ groupsCount: data.groups ? data.groups.length : 0 });
      setFile(null);
    } catch (error) {
      console.error("Upload failed", error);
      setUploadError(error.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Admin Authentication</h2>
          <p className="text-slate-500 text-center text-sm mb-6">
            Enter password to upload updated class schedules.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all shadow-sm"
            >
              Verify &amp; Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Routine Spreadsheet</h2>
        <p className="text-slate-500 text-sm mb-6">
          Drag and drop your NUB master schedule Excel file here.
        </p>

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-600 bg-indigo-50/50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
          />
          <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
          {file ? (
            <p className="text-indigo-600 font-medium text-sm">{file.name}</p>
          ) : (
            <div>
              <p className="text-slate-700 font-medium">Click to upload or drag &amp; drop</p>
              <p className="text-xs text-slate-400 mt-1">Excel (.xlsx) files only</p>
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`w-full mt-6 py-3 font-medium rounded-xl transition-all shadow-sm flex justify-center items-center ${
            file && !uploading
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            'Process & Upload Schedule'
          )}
        </button>

        {uploadSuccess && (
          <div className="mt-6 border border-emerald-200 bg-emerald-50 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">Upload Successful!</h4>
              <p className="text-emerald-700 text-xs mt-0.5">
                Parsed correctly. Generated routines for{' '}
                <strong>{uploadSuccess.groupsCount} sections</strong>.
              </p>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="mt-6 border border-rose-200 bg-rose-50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-900 text-sm">Upload Failed!</h4>
              <p className="text-rose-700 text-xs mt-0.5">
                {uploadError}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
