import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

export default function AlertModal({ isOpen, message, type = 'error', onClose }) {
  if (!isOpen) return null;
  
  const isError = type === 'error';
  const Icon = isError ? AlertTriangle : CheckCircle;
  const colorClass = isError ? 'text-rose-400' : 'text-emerald-400';
  const bgClass = isError ? 'bg-rose-500/20' : 'bg-emerald-500/20';
  const borderClass = isError ? 'border-rose-500/50' : 'border-emerald-500/50';
  const shadowClass = isError ? 'shadow-rose-500/20' : 'shadow-emerald-500/20';
  const btnClass = isError ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative bg-slate-800 border ${borderClass} rounded-2xl p-6 shadow-2xl ${shadowClass} max-w-md w-full text-center animate-in fade-in zoom-in duration-200`}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        <div className={`w-16 h-16 ${bgClass} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className={colorClass} size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-2">
          {isError ? 'Notice' : 'Success'}
        </h3>
        <p className="text-slate-400 mb-6">
          {message}
        </p>
        <button
          onClick={onClose}
          className={`w-full py-3 ${btnClass} text-white font-bold rounded-xl transition-colors`}
        >
          {isError ? 'Understood' : 'Okay'}
        </button>
      </div>
    </div>
  );
}
