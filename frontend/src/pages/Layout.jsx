import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Layout({ user, onLogout }) {
  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden font-sans text-slate-100">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex-1 overflow-hidden relative">
        <Outlet />
      </div>
    </div>
  );
}
