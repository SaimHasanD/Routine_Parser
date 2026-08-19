import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { COURSE_NAMES } from '../utils/courseNames.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getPdfImageDimensions, downloadCanvasAsImage } from '../utils/exportSheet.js';

// Helper to precisely format the slot string
const formatSlotString = (slotStr) => {
  if (!slotStr) return { slotName: '', timeStr: '' };
  
  // Split raw string by newlines
  const parts = slotStr.split('\n').map(s => s.trim());
  if (parts.length === 1) return { slotName: parts[0], timeStr: '' };
  
  // Isolate the slot number
  const slotName = parts[0];
  
  // Combine the time portions, replacing breaking hyphens to ensure a clean single line
  const timeStr = parts.slice(1).join(' ').replace(/-\s+/g, '- ');
  
  return { slotName, timeStr };
};

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
            
            {/* The physical A4 page */}
            <div ref={printRef} className="w-[210mm] min-h-[297mm] p-[15mm] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] mx-auto relative flex flex-col text-black">
              
              {/* Document Top Header */}
              <div className="text-center mb-8">
                <h1 className="font-serif text-[28px] font-bold leading-tight">
                  Northern University Bangladesh
                </h1>
                <h2 className="font-sans text-[18px] font-bold mt-1 text-slate-800">
                  Department of Computer Science & Engineering
                </h2>
                
                <div className="mt-5 inline-block text-center">
                  <h3 className="bg-yellow-100 border border-yellow-400 text-yellow-800 font-bold rounded-md px-4 py-1 text-[15px]">
                    Midterm Examination Schedule, Summer-2026 (Revised)
                  </h3>
                  {/* Conditional Semester Rendering */}
                  {isSpecificSemester && (
                    <h3 className="text-md font-bold mt-3 text-gray-800">
                      Semester: {selectedSem}
                    </h3>
                  )}
                </div>
              </div>

              {/* Exam Table */}
              <table className="w-full border-collapse border border-gray-300 text-[13px] mb-4">
                <thead>
                  <tr className="bg-[#2b5c82] text-white text-[11px] uppercase tracking-wider">
                    <th className="border border-gray-300 p-2.5 w-10 text-center">S.L</th>
                    <th className="border border-gray-300 p-2.5 w-24 text-center">Date</th>
                    <th className="border border-gray-300 p-2.5 w-24 text-center">Day</th>
                    <th className="border border-gray-300 p-2.5 w-32 text-center">Time & Slot</th>
                    <th className="border border-gray-300 p-2.5 w-28 text-left pl-4">Course Code</th>
                    <th className="border border-gray-300 p-2.5 text-left pl-4">Subject Name</th>
                    {/* Conditionally hide the Semester column if viewing a specific semester */}
                    {!isSpecificSemester && (
                      <th className="border border-gray-300 p-2.5 w-20 text-center">Semester</th>
                    )}
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-800">
                  {visibleRows && visibleRows.length > 0 ? (
                    visibleRows.map((row, index) => {
                      // Determine rowSpan for Date & Day based on consecutive dates
                      const isFirstOfDate = index === 0 || visibleRows[index - 1].date !== row.date;
                      let rowspan = 1;
                      
                      if (isFirstOfDate) {
                        for (let i = index + 1; i < visibleRows.length; i++) {
                          if (visibleRows[i].date === row.date) rowspan++;
                          else break;
                        }
                      }

                      // Parse raw slot format
                      const { slotName, timeStr } = formatSlotString(row.slot);

                      return (
                        <tr key={index} className="even:bg-slate-50 border-b border-gray-300">
                          <td className="border border-gray-300 p-2 text-center font-medium">
                            {index + 1}
                          </td>
                          
                          {/* RowSpan applied to Date and Day */}
                          {isFirstOfDate && (
                            <td rowSpan={rowspan} className="border border-gray-300 p-2 text-center font-medium">
                              {row.date}
                            </td>
                          )}
                          {isFirstOfDate && (
                            <td rowSpan={rowspan} className="border border-gray-300 p-2 text-center">
                              {row.day}
                            </td>
                          )}

                          <td className="border border-gray-300 p-2 text-center align-middle">
                            <div className="font-semibold text-gray-900">{slotName}</div>
                            {timeStr && (
                              <div className="whitespace-nowrap font-medium text-gray-700 mt-0.5">
                                {timeStr}
                              </div>
                            )}
                          </td>
                          <td className="border border-gray-300 p-0 align-top text-left">
                            {row.courses.map((c, ci) => {
                              const isObj = typeof c === 'object' && c !== null;
                              const code = isObj
                                ? (typeof c.code === 'object' && c.code !== null ? c.code.code : c.code)
                                : String(c);
                              return (
                                <div 
                                  key={ci} 
                                  className={`py-2 pl-4 font-semibold ${ci !== row.courses.length - 1 ? 'border-b border-gray-300' : ''}`}
                                >
                                  {code || '-'}
                                </div>
                              );
                            })}
                          </td>
                          <td className="border border-gray-300 p-0 align-top text-left">
                            {row.courses.map((c, ci) => {
                              const isObj = typeof c === 'object' && c !== null;
                              const code = isObj
                                ? (typeof c.code === 'object' && c.code !== null ? c.code.code : c.code)
                                : String(c);
                              // Try to get title from DB object first, then fallback to COURSE_NAMES map
                              let title = isObj && c.title ? c.title : null;
                              if (!title && code) {
                                title = COURSE_NAMES[code];
                              }
                              return (
                                <div 
                                  key={ci} 
                                  className={`py-2 pl-4 ${ci !== row.courses.length - 1 ? 'border-b border-gray-300' : ''}`}
                                >
                                  {title ? title : <span className="text-gray-400 italic">Title pending in DB</span>}
                                </div>
                              );
                            })}
                          </td>
                          
                          {/* Conditionally hide the Semester cell if viewing a specific semester */}
                          {!isSpecificSemester && (
                            <td className="border border-gray-300 p-0 align-top text-center">
                              {row.courses.map((c, ci) => {
                                const isObj = typeof c === 'object' && c !== null;
                                const sem = isObj ? c.semester : '-';
                                return (
                                  <div 
                                    key={ci} 
                                    className={`py-2 font-medium ${ci !== row.courses.length - 1 ? 'border-b border-gray-300' : ''}`}
                                  >
                                    {sem || '-'}
                                  </div>
                                );
                              })}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={isSpecificSemester ? "6" : "7"} className="border border-gray-300 p-6 text-center text-gray-500 italic">
                        No exam slots available for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Bottom Warning */}
              <p className="text-red-600 font-bold italic text-[14px] mt-2">
                *** This schedule is only for those students who have ID with code 42.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
