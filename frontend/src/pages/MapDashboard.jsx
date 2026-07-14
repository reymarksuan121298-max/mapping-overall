import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import KioskMap from '../components/KioskMap';
import { MapPin, Users, Activity, Filter, Layers, Map as MapIcon, Shield, X, Search, ChevronDown, UserPlus, Save } from 'lucide-react';

export default function MapDashboard({ user }) {
  const [employees, setEmployees] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [areas, setAreas] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [supervisorLocations, setSupervisorLocations] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    employee_id: '',
    full_name: '',
    role: 'Agent',
    supervisor_id: '',
    franchise_id: '',
    area_id: '',
    municipality_id: '',
    address: '',
    status: 'Active'
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedFranchise, setSelectedFranchise] = useState(user?.franchise_id ? user.franchise_id.toString() : 'all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSupervisor, setSelectedSupervisor] = useState('all');
  const [isTacticalOpen, setIsTacticalOpen] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime location updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'supervisor_locations' },
        (payload) => {
          setSupervisorLocations(prev => {
            const newLoc = payload.new;
            // Update or add
            const idx = prev.findIndex(loc => loc.supervisor_id === newLoc.supervisor_id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = newLoc;
              return updated;
            } else {
              return [...prev, newLoc];
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Debounce search term to prevent rapid re-renders while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Auto-generate employee ID for new pins
  useEffect(() => {
    if (!editingEmployeeId && employeeFormData.franchise_id && employeeFormData.area_id && franchises.length > 0 && areas.length > 0) {
      const franchise = franchises.find(f => f.id.toString() === employeeFormData.franchise_id.toString());
      const area = areas.find(a => a.id.toString() === employeeFormData.area_id.toString());
      
      if (franchise && area) {
        let prefix = 'EMP';
        const fname = franchise.name.toUpperCase();
        if (fname.includes('5A')) prefix = '5A';
        else if (fname.includes('LUCKY BETPLAY') || fname.includes('LBP')) prefix = 'LB';
        else prefix = fname.split(' ').map(w => w[0]).join('').substring(0, 3);
        
        const areaPart = area.name.toUpperCase().replace(/\s+/g, '-');
        
        const matchingEmployees = employees.filter(e => e.employee_id && e.employee_id.startsWith(`${prefix}-${areaPart}-`));
        let maxSuffix = 0;
        matchingEmployees.forEach(e => {
          const parts = e.employee_id.split('-');
          const lastPart = parts[parts.length - 1];
          if (lastPart) {
            const num = parseInt(lastPart, 10);
            if (!isNaN(num) && num > maxSuffix) maxSuffix = num;
          }
        });
        
        const nextSuffix = (maxSuffix + 1).toString().padStart(5, '0');
        const newEmployeeId = `${prefix}-${areaPart}-${nextSuffix}`;
        
        // Only update if it actually changed to prevent infinite loops
        if (employeeFormData.employee_id !== newEmployeeId) {
          setEmployeeFormData(prev => ({...prev, employee_id: newEmployeeId}));
        }
      }
    }
  }, [employeeFormData.franchise_id, employeeFormData.area_id, editingEmployeeId, franchises, areas, employees]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Execute all independent queries concurrently to eliminate waterfall lag
      const [franchiseRes, areaRes, spvrRes, employeeRes, muniRes, locRes] = await Promise.all([
        supabase.from('franchises').select('*'),
        supabase.from('areas').select('*'),
        supabase.from('supervisors').select('*').order('name'),
        (async () => {
          let allData = [];
          let from = 0;
          let to = 999;
          while (true) {
            const { data, error } = await supabase.from('employees').select(`
              *,
              franchises (name),
              areas (name),
              supervisors (name, color)
            `).not('latitude', 'is', null).not('longitude', 'is', null).range(from, to);
            
            if (error) return { error };
            if (!data || data.length === 0) break;
            
            allData = allData.concat(data);
            
            if (data.length < 1000) break;
            from += 1000;
            to += 1000;
          }
          return { data: allData };
        })(),
        supabase.from('municipalities').select('*'),
        supabase.from('supervisor_locations').select('*')
      ]);

      let fData = franchiseRes.data || [];
      if (user?.role === 'franchise_admin') {
        fData = fData.filter(f => f.id === user.franchise_id);
      }
      setFranchises(fData);
      
      if (areaRes.data) setAreas(areaRes.data);
      let supervisorsData = spvrRes.data || [];
      if (user?.role === 'franchise_admin') {
        supervisorsData = supervisorsData.filter(s => s.franchise_id === user.franchise_id);
      }
      setSupervisors(supervisorsData);

      if (muniRes.data) setMunicipalities(muniRes.data);
      
      let locData = locRes.data || [];
      if (user?.role === 'franchise_admin') {
        const allowedSupervisorIds = new Set(supervisorsData.map(s => s.id));
        locData = locData.filter(l => allowedSupervisorIds.has(l.supervisor_id));
      }
      setSupervisorLocations(locData);
      
      if (employeeRes.error) throw employeeRes.error;
      
      let empData = employeeRes.data || [];
      if (user?.role === 'franchise_admin') {
        empData = empData.filter(e => e.franchise_id === user.franchise_id);
      }
      setEmployees(empData);
      
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!selectedLocation) return;
    
    setIsSaving(true);
    try {
      const payload = {
        ...employeeFormData,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        supervisor_id: employeeFormData.supervisor_id || null,
        franchise_id: employeeFormData.franchise_id || null,
        area_id: employeeFormData.area_id || null,
        municipality_id: employeeFormData.municipality_id || null
      };

      if (editingEmployeeId) {
        const { error } = await supabase.from('employees').update(payload).eq('id', editingEmployeeId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employees').insert([payload]);
        if (error) throw error;
      }
      
      setIsEmployeeModalOpen(false);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error saving employee:', err.message);
      alert('Failed to save employee.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    
    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      filtered = filtered.filter(e => 
        e.full_name?.toLowerCase().includes(lowerSearch) ||
        e.employee_id?.toLowerCase().includes(lowerSearch) ||
        e.supervisors?.name?.toLowerCase().includes(lowerSearch)
      );
    }
    
    if (selectedFranchise !== 'all') {
      filtered = filtered.filter(e => e.franchise_id?.toString() === selectedFranchise);
    }
    if (selectedArea !== 'all') {
      filtered = filtered.filter(e => e.area_id?.toString() === selectedArea);
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(e => e.status?.toLowerCase() === selectedStatus.toLowerCase());
    }
    if (selectedSupervisor !== 'all') {
      filtered = filtered.filter(e => e.supervisor_id?.toString() === selectedSupervisor);
    }
    
    return filtered;
  }, [employees, debouncedSearch, selectedFranchise, selectedArea, selectedStatus, selectedSupervisor]);

  const stats = useMemo(() => {
    let active = 0;
    let pending = 0;
    for (let i = 0; i < filteredEmployees.length; i++) {
      if (filteredEmployees[i].status === 'Active') active++;
      else pending++;
    }
    return {
      total: filteredEmployees.length,
      active,
      pending
    };
  }, [filteredEmployees]);

  const handleLocationSelected = useCallback((latlng) => {
    setSelectedLocation(latlng);
    setEditingEmployeeId(null);
    setEmployeeFormData({
      employee_id: '',
      full_name: '',
      role: 'Agent',
      supervisor_id: '',
      franchise_id: '',
      area_id: '',
      municipality_id: '',
      address: '',
      status: 'Active'
    });
    setIsAddingEmployee(false);
    setIsEmployeeModalOpen(true);
  }, []);

  const handleEditEmployee = useCallback((kiosk) => {
    setSelectedLocation({ lat: kiosk.latitude, lng: kiosk.longitude });
    setEditingEmployeeId(kiosk.id);
    setEmployeeFormData({
      employee_id: kiosk.employee_id || '',
      full_name: kiosk.full_name || '',
      role: kiosk.role || 'Agent',
      supervisor_id: kiosk.supervisor_id || '',
      franchise_id: kiosk.franchise_id || '',
      area_id: kiosk.area_id || '',
      municipality_id: kiosk.municipality_id || '',
      address: kiosk.address || '',
      status: kiosk.status || 'Active'
    });
    setIsEmployeeModalOpen(true);
  }, []);

  return (
    <div className="flex-1 flex flex-col relative h-full w-full bg-slate-900">
      
      {/* Map Container */}
      <div className="flex-1 w-full h-full relative z-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
              <p className="text-emerald-500 font-medium tracking-widest text-sm animate-pulse">LOADING MAP DATA...</p>
            </div>
          </div>
        ) : null}
        <KioskMap 
          kiosks={filteredEmployees} 
          isFiltered={selectedFranchise !== 'all' || selectedArea !== 'all' || selectedSupervisor !== 'all' || searchTerm !== ''}
          isAddingEmployee={isAddingEmployee} 
          onLocationSelected={handleLocationSelected}
          onEditEmployee={handleEditEmployee}
        />
      </div>

      {/* ADD EMP Button */}
      {!isAddingEmployee && (
        <button 
          onClick={() => setIsAddingEmployee(true)}
          className="absolute top-20 right-6 z-[1000] bg-slate-900/90 backdrop-blur-md border-[3px] border-emerald-500/50 hover:border-emerald-400 text-emerald-400 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all group"
        >
          <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
          <span className="font-black text-[11px] tracking-widest">ADD PIN</span>
        </button>
      )}

      {/* Pin Placement Mode Banner */}
      {isAddingEmployee && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 backdrop-blur-2xl rounded-full pl-4 pr-3 py-3 shadow-[0_15px_40px_rgba(0,0,0,0.7)] border border-slate-700 flex items-center gap-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <MapPin size={18} className="text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-slate-200">Click anywhere on the map to place the agent kiosk</span>
          </div>
          <button 
            onClick={() => setIsAddingEmployee(false)}
            className="bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-700 hover:border-rose-500/50 text-xs font-black uppercase tracking-widest px-6 py-3 rounded-full shadow-lg transition-all"
          >
            CANCEL
          </button>
        </div>
      )}

      {/* Tactical Button Toggle */}
      {!isTacticalOpen && (
        <button 
          onClick={() => setIsTacticalOpen(true)}
          className="absolute top-6 right-6 z-[1000] bg-slate-900/90 backdrop-blur-md border-[3px] border-emerald-500/50 hover:border-emerald-400 text-emerald-400 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all group"
        >
          <Shield size={20} className="group-hover:scale-110 transition-transform" />
          <span className="font-black text-[11px] tracking-widest">TACTICAL</span>
        </button>
      )}

      {/* Tactical View Floating Panel */}
      {isTacticalOpen && (
        <>
          <div 
            className="fixed inset-0 z-[990]" 
            onClick={() => setIsTacticalOpen(false)}
          />
          <div className="absolute top-4 right-4 w-[400px] bg-slate-900/95 backdrop-blur-2xl border border-slate-700 rounded-[2rem] shadow-[0_10px_50px_rgba(0,0,0,0.5)] z-[1000] flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-8 duration-300">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Shield size={20} />
              </div>
              <h2 className="text-lg font-black tracking-widest text-slate-100">TACTICAL VIEW</h2>
            </div>
            <button 
              onClick={() => setIsTacticalOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            
            {/* Search */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Employee Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Name, ID, supervisor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 pl-11 pr-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500 text-sm"
                />
              </div>
            </div>

            {/* Sector Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sector Filter</label>
              <div className="relative">
                <select 
                  className="w-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-sm rounded-2xl appearance-none outline-none py-3.5 px-4 cursor-pointer hover:bg-indigo-500/20 transition-colors"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                >
                  <option value="all" className="bg-slate-900 text-slate-200">Total Operations Selected</option>
                  {areas.map(a => (
                    <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">{a.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Franchise Filter */}
            {(!user || !user.franchise_id) && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Franchise Filter</label>
                <div className="relative">
                  <select 
                    className="w-full bg-pink-500/10 border border-pink-500/30 text-pink-300 font-bold text-sm rounded-2xl appearance-none outline-none py-3.5 px-4 cursor-pointer hover:bg-pink-500/20 transition-colors"
                    value={selectedFranchise}
                    onChange={(e) => {
                      setSelectedFranchise(e.target.value);
                      setSelectedSupervisor('all');
                    }}
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">All Franchises Selected</option>
                    {franchises.map(f => (
                      <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">{f.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none" size={16} />
                </div>
              </div>
            )}

            {/* Supervisor Filter - Only visible when a franchise is selected */}
            <div className={`transition-all duration-300 ${selectedFranchise === 'all' ? 'hidden opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Supervisor Filter</label>
                <div className="relative">
                  <select 
                    className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-sm rounded-2xl appearance-none outline-none py-3.5 px-4 cursor-pointer hover:bg-amber-500/20 transition-colors"
                    value={selectedSupervisor}
                    onChange={(e) => setSelectedSupervisor(e.target.value)}
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">All Supervisors Selected</option>
                    {supervisors
                      .filter(s => (s.franchise_id || s.franchise)?.toString() === selectedFranchise)
                      .map(s => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setSelectedStatus(selectedStatus === 'Active' ? 'all' : 'Active')}
                className={`p-5 rounded-3xl border transition-all ${
                  selectedStatus === 'Active' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-slate-800 border-slate-700 hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,1)]"></div>
                </div>
                <div className="text-3xl font-black text-slate-100 text-left">{stats.active}</div>
              </button>

              <button 
                onClick={() => setSelectedStatus(selectedStatus === 'Inactive' ? 'all' : 'Inactive')}
                className={`p-5 rounded-3xl border transition-all ${
                  selectedStatus === 'Inactive' ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]' : 'bg-slate-800 border-slate-700 hover:border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending</span>
                  <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_5px_rgba(251,113,133,1)]"></div>
                </div>
                <div className="text-3xl font-black text-slate-100 text-left">{stats.pending}</div>
              </button>
            </div>



          </div>
        </div>
        </>
      )}

      {/* Add Employee Modal */}
      {isEmployeeModalOpen && (
        <div 
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setIsEmployeeModalOpen(false)}
        >
          <div 
            className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <UserPlus className="text-emerald-500" size={20} />
                {editingEmployeeId ? 'Edit Employee Pin' : 'Add New Employee Pin'}
              </h3>
              <button type="button" onClick={() => setIsEmployeeModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEmployee} className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Employee ID</label>
                    <input
                      type="text"
                      required
                      value={employeeFormData.employee_id}
                      onChange={(e) => setEmployeeFormData({...employeeFormData, employee_id: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="e.g. 5A-LALA-001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={employeeFormData.full_name}
                      onChange={(e) => setEmployeeFormData({...employeeFormData, full_name: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="e.g. Juan Dela Cruz"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Supervisor (Color Theme)</label>
                    <div className="relative">
                      <select
                        value={employeeFormData.supervisor_id}
                        onChange={(e) => setEmployeeFormData({...employeeFormData, supervisor_id: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none"
                      >
                        <option value="">No Supervisor Selected</option>
                        {supervisors
                          .filter(s => !employeeFormData.franchise_id || s.franchise_id?.toString() === employeeFormData.franchise_id)
                          .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-600 shadow-sm" 
                           style={{ backgroundColor: supervisors.find(s => s.id.toString() === employeeFormData.supervisor_id)?.color || '#3b82f6' }}>
                      </div>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Role & Status</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={employeeFormData.role}
                        onChange={(e) => setEmployeeFormData({...employeeFormData, role: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      >
                        <option value="Agent">Agent</option>
                        <option value="Reliever">Reliever</option>
                      </select>
                      <select
                        value={employeeFormData.status}
                        onChange={(e) => setEmployeeFormData({...employeeFormData, status: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Franchise</label>
                    <select
                      value={employeeFormData.franchise_id}
                      onChange={(e) => setEmployeeFormData({...employeeFormData, franchise_id: e.target.value, supervisor_id: '', municipality_id: ''})}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Franchise</option>
                      {franchises.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Area & Municipality</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={employeeFormData.area_id}
                        onChange={(e) => setEmployeeFormData({...employeeFormData, area_id: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      >
                        <option value="">Area</option>
                        {areas.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <select
                        value={employeeFormData.municipality_id}
                        onChange={(e) => setEmployeeFormData({...employeeFormData, municipality_id: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      >
                        <option value="">Municipality</option>
                        {municipalities
                          .filter(m => !employeeFormData.franchise_id || m.franchise_id?.toString() === employeeFormData.franchise_id)
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Address / Exact Location</label>
                    <input
                      type="text"
                      value={employeeFormData.address}
                      onChange={(e) => setEmployeeFormData({...employeeFormData, address: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="e.g. Purok 1, Brgy. San Jose"
                    />
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 mt-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Coordinates</label>
                    <div className="flex gap-4 font-mono text-sm text-emerald-400">
                      <div><span className="text-slate-500 mr-1">LAT:</span>{selectedLocation?.lat.toFixed(6)}</div>
                      <div><span className="text-slate-500 mr-1">LNG:</span>{selectedLocation?.lng.toFixed(6)}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 mt-6 border-t border-slate-700 flex gap-4">
                <button type="button" onClick={() => setIsEmployeeModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSaving ? (
                    <span className="animate-pulse">Saving...</span>
                  ) : (
                    <>
                      <Save size={18} /> {editingEmployeeId ? 'Save Changes' : 'Add Employee Pin'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
