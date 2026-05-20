import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, FileText, Image as ImageIcon } from 'lucide-react';
import RoutineDownloadLayout from './RoutineDownloadLayout.jsx';

export default function RoutinePreviewModal({ 
  isOpen, 
  onClose, 
  routine, 
  selectedGroup,
  onDownloadPdf,
  onDownloadImage 
}) {
  const [scale, setScale] = useState(0.85);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.05, 1.2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.05, 0.5));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
      {/* Modal Card */}
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Routine Download Preview
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Section {selectedGroup} — Official PDF Print Format
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button 
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1.5 hover:bg-white text-slate-600 rounded-md transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-2 text-slate-700 min-w-[3.5rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button 
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1.5 hover:bg-white text-slate-600 rounded-md transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Downloads */}
            <button
              onClick={onDownloadPdf}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </button>
            <button
              onClick={onDownloadImage}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Image
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            {/* Close */}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Workspace */}
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-200/50">
          <div 
            className="transition-transform duration-100 ease-out origin-top shadow-xl rounded-lg"
            style={{ 
              transform: `scale(${scale})`, 
              height: 'fit-content',
              marginBottom: '2rem'
            }}
          >
            <RoutineDownloadLayout routine={routine} selectedGroup={selectedGroup} />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>Tip: The downloaded file maps all course codes to their official NUB subject titles.</span>
          <span className="font-semibold text-indigo-600">Department of CSE, NUB</span>
        </div>
      </div>
    </div>
  );
}
