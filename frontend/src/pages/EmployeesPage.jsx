import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Search, Filter, Plus, Edit2, Trash2, X, Upload, Store, MapPin } from 'lucide-react';

export default function EmployeesPage({ user }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [franchises, setFranchises] = useState([]);
  const [areas, setAreas] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  
  const [selectedFranchise, setSelectedFranchise] = useState(user?.franchise_id ? user.franchise_id.toString() : 'all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState({
    employee_id: '', 
    full_name: '', 
    role: 'Agent', 
    status: 'Active', 
    franchise_id: '', 
    area_id: '', 
    supervisor_id: '',
    contact_number: '',
    municipality: 'None',
    allowed_radius: '100',
    address: '',
    latitude: '',
    longitude: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Auto-generate employee ID
  useEffect(() => {
    if (modalMode === 'add' && formData.franchise_id && formData.area_id && franchises.length > 0 && areas.length > 0) {
      const franchise = franchises.find(f => f.id.toString() === formData.franchise_id.toString());
      const area = areas.find(a => a.id.toString() === formData.area_id.toString());
      
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
        if (formData.employee_id !== newEmployeeId) {
          setFormData(prev => ({...prev, employee_id: newEmployeeId}));
        }
      }
    }
  }, [formData.franchise_id, formData.area_id, modalMode, franchises, areas, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data: franchiseData } = await supabase.from('franchises').select('*');
      if (franchiseData) setFranchises(franchiseData);

      const { data: areaData } = await supabase.from('areas').select('*');
      if (areaData) setAreas(areaData);

      const { data: spvrData } = await supabase.from('supervisors').select('*');
      if (spvrData) setSupervisors(spvrData);

      const { data, error } = await supabase
        .from('employees')
        .select(`
          id, employee_id, full_name, role, status, franchise_id, area_id, supervisor_id,
          franchises (name),
          areas (name),
          supervisors (name, color)
        `)
        .order('full_name');
        
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFranchise = selectedFranchise === 'all' || emp.franchise_id?.toString() === selectedFranchise;
    const matchesArea = selectedArea === 'all' || emp.area_id?.toString() === selectedArea;
    const matchesStatus = selectedStatus === 'all' || emp.status?.toLowerCase() === selectedStatus.toLowerCase();
    
    return matchesSearch && matchesFranchise && matchesArea && matchesStatus;
  });

  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      employee_id: '', 
      full_name: '', 
      role: 'Agent', 
      status: 'Active',
      franchise_id: user?.franchise_id ? user.franchise_id.toString() : (franchises[0]?.id || ''), 
      area_id: areas[0]?.id || '', 
      supervisor_id: '',
      contact_number: '',
      municipality: 'None',
      allowed_radius: '100',
      address: '',
      latitude: '',
      longitude: ''
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setModalMode('edit');
    setFormData({
      employee_id: emp.employee_id || '', 
      full_name: emp.full_name || '',
      role: emp.role || 'Agent', 
      status: emp.status || 'Active',
      franchise_id: emp.franchise_id || '', 
      area_id: emp.area_id || '',
      supervisor_id: emp.supervisor_id || '',
      contact_number: emp.contact_number || '',
      municipality: emp.municipality || 'None',
      allowed_radius: emp.allowed_radius || '100',
      address: emp.address || '',
      latitude: emp.latitude || '',
      longitude: emp.longitude || ''
    });
    setEditingId(emp.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err.message);
      alert('Failed to delete employee.');
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }));
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Failed to get current location. Please check your browser permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        employee_id: formData.employee_id,
        full_name: formData.full_name,
        role: formData.role,
        status: formData.status,
        franchise_id: formData.franchise_id || null,
        area_id: formData.area_id || null,
        supervisor_id: formData.supervisor_id || null
      };

      if (modalMode === 'add') {
        const { error } = await supabase.from('employees').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employees').update(payload).eq('id', editingId);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error('Error saving employee:', err.message);
      alert('Failed to save employee. Check if new columns exist in database.');
    }
  };

  return (
    <div className="h-full bg-slate-900 overflow-y-auto custom-scrollbar p-8">
      <div className="w-full relative">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center gap-3">
              <Users className="text-emerald-500" size={32} />
              Personnel Directory
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Manage and view all registered tellers and agents</p>
          </div>
          
          <div className="flex gap-4 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800/80 border border-slate-700 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none w-64 shadow-inner"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`border hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm shadow-inner ${showFilters ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-700'}`}
            >
              <Filter size={16} className={showFilters ? 'text-emerald-400' : ''} /> Filter
            </button>
            <button onClick={openAddModal} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Plus size={16} /> Add Employee
            </button>

            {/* Filter Popover */}
            {showFilters && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-4">
                  {(!user || !user.franchise_id) && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Franchise</label>
                      <select 
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none p-2 cursor-pointer"
                        value={selectedFranchise}
                        onChange={(e) => setSelectedFranchise(e.target.value)}
                      >
                        <option value="all">All Franchises</option>
                        {franchises.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Area</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none p-2 cursor-pointer"
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                    >
                      <option value="all">All Areas</option>
                      {areas.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['all', 'active', 'inactive'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setSelectedStatus(status)}
                          className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                            selectedStatus === status 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-widest">
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Employee</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">ID Number</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Role</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Supervisor</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Area</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50 text-right">Status</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500 font-medium">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200">{emp.full_name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{emp.franchises?.name}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-400">{emp.employee_id}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-800 text-blue-400 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-700/50 font-bold">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: emp.supervisors?.color || '#cbd5e1' }}></div>
                          <span className="text-sm font-semibold text-slate-300">{emp.supervisors?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{emp.areas?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md font-bold ${
                          emp.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(emp)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(emp.id)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-400 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          >
            <div 
              className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    {modalMode === 'add' ? <Plus className="text-emerald-500" size={20} /> : <Edit2 className="text-blue-500" size={20} />}
                    {modalMode === 'add' ? 'Add New Employee' : 'Edit Employee'}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {modalMode === 'add' ? 'Create a new employee record' : 'Update existing employee record'}
                  </p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <form id="employee-form" onSubmit={handleSave} className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    {/* Employee ID */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Employee ID *</label>
                      <input
                        type="text"
                        required
                        value={formData.employee_id}
                        onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                        placeholder="e.g. EMP-101"
                      />
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                        placeholder="e.g. John Doe"
                      />
                    </div>

                    {/* Contact Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Number</label>
                      <input
                        type="text"
                        value={formData.contact_number || ''}
                        onChange={(e) => setFormData({...formData, contact_number: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                        placeholder="e.g. +639123456789"
                      />
                    </div>

                    {/* SPVR */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">SPVR *</label>
                      <select
                        required
                        value={formData.supervisor_id}
                        onChange={(e) => setFormData({...formData, supervisor_id: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none"
                      >
                        <option value="">Select Supervisor</option>
                        {supervisors
                          .filter(s => !formData.franchise_id || s.franchise_id?.toString() === formData.franchise_id)
                          .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Role *</label>
                      <select
                        required
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none"
                      >
                        <option value="Agent">Agent</option>
                        <option value="Reliever">Reliever</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status *</label>
                      <select
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Franchise */}
                    {(!user || !user.franchise_id) && (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Franchise *</label>
                        <select
                          required
                          value={formData.franchise_id}
                          onChange={(e) => setFormData({...formData, franchise_id: e.target.value, supervisor_id: '', municipality_id: ''})}
                          className="w-full bg-slate-900 border border-emerald-500 ring-1 ring-emerald-500/50 text-slate-200 px-4 py-2.5 rounded-xl outline-none transition-all appearance-none"
                        >
                          <option value="">Select Franchise</option>
                          {franchises.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Area Label */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Area Label *</label>
                      <select
                        required
                        value={formData.area_id}
                        onChange={(e) => setFormData({...formData, area_id: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none"
                      >
                        <option value="">Select Area</option>
                        {areas.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Municipality (Optional) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Municipality (Optional)</label>
                      <select
                        value={formData.municipality || 'None'}
                        onChange={(e) => setFormData({...formData, municipality: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none"
                      >
                        <option value="None">None</option>
                      </select>
                    </div>

                    {/* Allowed Radius (Meters) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Allowed Radius (Meters)</label>
                      <input
                        type="text"
                        value={formData.allowed_radius || '100'}
                        onChange={(e) => setFormData({...formData, allowed_radius: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                        placeholder="100"
                      />
                      <p className="text-[11px] text-slate-500 mt-1.5 font-medium">Default is 100 meters if left blank.</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Address</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                      placeholder="e.g. 123 Main St, City, Country"
                    />
                  </div>

                  {/* Image Uploads */}
                  <div className="grid grid-cols-3 gap-6 pt-4">
                    
                    {/* 2x2 Picture */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Employee 2x2 Picture</label>
                      <div className="border border-emerald-500/30 border-dashed bg-emerald-500/5 rounded-xl p-3 flex gap-3 h-[110px]">
                        <div className="w-[84px] h-[84px] bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl font-black text-slate-600">2x2</span>
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-xs font-bold text-slate-300">2x2 Picture</span>
                          <span className="text-[10px] text-slate-500 mt-0.5 leading-tight mb-2">Upload the employee's 2x2 photo.</span>
                          <button type="button" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors w-fit">
                            <Upload size={12} /> Upload
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Kiosk Location Image */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kiosk Location Image</label>
                      <div className="border border-slate-600 border-dashed rounded-xl p-3 flex items-center justify-center gap-4 h-[110px] bg-slate-800/50">
                        <div className="w-[72px] h-[72px] border border-slate-600 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-500">
                          <Store size={24} />
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-xs font-bold text-slate-300 mb-2">Kiosk Photo</span>
                          <button type="button" className="bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors w-fit">
                            <Upload size={12} /> Upload
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* GPS Screenshot */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">GPS Screenshot</label>
                      <div className="border border-slate-600 border-dashed rounded-xl p-3 flex items-center justify-center gap-4 h-[110px] bg-slate-800/50">
                        <div className="w-[72px] h-[72px] border border-slate-600 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-500">
                          <MapPin size={24} />
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="text-xs font-bold text-slate-300 leading-tight mb-2">GPS<br/>Screenshot</span>
                          <button type="button" className="bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors w-fit">
                            <Upload size={12} /> Upload
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* GPS Coordinates Section */}
                  <div className="pt-6 mt-6 border-t border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">GPS COORDINATES</h4>
                      <button 
                        type="button" 
                        onClick={handleGetLocation}
                        className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MapPin size={12} /> Use Current Location
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Latitude</label>
                        <input
                          type="text"
                          value={formData.latitude || ''}
                          onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                          placeholder="e.g. 14.5995"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Longitude</label>
                        <input
                          type="text"
                          value={formData.longitude || ''}
                          onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                          placeholder="e.g. 120.9842"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex gap-3 justify-end border-t border-slate-700/50 mt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700">
                      Cancel
                    </button>
                    <button type="submit" className="px-8 py-2.5 rounded-xl font-bold bg-emerald-500 text-slate-900 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors">
                      {modalMode === 'add' ? 'Save Employee' : 'Update Employee'}
                    </button>
                  </div>

                </form>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
