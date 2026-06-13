import React from 'react';
import { Clock, User, MapPin, BookOpen } from 'lucide-react';

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const COURSE_NAMES = {
  "CSE 1102": "Structured Programming Language",
  "CSE 1157": "Structured Programming Language Lab",
  "CSE 1205": "Electrical Engineering and Circuit Analysis",
  "CSE 1258": "Discrete Mathematics",
  "CSE 1259": "Electrical Engineering and Circuit Analysis Lab",
  "CSE 1290": "Software Development I",
  "CSE 1307": "Object-Oriented Programming I (C++)",
  "CSE 1360": "Object-Oriented Programming Lab",
  "ENG 1204": "English II (Advanced)",
  "MATH 1101": "Mathematics I (Differential Calculus and Integral Calculus)",
  "MATH 1302": "Mathematics II",
  "PHY 1302": "Physics II (Electromagnetism, Optics, and Modern Physics)",
  
  "CSE 2109": "Electronic Engineering",
  "CSE 2111": "Data Structures",
  "CSE 2161": "Electronic Engineering Lab Work",
  "CSE 2162": "Data Structure Lab Work",
  "CSE 2215": "Digital Logic Design",
  "CSE 2263": "Algorithm Design and Analysis",
  "CSE 2264": "Algorithms Lab Work",
  "CSE 2265": "Digital Logic Design Lab Work",
  "CSE 2291": "Software Development II (Database Programming)",
  "CSE 2317": "Digital Electronics & Pulse Technique",
  "CSE 2319": "Database Management System",
  "CSE 2366": "Digital Electronics & Pulse Technique Lab Works",
  "CSE 2367": "Database Management Systems Lab Work",
  "MATH 2103": "Mathematics III (Matrices, Vectors & Coordinate Geometry)",
  "MATH 2204": "Mathematics IV (Complex Variable & Laplace Transformation)",
  "MATH 2305": "Mathematics V (Statistics and Probability)",

  "CSE 3124": "Microprocessor and Assembly Language Programming",
  "CSE 3168": "Numerical Methods",
  "CSE 3169": "Theory of Computation",
  "CSE 3170": "Computer Architecture",
  "CSE 3171": "Microprocessor and Assembly Language Programming Lab Work",
  "CSE 3186": "Numerical Methods Lab Work",
  "CSE 3226": "Digital Image Processing",
  "CSE 3227": "Data Communication",
  "CSE 3228": "Compiler Design",
  "CSE 3230": "Software Engineering",
  "CSE 3272": "Compiler Design Lab Work",
  "CSE 3292": "Software Development III (Web Programming)",
  "CSE 3331": "Operating System",
  "CSE 3333": "Object-Oriented Programming II (Java)",
  "CSE 3373": "Operating System Lab Work",
  "CSE 3374": "Object-Oriented Programming II Lab Work (Java)",
  "CSE 3375": "Communication Engineering",

  "CSE 4136": "Computer Networks",
  "CSE 4176": "Computer Networks Lab Work",
  "CSE 4138": "Computer Peripherals and Interfacing",
  "CSE 4177": "Computer Peripherals and Interfacing Lab Work",
  "CSE 4241": "VLSI Design",
  "CSE 4279": "VLSI Design Lab Work",
  "CSE 4278": "Computer Graphics and Multimedia System Design",
  "CSE 4288": "Computer Graphics Lab Work",
  "CSE 4349": "Management Information System",
  "CSE 4351": "Image Processing & Computer Vision",
  "CSE 4383": "Image Processing & Computer Vision Lab Work",
  "CSE 4355": "Artificial Intelligence and Expert Systems",
  "CSE 4385": "Artificial Intelligence and Expert Systems Lab Work",
  "IPE 4101": "Industrial Management"
};

export default function RoutineTable({ routine, selectedGroup }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
        <h3 className="text-lg font-bold text-slate-900">
          Schedule — Section {selectedGroup}
        </h3>
        <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-md">
          Live Data
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {DAYS.map(day => {
          const dayClasses = routine.filter(item => item.day === day);
          if (dayClasses.length === 0) return null;

          return (
            <div
              key={day}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row"
            >
              {/* Day Strip */}
              <div className="md:w-48 bg-slate-900 text-white px-6 py-4 flex md:flex-col justify-between md:justify-center items-center md:items-start gap-1 flex-shrink-0">
                <span className="font-bold text-lg tracking-wide">{day}</span>
                <span className="text-xs text-indigo-300 font-medium">
                  {dayClasses.length} class{dayClasses.length > 1 ? 'es' : ''}
                </span>
              </div>

              {/* Classes */}
              <div className="p-4 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
                {dayClasses.map((cls, idx) => {
                  const isLab = cls.section_type && cls.section_type.toLowerCase() === 'lab';
                  const subjectName = COURSE_NAMES[cls.course] || '';
                  
                  // Distinct styling configurations for Odd and Even schedules
                  let cardBgClass = 'bg-white border-slate-200/80';
                  let badgeStyles = '';
                  
                  if (cls.odd_even && cls.odd_even.toLowerCase() === 'odd') {
                    cardBgClass = 'bg-[#fffbeb] border-amber-300/60 shadow-[0_1px_2px_rgba(245,158,11,0.05)]';
                    badgeStyles = 'text-amber-800 bg-amber-100 border-amber-300';
                  } else if (cls.odd_even && cls.odd_even.toLowerCase() === 'even') {
                    cardBgClass = 'bg-[#f0f9ff] border-sky-300/60 shadow-[0_1px_2px_rgba(14,165,233,0.05)]';
                    badgeStyles = 'text-sky-800 bg-sky-100 border-sky-300';
                  }

                  return (
                    <div
                      key={idx}
                      className={`border p-4 rounded-xl flex flex-col justify-between shadow-sm transition-colors hover:border-indigo-200 ${cardBgClass} ${
                        isLab ? 'border-l-4 border-l-emerald-400' : ''
                      }`}
                    >
                      <div>
                        {/* Time slot and Lab Badge */}
                        <div className="flex items-center justify-between gap-1.5 text-xs font-semibold mb-2">
                          <div className="flex items-center gap-1 text-indigo-600">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{cls.start_time} – {cls.end_time}</span>
                          </div>
                          {isLab && (
                            <span className="text-[10px] uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-bold tracking-wide">
                              LAB
                            </span>
                          )}
                        </div>

                        {/* Course Code (Main Focus - restored to original format) */}
                        <h4 className="font-bold text-slate-900 text-base leading-tight mb-1">
                          {cls.course}
                        </h4>

                        {/* Subject Title (Elegant and perfectly styled underneath) */}
                        {subjectName && (
                          <p className="text-xs text-slate-600 font-medium mb-3 flex items-start gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                            <span>{subjectName}</span>
                          </p>
                        )}
                        {!subjectName && <div className="mb-3" />}
                      </div>

                      {/* Card Footer (Instructor, Room, and Week Details) */}
                      <div className="flex items-end justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate font-medium text-slate-700">{cls.teacher?.name || cls.teacher}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="font-semibold text-slate-800">{cls.room}</span>
                          </div>
                        </div>

                        {/* Odd/Even Week details inside footer (left-aligned text, right-aligned box) */}
                        {cls.odd_even && (
                          <div className="flex-shrink-0 leading-tight">
                            <span className={`text-[10px] font-bold uppercase border px-2 py-1 rounded-md block text-left ${badgeStyles}`}>
                              {cls.odd_even}<br />Week
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
