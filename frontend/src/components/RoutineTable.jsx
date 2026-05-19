import React from 'react';
import { Clock, User, MapPin } from 'lucide-react';

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
                {dayClasses.map((cls, idx) => (
                  <div
                    key={idx}
                    className={`bg-white border p-4 rounded-xl flex flex-col justify-between shadow-sm transition-colors hover:border-indigo-200 ${
                      cls.type === 'lab' ? 'border-l-4 border-l-emerald-400 border-slate-200/80' : 'border-slate-200/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-indigo-600">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{cls.start_time} – {cls.end_time}</span>
                      </div>
                      {cls.type === 'lab' && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium mb-2 inline-block">
                          LAB
                        </span>
                      )}
                      {cls.odd_even && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium mb-2 inline-block ml-1">
                          {cls.odd_even} week
                        </span>
                      )}
                      <h4 className="font-bold text-slate-900 text-sm leading-tight mb-3">
                        {cls.course}
                      </h4>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{cls.teacher?.name || cls.teacher}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{cls.room}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
