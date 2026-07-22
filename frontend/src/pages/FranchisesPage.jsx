import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Building2, Search, Filter, Plus, Edit2, Trash2, X } from 'lucide-react';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';

export default function FranchisesPage() {
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertState, setAlertState] = useState({ isOpen: false, message: '', type: 'error' });
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState({ name: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('franchises')
        .select(`
          id, name,
          employees (id)
        `)
        .order('name');
        
      if (error) throw error;
      
      const enrichedData = (data || []).map(franchise => ({
        ...franchise,
        employeeCount: franchise.employees ? franchise.employees.length : 0
      }));
      
      setFranchises(enrichedData);
    } catch (error) {
      console.error('Error fetching franchises:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredFranchises = franchises.filter(f => 
    f.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setModalMode('add');
    setFormData({ name: '' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (franchise) => {
    setModalMode('edit');
    setFormData({ name: franchise.name });
    setEditingId(franchise.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setConfirmState({
      isOpen: true,
      message: 'Are you sure you want to delete this franchise? All linked data may be affected.',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          const { error } = await supabase.from('franchises').delete().eq('id', id);
          if (error) throw error;
          setAlertState({ isOpen: true, message: 'Successfully deleted franchise!', type: 'success' });
          fetchFranchises();
        } catch (err) {
          console.error('Error deleting franchise:', err.message);
          setAlertState({ isOpen: true, message: 'Failed to delete franchise.', type: 'error' });
        }
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name
      };

      if (modalMode === 'add') {
        const { error } = await supabase.from('franchises').insert([payload]);
        if (error) throw error;
        setAlertState({ isOpen: true, message: 'Successfully added franchise!', type: 'success' });
      } else {
        const { error } = await supabase.from('franchises').update(payload).eq('id', editingId);
        if (error) throw error;
        setAlertState({ isOpen: true, message: 'Successfully updated franchise!', type: 'success' });
      }
      setIsModalOpen(false);
      fetchFranchises();
    } catch (err) {
      console.error('Error saving franchise:', err.message);
      let errorMsg = 'Failed to save franchise.';
      if (err.code === '23505' || err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
        errorMsg = 'A franchise with this name already exists.';
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
              <Building2 className="text-teal-500" size={32} />
              Franchise Management
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Manage operational franchises and monitor their workforce</p>
          </div>
          
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search franchises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800/80 border border-slate-700 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none w-64 shadow-inner"
              />
            </div>
            <button onClick={openAddModal} className="bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <Plus size={16} /> Add Franchise
            </button>
          </div>
        </header>

        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-widest">
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50">Franchise Name</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50 text-center">Total Employees</th>
                  <th className="px-6 py-4 font-bold border-b border-slate-700/50 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                    </td>
                  </tr>
                ) : filteredFranchises.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-slate-500 font-medium">
                      No franchises found.
                    </td>
                  </tr>
                ) : (
                  filteredFranchises.map(franchise => (
                    <tr key={franchise.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200 text-base">{franchise.name}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-800 text-teal-400 px-3 py-1.5 rounded-lg text-sm font-black border border-slate-700 shadow-inner">
                          {franchise.employeeCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(franchise)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(franchise.id)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-400 transition-colors">
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
                  {modalMode === 'add' ? 'Add Franchise' : 'Edit Franchise'}
                </h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Franchise Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="e.g. Lucky Betplay"
                  />
                </div>
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
      </div>

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
  );
}
