import React from 'react';
import { COURSE_NAMES } from '../utils/courseNames.js';

// Helper to precisely format the slot string
const formatSlotString = (slotStr) => {
  if (!slotStr) return { slotName: '', timeStr: '' };
  
  const parts = slotStr.split('\n').map(s => s.trim());
  if (parts.length === 1) return { slotName: parts[0], timeStr: '' };
  
  const slotName = parts[0];
  const timeStr = parts.slice(1).join(' ').replace(/-\s+/g, '- ');
  
  return { slotName, timeStr };
};

export default function ExamDownloadLayout({
  visibleRows,
  selectedSem,
  forExport = false
}) {
  const isSpecificSemester = selectedSem && selectedSem !== 'All';

  return (
    <div 
      id="exam-print-sheet" 
      className={`w-[210mm] min-h-[297mm] bg-white flex flex-col text-black mx-auto ${forExport ? 'p-[10mm]' : 'p-[15mm] shadow-[0_8px_30px_rgb(0,0,0,0.08)]'}`}
    >
      {/* Document Top Header */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-[28px] font-bold leading-tight">
          Northern University Bangladesh
        </h1>
        <h2 className="font-sans text-[18px] font-bold mt-1 text-slate-800">
          Department of Computer Science & Engineering
        </h2>
        
        <div className="mt-4 text-center flex flex-col gap-1 items-center">
          <h3 className="text-[#2b5c82] font-bold text-[17px]">
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
            {!isSpecificSemester && (
              <th className="border border-gray-300 p-2.5 w-20 text-center">Semester</th>
            )}
          </tr>
        </thead>
        <tbody className="text-sm text-gray-800">
          {visibleRows && visibleRows.length > 0 ? (
            visibleRows.map((row, index) => {
              const isFirstOfDate = index === 0 || visibleRows[index - 1].date !== row.date;
              let rowspan = 1;
              
              if (isFirstOfDate) {
                for (let i = index + 1; i < visibleRows.length; i++) {
                  if (visibleRows[i].date === row.date) rowspan++;
                  else break;
                }
              }

              const { slotName, timeStr } = formatSlotString(row.slot);

              return (
                <tr key={index} className="even:bg-slate-50 border-b border-gray-300">
                  <td className="border border-gray-300 p-2 text-center font-medium">
                    {index + 1}
                  </td>
                  
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
  );
}
