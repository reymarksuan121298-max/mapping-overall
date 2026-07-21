import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Users, UserCheck, UserX, MapPin, Activity } from 'lucide-react';

export default function DashboardPage({ user }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    withGps: 0
  });

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const getCount = async (statusFilter, gpsFilter) => {
        let query = supabase.from('employees').select('*', { count: 'exact', head: true });
        
        if (user?.role === 'franchise_admin' && user?.franchise_id) {
          query = query.eq('franchise_id', user.franchise_id);
        }
        
        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }
        
        if (gpsFilter) {
          query = query.not('latitude', 'is', null).not('longitude', 'is', null);
        }
        
        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
      };

      const [total, active, inactive, withGps] = await Promise.all([
        getCount(null, false),
        getCount('Active', false),
        getCount('Inactive', false),
        getCount(null, true)
      ]);

      setStats({ total, active, inactive, withGps });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Employees',
      value: stats.total,
      icon: <Users size={24} className="text-blue-400" />,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      title: 'With GPS Location',
      value: stats.withGps,
      icon: <MapPin size={24} className="text-amber-400" />,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    }
  ];

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex justify-between items-center z-10 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Activity className="text-emerald-400" />
            Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Overview of employee metrics
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, idx) => (
              <div 
                key={idx}
                className={`relative overflow-hidden rounded-2xl ${card.bg} border ${card.border} p-6 shadow-lg transition-transform hover:scale-[1.02] duration-300`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                    {card.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-slate-400 text-sm font-medium mb-1">{card.title}</h3>
                  <div className="text-3xl font-bold text-slate-100 tracking-tight">
                    {card.value.toLocaleString()}
                  </div>
                </div>
                
                {/* Decorative background circle */}
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
