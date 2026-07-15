import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, Users, UserCog, Clock, Home, Activity, Building2, MapPin, LandPlot, LogOut, Menu } from 'lucide-react';

export default function Sidebar({ user, onLogout, setIsSidebarOpen }) {
  let navItems = [
    { name: 'Live Map', path: '/map', icon: <Map size={18} /> },
    { name: 'Live Tracking', path: '/realtime', icon: <Activity size={18} /> },
    { name: 'Employees', path: '/employees', icon: <Users size={18} /> },
    { name: 'Supervisors', path: '/supervisors', icon: <UserCog size={18} /> },
    { name: 'Franchises', path: '/franchises', icon: <Building2 size={18} /> },
    { name: 'Areas', path: '/areas', icon: <MapPin size={18} /> },
    { name: 'Municipalities', path: '/municipalities', icon: <LandPlot size={18} /> },
  ];

  if (user?.role === 'franchise_admin') {
    navItems = navItems.filter(item => item.name !== 'Franchises' && item.name !== 'Municipalities');
  }

  return (
    <aside className="w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-20 relative">
      <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] flex-shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-wide leading-tight">KioskMap</h2>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">V2 Dashboard</p>
          </div>
        </div>
        {setIsSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white p-1">
            <Menu size={24} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">Main Menu</h3>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsSidebarOpen && setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-slate-800/80 text-emerald-400 shadow-[inset_2px_0_0_0_rgba(52,211,153,1)]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`
            }
          >
            {item.icon}
            <span className="font-semibold text-sm">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800/50">
        <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-700/50 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-slate-300">
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
              </span>
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-200 truncate">{user?.name || 'Admin User'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.franchise_name || 'System Administrator'}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Sign Out"
            className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors border border-transparent hover:border-rose-500/30"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
