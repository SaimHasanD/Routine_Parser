import React, { useState, useEffect } from 'react';
import UploadScreen from './screens/UploadScreen.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';

function getInitialRoute() {
  const p = window.location.pathname;
  if (p === '/admin') return '/admin';
  return '/';
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(getInitialRoute);

  useEffect(() => {
    const handleLocationChange = () => setCurrentRoute(getInitialRoute());
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentRoute(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            N
          </div>
          <span className="font-bold text-slate-900 tracking-tight">NUB Routine Hub by NUBmap</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.open('https://rajdip27.github.io/NUB-Cover-Page/', '_blank')}
            className="text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors"
          >
            NUB Cover Page
          </button>

          <button
            onClick={() => navigate(currentRoute === '/admin' ? '/' : '/admin')}
            className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
          >
            {currentRoute === '/admin' ? 'Public Portal' : 'Admin Panel'}
          </button>
        </div>
      </nav>

      {/* Screen Router */}
      <main className="container mx-auto px-4 py-8 max-w-6xl flex-grow w-full">
        {currentRoute === '/admin' ? <UploadScreen /> : <DashboardScreen />}
      </main>

      {/* Footer */}
      <footer className="bg-[#1e1b52] py-12 mt-auto w-full">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col items-center justify-center text-center">
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-6">A NUBmap utility.</h2>
          <a
            href="https://nubmap.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#1e1b52] bg-[#f5f5dc] hover:bg-[#e8e8ce] px-6 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            Visit NUBmap
          </a>
        </div>
      </footer>
    </div>
  );
}
