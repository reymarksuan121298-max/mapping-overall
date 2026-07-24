import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { UserCog, Search, Filter, Plus, Edit2, Trash2, X } from 'lucide-react';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';

export default function SupervisorsPage({ user }) {
  const [supervisors, setSupervisors] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [alertState, setAlertState] = useState({ isOpen: false, message: '', type: 'error' });
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });

  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState({ name: '', color: '#3b82f6', franchise_id: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchSupervisors();
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    const { data } = await supabase.from('franchises').select('*');
    if (data) setFranchises(data);
  };

  const fetchSupervisors = async () => {
    setLoading(true);
    try {
      const [supervisorsRes, employeesRes] = await Promise.all([
        supabase
          .from('supervisors')
          .select(`
            id, name, color, franchise_id,
            franchises (name)
          `)
          .order('name'),
        (async () => {
          let allData = [];
          let from = 0;
          let to = 999;
          while (true) {
            const { data, error } = await supabase
              .from('employees')
              .select('id, supervisor_id')
              .range(from, to);
            
            if (error) return { error };
            if (!data || data.length === 0) break;
            
            allData = allData.concat(data);
            
            if (data.length < 1000) break;
            from += 1000;
            to += 1000;
          }
          return { data: allData };
        })()
      ]);
        
      if (supervisorsRes.error) throw supervisorsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      
      const employeeCounts = {};
      (employeesRes.data || []).forEach(emp => {
        if (emp.supervisor_id) {
          employeeCounts[emp.supervisor_id] = (employeeCounts[emp.supervisor_id] || 0) + 1;
        }
      });
      
      let enrichedData = (supervisorsRes.data || []).map(spvr => ({
        ...spvr,
        employeeCount: employeeCounts[spvr.id] || 0
      }));
      
      if (user?.role === 'franchise_admin') {
        enrichedData = enrichedData.filter(s => s.franchise_id === user.franchise_id);
      }
      
      setSupervisors(enrichedData);
    } catch (error) {
      console.error('Error fetching supervisors:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSupervisors = supervisors.filter(spvr => {
    const matchesSearch = spvr.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFranchise = selectedFranchiseFilter === 'all' || (spvr.franchise_id || spvr.franchise)?.toString() === selectedFranchiseFilter;
    return matchesSearch && matchesFranchise;
  });

  const openAddModal = () => {
    setModalMode('add');
    setFormData({ name: '', color: '#3b82f6', franchise_id: user?.franchise_id ? user.franchise_id.toString() : (franchises[0]?.id || '') });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (spvr) => {
    setModalMode('edit');
    setFormData({ name: spvr.name, color: spvr.color || '#3b82f6', franchise_id: spvr.franchise_id || '' });
    setEditingId(spvr.id);
    setIsModalOpen(true);
  };

  const handleDeleteSupervisor = (item) => {
    setConfirmState({
      isOpen: true,
      message: 'Are you sure you want to delete this supervisor?',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          const { error } = await supabase.from('supervisors').delete().eq('id', item.id);
          if (error) throw error;
          setAlertState({ isOpen: true, message: 'Successfully deleted supervisor!', type: 'success' });
          fetchSupervisors();
        } catch (err) {
          console.error('Error deleting supervisor:', err.message);
          setAlertState({ isOpen: true, message: 'Failed to delete supervisor.', type: 'error' });
        }
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSupervisors.length && filteredSupervisors.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSupervisors.map(s => s.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmState({
      isOpen: true,
      message: `Are you sure you want to delete ${selectedIds.length} supervisor(s)?`,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          const { error } = await supabase.from('supervisors').delete().in('id', selectedIds);
          if (error) throw error;
          setSelectedIds([]);
          setAlertState({ isOpen: true, message: 'Successfully deleted supervisors!', type: 'success' });
          fetchSupervisors();
        } catch (err) {
          console.error('Error deleting supervisors:', err.message);
          setAlertState({ isOpen: true, message: 'Failed to delete supervisors.', type: 'error' });
        }
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        color: formData.color,
        franchise_id: formData.franchise_id || null
      };

      if (modalMode === 'add') {
        const { error } = await supabase.from('supervisors').insert([payload]);
        if (error) throw error;
        setAlertState({ isOpen: true, message: 'Successfully added supervisor!', type: 'success' });
      } else {
        const { error } = await supabase.from('supervisors').update(payload).eq('id', editingId);
        if (error) throw error;
        setAlertState({ isOpen: true, message: 'Successfully updated supervisor!', type: 'success' });
      }
      setIsModalOpen(false);
      fetchSupervisors();
    } catch (err) {
      console.error('Error saving supervisor:', err.message);
      let errorMsg = 'Failed to save supervisor.';
      if (err.code === '23505' || err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
        errorMsg = 'A supervisor with this name already exists in this franchise.';
      }
      setAlertState({ isOpen: true, message: errorMsg, type: 'error' });
    }
  };

  return (
    <div className="h-full bg-slate-900 overflow-y-auto custom-scrollbar p-8">
      <div className="w-full relative">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500 flex items-center gap-3">
              <UserCog className="text-teal-500" size={32} />
              Supervisor Management
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Manage supervisors and monitor their assigned tellers</p>
          </div>
          
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search supervisors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800/80 border border-slate-700 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none w-64 shadow-inner"
              />
            </div>
            {selectedIds.length > 0 && (
              <button 
                onClick={handleDeleteSelected}
                className="bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm shadow-inner animate-in fade-in zoom-in duration-200"
              >
                <Trash2 size={16} /> Delete Selected ({selectedIds.length})
              </button>
            )}
            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`border hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm shadow-inner ${showFilters ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-700'}`}
              >
                <Filter size={16} className={showFilters ? 'text-teal-400' : ''} /> Filter
              </button>

              {/* Filter Popover */}
              {showFilters && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-4">
                    {(!user || !user.franchise_id) && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Franchise</label>
                        <select 
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none p-2 cursor-pointer"
                          value={selectedFranchiseFilter}
                          onChange={(e) => setSelectedFranchiseFilter(e.target.value)}
                        >
                          <option value="all">All Franchises</option>
                          {franchises.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={openAddModal} className="bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <Plus size={16} /> Add Supervisor
            </button>
          </div>
        </header>

        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-widest">
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-800 cursor-pointer"
                      checked={filteredSupervisors.length > 0 && selectedIds.length === filteredSupervisors.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50 w-16 text-center">Avatar</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Supervisor Name</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Franchise</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50 text-center">Assigned Tellers</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                    </td>
                  </tr>
                ) : filteredSupervisors.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                      No supervisors found.
                    </td>
                  </tr>
                ) : (
                  filteredSupervisors.map(spvr => (
                    <tr key={spvr.id} className={`hover:bg-slate-800/40 transition-colors group ${selectedIds.includes(spvr.id) ? 'bg-teal-500/5' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-800 cursor-pointer"
                          checked={selectedIds.includes(spvr.id)}
                          onChange={() => toggleSelect(spvr.id)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg mx-auto shadow-md"
                          style={{ backgroundColor: spvr.color || '#3b82f6' }}
                        >
                          {spvr.name.charAt(0)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200 text-base">{spvr.name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: spvr.color || '#cbd5e1' }}></div>
                          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold" style={{ color: spvr.color }}>Color Theme</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-300">
                        {spvr.franchises?.name || <span className="text-slate-500 italic">No Franchise</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-800 text-teal-400 px-3 py-1.5 rounded-lg text-sm font-black border border-slate-700 shadow-inner">
                          {spvr.employeeCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(spvr)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteSupervisor(spvr)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-400 transition-colors">
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
              className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  {modalMode === 'add' ? <Plus className="text-teal-500" size={20} /> : <Edit2 className="text-blue-500" size={20} />}
                  {modalMode === 'add' ? 'Add Supervisor' : 'Edit Supervisor'}
                </h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Color Theme</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      required
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="text-sm text-slate-400 font-mono uppercase">{formData.color}</span>
                  </div>
                </div>
                {(!user || !user.franchise_id) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Franchise</label>
                    <select
                      value={formData.franchise_id}
                      onChange={(e) => setFormData({...formData, franchise_id: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Franchise</option>
                      {franchises.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2.5 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold py-2.5 rounded-xl transition-colors shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                    {modalMode === 'add' ? 'Create' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <AlertModal 
          isOpen={alertState.isOpen} 
          message={alertState.message} 
          type={alertState.type} 
          onClose={() => setAlertState({ ...alertState, isOpen: false })} 
        />
        <ConfirmModal 
          isOpen={confirmState.isOpen} 
          message={confirmState.message} 
          onConfirm={confirmState.onConfirm} 
          onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} 
        />
      </div>
    </div>
  );
}
