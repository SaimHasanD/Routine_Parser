import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Calendar, BookOpen } from 'lucide-react';
import RoutineTable from '../components/RoutineTable.jsx';
import { healthCheck, fetchGroups, fetchRoutine } from '../services/api.js';




export default function DashboardScreen() {
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [routine, setRoutine] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serverWaking, setServerWaking] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const dropdownRef = useRef(null);

  // Wake server + load groups on mount
  useEffect(() => {
    async function init() {
      setServerWaking(true);
      try {
        await healthCheck();
        const data = await fetchGroups();
        setGroups(data.groups || []);
      } catch (err) {
        console.error("Init error", err);
        setGroups([]);
      } finally {
        setServerWaking(false);
      }
    }
    init();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredGroups = groups.filter(g =>
    g.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGenerateRoutine = async () => {
    if (!selectedGroup) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await fetchRoutine(selectedGroup);
      setRoutine(data.entries || []);
    } catch (err) {
      console.error("Fetch routine error", err);
      setRoutine([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-12">
          <Calendar className="w-64 h-64" />
        </div>
        <span className="text-xs bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-full font-semibold tracking-wider uppercase">
          Department of CSE
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-slate-50">
          Northern University Bangladesh
        </h1>
        <p className="text-slate-300 text-sm mt-1 font-medium">
          ECSE Class Routine — Summer 2025
        </p>

        {serverWaking && (
          <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Waking server... (~30s on first load)
          </div>
        )}
      </div>

      {/* Group Selector */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full relative" ref={dropdownRef}>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Select Section / Group
          </label>
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl flex justify-between items-center cursor-pointer hover:border-slate-300 transition-colors"
          >
            <span className={selectedGroup ? "text-slate-900 font-medium" : "text-slate-400"}>
              {selectedGroup ? `Section ${selectedGroup}` : "Choose a section..."}
            </span>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>

          {isOpen && (
            <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-hidden flex flex-col">
              <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter sections..."
                  className="w-full bg-transparent px-2 py-1.5 text-sm outline-none text-slate-800"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="overflow-y-auto max-h-48 divide-y divide-slate-50">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div
                      key={group}
                      onClick={() => {
                        setSelectedGroup(group);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className="px-4 py-2.5 text-sm hover:bg-indigo-50 text-slate-700 font-medium cursor-pointer transition-colors"
                    >
                      Section {group}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-xs text-center text-slate-400">No matching sections found</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleGenerateRoutine}
          disabled={!selectedGroup || loading}
          className={`w-full md:w-auto px-8 py-3.5 font-semibold rounded-xl tracking-wide whitespace-nowrap transition-all shadow-sm ${
            selectedGroup && !loading
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {loading ? 'Loading...' : 'Generate Routine'}
        </button>
      </div>

      {/* Routine Output */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm">
            Parsing schedule for Section {selectedGroup}...
          </p>
        </div>
      ) : hasSearched && routine.length > 0 ? (
        <RoutineTable routine={routine} selectedGroup={selectedGroup} />
      ) : hasSearched ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">
            No routine available for this section yet.
          </p>
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
          <p className="text-slate-400 text-sm font-medium">
            Select your section above to load your class schedule.
          </p>
        </div>
      )}
    </div>
  );
}
