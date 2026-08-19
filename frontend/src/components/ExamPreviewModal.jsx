import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getPdfImageDimensions, downloadCanvasAsImage } from '../utils/exportSheet.js';
import ExamDownloadLayout from './ExamDownloadLayout.jsx';

export default function ExamPreviewModal({
  isOpen,
  onClose,
  visibleRows,
  selectedSem
}) {
  const [scale, setScale] = useState(0.85);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      if (window.innerWidth < 640) {
        setScale(0.3);
      } else if (window.innerWidth < 1024) {
        setScale(0.6);
      } else {
        setScale(0.85);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.2));

  // If selectedSem has a value and is not "All", treat it as a specific semester
  const isSpecificSemester = selectedSem && selectedSem !== 'All';

  const today = new Date().toISOString().slice(0, 10);
  const filenameBase = `exam-schedule-${today}`;

  const captureCanvas = async () => {
    if (!printRef.current) return null;
    
    // We need to temporarily un-scale the parent so html2canvas captures at 100% resolution.
    const wrapper = printRef.current.parentElement;
    const oldTransform = wrapper.style.transform;
    wrapper.style.transform = 'scale(1)';
    
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 50));
    
    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
    
    wrapper.style.transform = oldTransform;
    return canvas;
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const { x, y, w, h } = getPdfImageDimensions(doc, imgData, 0); 
      doc.addImage(imgData, 'PNG', x, y, w, h, undefined, 'NONE');
      doc.save(`${filenameBase}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      downloadCanvasAsImage(canvas, `${filenameBase}.png`);
    } catch (err) {
      console.error('Image generation failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
      {/* Modal Shell */}
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Action Bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
          
          <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
            <h3 className="text-lg font-bold text-slate-900">
              Exam Schedule Download Preview
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Official Print Format
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
            <button onClick={handleZoomOut} className="px-2 py-1 hover:bg-white rounded text-slate-700 font-bold transition-colors" title="Zoom Out">➖</button>
            <span className="text-sm font-bold text-slate-800 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} className="px-2 py-1 hover:bg-white rounded text-slate-700 font-bold transition-colors" title="Zoom In">➕</button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-1 w-full sm:w-auto justify-end">
            <button 
              onClick={handleDownloadPdf} 
              disabled={downloading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              {downloading && <Loader2 className="w-4 h-4 animate-spin" />}
              {downloading ? 'Processing...' : 'Download PDF'}
            </button>
            <button 
              onClick={handleDownloadImage} 
              disabled={downloading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              {downloading && <Loader2 className="w-4 h-4 animate-spin" />}
              {downloading ? 'Processing...' : 'Download Image'}
            </button>
            <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1" />
            <button onClick={onClose} className="p-2 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-lg transition-colors" title="Close"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* A4 Document Preview Wrapper */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-200/80 flex justify-center items-start">
          <div className="origin-top transition-transform duration-200 ease-out" style={{ transform: `scale(${scale})` }}>
            
            <div ref={printRef}>
              <ExamDownloadLayout visibleRows={visibleRows} selectedSem={selectedSem} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
