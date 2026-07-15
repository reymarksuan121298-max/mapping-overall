import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Menu } from 'lucide-react';

export default function Layout({ user, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden font-sans text-slate-100 relative">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar with mobile toggle */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar user={user} onLogout={onLogout} setIsSidebarOpen={setIsSidebarOpen} />
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col w-full h-full min-w-0">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-20 p-2 md:hidden bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl text-white shadow-lg hover:bg-slate-800 transition-colors"
        >
          <Menu size={24} />
        </button>
        <Outlet />
      </div>
    </div>
  );
}
