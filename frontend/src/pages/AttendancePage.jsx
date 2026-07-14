import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Clock, Search, Calendar as CalendarIcon, Filter } from 'lucide-react';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id, scan_time, status, scan_source, distance_meters,
          employees (full_name, employee_id, role)
        `)
        .order('scan_time', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendance = attendance.filter(log => 
    log.employees?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.employees?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full bg-slate-900 overflow-y-auto custom-scrollbar p-8">
      <div className="w-full">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center gap-3">
              <Clock className="text-blue-500" size={32} />
              Attendance Logs
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Real-time tracking of employee check-ins and check-outs</p>
          </div>
          
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800/80 border border-slate-700 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64 shadow-inner"
              />
            </div>
            <button className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm shadow-inner">
              <CalendarIcon size={16} /> Today
            </button>
            <button className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm shadow-inner">
              <Filter size={16} /> Filter
            </button>
          </div>
        </header>

        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-widest">
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Employee</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Date</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Time</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Type</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Proximity</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Device ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </td>
                  </tr>
                ) : filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                      No attendance logs found.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200">{log.employees?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{log.employees?.employee_id}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">{formatDate(log.scan_time)}</td>
                      <td className="px-6 py-4 font-mono text-slate-400 font-semibold">{formatTime(log.scan_time)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg font-bold ${
                          log.status === 'On Duty' || log.status === 'Time In' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          {log.status || 'On Duty'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${log.distance_meters > 200 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {log.distance_meters ? `${log.distance_meters.toFixed(1)}m` : 'N/A'}
                          </span>
                          {log.distance_meters > 200 && (
                            <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-sm uppercase font-black">Out of bounds</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 truncate max-w-[150px]">
                        {log.scan_source || 'Unknown Device'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
