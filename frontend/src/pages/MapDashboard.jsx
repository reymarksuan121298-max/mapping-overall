import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import KioskMap from '../components/KioskMap';
import { MapPin, Users, Activity, Filter, Layers, Map as MapIcon, Shield, X, Search, ChevronDown, UserPlus, Save, Upload, Store, AlertTriangle, Sparkles } from 'lucide-react';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';

function isValidLatLng(lat, lng) {
  if (lat == null || lng == null || lat === '' || lng === '') return false;
  const pLat = parseFloat(lat);
  const pLng = parseFloat(lng);
  return !isNaN(pLat) && !isNaN(pLng);
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const l1 = parseFloat(lat1);
  const n1 = parseFloat(lon1);
  const l2 = parseFloat(lat2);
  const n2 = parseFloat(lon2);
  if (isNaN(l1) || isNaN(n1) || isNaN(l2) || isNaN(n2)) return null;

  const R = 6371000;
  const dLat = (l2 - l1) * Math.PI / 180;
  const dLon = (n2 - n1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function MapDashboard({ user }) {
  const [employees, setEmployees] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [areas, setAreas] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [supervisorLocations, setSupervisorLocations] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [autoOpenKiosk, setAutoOpenKiosk] = useState(null);
  const [newEmployeeBanner, setNewEmployeeBanner] = useState(null);

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
    status: 'Active',
    photo_url: '',
    id_photo_url: '',
    coordinate_screenshot_url: ''
  });

  const [uploading, setUploading] = useState({
    photo_url: false,
    id_photo_url: false,
    coordinate_screenshot_url: false
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedFranchise, setSelectedFranchise] = useState(user?.franchise_id ? user.franchise_id.toString() : 'all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSupervisor, setSelectedSupervisor] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isTacticalOpen, setIsTacticalOpen] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [alertState, setAlertState] = useState({ isOpen: false, message: '', type: 'error' });
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });

  useEffect(() => {
    fetchData();

    // Subscribe to realtime location updates
    const locChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'supervisor_locations' },
        (payload) => {
          setSupervisorLocations(prev => {
            const newLoc = payload.new;
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

    // Subscribe to realtime employee changes across all logins / franchises
    const empChannel = supabase
      .channel('realtime-employees-map-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: newEmp, error } = await supabase
              .from('employees')
              .select(`
                *,
                franchises (name),
                areas (name),
                supervisors (name, color)
              `)
              .eq('id', payload.new.id)
              .maybeSingle();

            if (!error && newEmp) {
              // Check franchise access if user is franchise admin
              if (user?.role === 'franchise_admin' && user?.franchise_id && newEmp.franchise_id !== user.franchise_id) {
                return;
              }

              setEmployees(prev => {
                if (prev.some(e => e.id === newEmp.id)) {
                  return prev.map(e => e.id === newEmp.id ? newEmp : e);
                }
                return [newEmp, ...prev];
              });

              // Automatically pop card popup and center map across all franchise logins!
              setAutoOpenKiosk({ ...newEmp, _t: Date.now() });
              setNewEmployeeBanner(newEmp);
            }
          } else if (payload.eventType === 'UPDATE') {
            const { data: updatedEmp } = await supabase
              .from('employees')
              .select(`
                *,
                franchises (name),
                areas (name),
                supervisors (name, color)
              `)
              .eq('id', payload.new.id)
              .maybeSingle();

            if (updatedEmp) {
              setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
            }
          } else if (payload.eventType === 'DELETE') {
            setEmployees(prev => prev.filter(e => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locChannel);
      supabase.removeChannel(empChannel);
    };
  }, [user]);

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
        else if (fname.includes('GLOWING FORTUNE') || fname.includes('GF')) prefix = 'GF';
        else prefix = fname.split(' ').map(w => w[0]).join('').substring(0, 3);
        
        const areaPart = area.name.toUpperCase().replace(/\s+/g, '-');
        
        // Count existing employees in this specific area to generate sequence
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
            `).range(from, to);
            
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

  const handleFileUpload = async (event, fieldName) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setUploading(prev => ({ ...prev, [fieldName]: true }));

      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeFormData.employee_id || 'new'}-${fieldName}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employees')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
          throw new Error('Storage bucket "employees" does not exist. Please create a public bucket named "employees" in Supabase Storage.');
        }
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('employees')
        .getPublicUrl(filePath);

      setEmployeeFormData(prev => ({ ...prev, [fieldName]: data.publicUrl }));
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setAlertState({ isOpen: true, message: error.message || 'Error uploading image.', type: 'error' });
    } finally {
      setUploading(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const checkGeofence = async (lat, lng) => {
    const query = `[out:json];(node["amenity"="school"](around:100,${lat},${lng});way["amenity"="school"](around:100,${lat},${lng});relation["amenity"="school"](around:100,${lat},${lng});node["amenity"="place_of_worship"](around:100,${lat},${lng});way["amenity"="place_of_worship"](around:100,${lat},${lng});relation["amenity"="place_of_worship"](around:100,${lat},${lng}););out body;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.elements && data.elements.length > 0) {
        const isSchool = data.elements.some(e => e.tags && e.tags.amenity === 'school');
        const isChurch = data.elements.some(e => e.tags && e.tags.amenity === 'place_of_worship');
        return { restricted: true, isSchool, isChurch };
      }
      return { restricted: false };
    } catch (err) {
      console.error("Overpass API error:", err);
      return { restricted: false, error: true };
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!selectedLocation) return;
    
    setIsSaving(true);
    try {
      const { allowed_radius, ...restFormData } = employeeFormData;
      const payload = {
        ...restFormData,
        radius_meters: parseInt(allowed_radius || '100', 10) || 100,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        supervisor_id: employeeFormData.supervisor_id || null,
        franchise_id: employeeFormData.franchise_id || null,
        area_id: employeeFormData.area_id || null,
        municipality_id: employeeFormData.municipality_id || null,
        photo_url: employeeFormData.photo_url || null,
        id_photo_url: employeeFormData.id_photo_url || null,
        coordinate_screenshot_url: employeeFormData.coordinate_screenshot_url || null
      };

      if (!editingEmployeeId && selectedLocation.lat && selectedLocation.lng) {
        const geoCheck = await checkGeofence(selectedLocation.lat, selectedLocation.lng);
        if (geoCheck.restricted) {
          const placeType = geoCheck.isSchool && geoCheck.isChurch ? 'a school and a church' : geoCheck.isSchool ? 'a school' : 'a church';
          setAlertState({ isOpen: true, message: `Cannot add employee: The selected location is within 100 meters of ${placeType}.`, type: 'error' });
          setIsSaving(false);
          return;
        }
      }

      if (editingEmployeeId) {
        const { error } = await supabase.from('employees').update(payload).eq('id', editingEmployeeId);
        if (error) throw error;
        setAlertState({ isOpen: true, message: 'Successfully updated employee!', type: 'success' });
      } else {
        const { data: insertedData, error } = await supabase
          .from('employees')
          .insert([payload])
          .select(`
            *,
            franchises (name),
            areas (name),
            supervisors (name, color)
          `);
        if (error) throw error;
        setAlertState({ isOpen: true, message: 'Successfully added employee!', type: 'success' });

        if (insertedData && insertedData[0]) {
          const newEmp = insertedData[0];
          setEmployees(prev => [newEmp, ...prev.filter(e => e.id !== newEmp.id)]);
          setAutoOpenKiosk({ ...newEmp, _t: Date.now() });
          setNewEmployeeBanner(newEmp);
        }
      }
      
      setIsEmployeeModalOpen(false);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error saving employee:', err.message);
      let errorMsg = 'Failed to save employee.';
      if (err.code === '23505' || err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
        errorMsg = 'An employee with this name already exists in this franchise.';
      }
      setAlertState({ isOpen: true, message: errorMsg, type: 'error' });
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
    if (selectedRole !== 'all') {
      filtered = filtered.filter(e => e.role?.toLowerCase() === selectedRole.toLowerCase());
    }

    if (autoOpenKiosk && !filtered.some(e => e.id === autoOpenKiosk.id)) {
      const target = employees.find(e => e.id === autoOpenKiosk.id);
      if (target) {
        filtered = [target, ...filtered];
      }
    }
    
    return filtered;
  }, [employees, debouncedSearch, selectedFranchise, selectedArea, selectedStatus, selectedSupervisor, selectedRole, autoOpenKiosk]);

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

  const newRadius = parseInt(employeeFormData.allowed_radius || '100', 10) || 100;

  const interceptingEmployees = useMemo(() => {
    if (!selectedLocation || selectedLocation.lat == null || selectedLocation.lng == null) return [];
    const curLat = parseFloat(selectedLocation.lat);
    const curLng = parseFloat(selectedLocation.lng);
    if (isNaN(curLat) || isNaN(curLng)) return [];

    const intercepts = [];
    employees.forEach(emp => {
      if (isValidLatLng(emp.latitude, emp.longitude) && emp.id !== editingEmployeeId) {
        const dist = calculateDistanceMeters(curLat, curLng, emp.latitude, emp.longitude);
        const empRadius = parseInt(emp.radius_meters || emp.allowed_radius || '100', 10) || 100;
        const sumRadius = newRadius + empRadius;

        if (dist !== null && dist <= sumRadius) {
          intercepts.push({
            ...emp,
            distance: dist,
            newRadius,
            empRadius,
            sumRadius,
            overlap: sumRadius - dist
          });
        }
      }
    });

    return intercepts.sort((a, b) => a.distance - b.distance);
  }, [selectedLocation, employees, editingEmployeeId, newRadius]);

  const nearestExistingEmployee = useMemo(() => {
    if (!selectedLocation || selectedLocation.lat == null || selectedLocation.lng == null) return null;
    const curLat = parseFloat(selectedLocation.lat);
    const curLng = parseFloat(selectedLocation.lng);
    if (isNaN(curLat) || isNaN(curLng)) return null;

    let minDistance = Infinity;
    let nearest = null;

    employees.forEach(emp => {
      if (isValidLatLng(emp.latitude, emp.longitude) && emp.id !== editingEmployeeId) {
        const dist = calculateDistanceMeters(curLat, curLng, emp.latitude, emp.longitude);
        if (dist !== null && dist < minDistance) {
          minDistance = dist;
          nearest = { ...emp, distance: dist };
        }
      }
    });

    return nearest;
  }, [selectedLocation, employees, editingEmployeeId]);

  const handleLocationSelected = useCallback((latlng) => {
    setSelectedLocation(latlng);
    setEditingEmployeeId(null);
    setEmployeeFormData({
      employee_id: '',
      full_name: '',
      role: 'Agent',
      supervisor_id: '',
      franchise_id: user?.franchise_id ? user.franchise_id.toString() : '',
      area_id: '',
      municipality_id: '',
      address: '',
      status: 'Active',
      allowed_radius: '100',
      photo_url: '',
      id_photo_url: '',
      coordinate_screenshot_url: ''
    });
    setIsAddingEmployee(false);
    setIsEmployeeModalOpen(true);
  }, []);

  const handleRemoveSelectedLocation = useCallback(() => {
    setSelectedLocation(null);
    setIsEmployeeModalOpen(false);
    setIsAddingEmployee(false);
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
      status: kiosk.status || 'Active',
      allowed_radius: (kiosk.radius_meters || kiosk.allowed_radius || 100).toString(),
      photo_url: kiosk.photo_url || '',
      id_photo_url: kiosk.id_photo_url || '',
      coordinate_screenshot_url: kiosk.coordinate_screenshot_url || ''
    });
    setIsEmployeeModalOpen(true);
  }, []);

  const handleDeleteEmployee = useCallback((kiosk) => {
    setConfirmState({
      isOpen: true,
      message: `Are you sure you want to delete ${kiosk.full_name}?`,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          const { error } = await supabase.from('employees').delete().eq('id', kiosk.id);
          if (error) throw error;
          setAlertState({ isOpen: true, message: 'Successfully deleted employee!', type: 'success' });
          fetchData(); // Refresh data
        } catch (err) {
          console.error('Error deleting employee:', err.message);
          setAlertState({ isOpen: true, message: 'Failed to delete employee.', type: 'error' });
        }
      }
    });
  }, [fetchData]);

  const handleToggleStatus = useCallback(async (kiosk) => {
    const newStatus = kiosk.status === 'Active' ? 'Inactive' : 'Active';
    setEmployees(prev => prev.map(e => e.id === kiosk.id ? { ...e, status: newStatus } : e));
    if (autoOpenKiosk && autoOpenKiosk.id === kiosk.id) {
      setAutoOpenKiosk(prev => prev ? { ...prev, status: newStatus } : prev);
    }
    try {
      const { error } = await supabase.from('employees').update({ status: newStatus }).eq('id', kiosk.id);
      if (error) throw error;
      setAlertState({ isOpen: true, message: `Status updated to ${newStatus} for ${kiosk.full_name}!`, type: 'success' });
    } catch (err) {
      console.error('Error toggling status:', err.message);
      setEmployees(prev => prev.map(e => e.id === kiosk.id ? { ...e, status: kiosk.status } : e));
      setAlertState({ isOpen: true, message: 'Failed to update status.', type: 'error' });
    }
  }, [autoOpenKiosk]);

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
          isFiltered={selectedFranchise !== 'all' || selectedArea !== 'all' || selectedSupervisor !== 'all' || selectedRole !== 'all' || searchTerm !== ''}
          isAddingEmployee={isAddingEmployee} 
          onLocationSelected={handleLocationSelected}
          onEditEmployee={handleEditEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          onToggleStatus={handleToggleStatus}
          supervisorLocations={supervisorLocations}
          autoOpenKiosk={autoOpenKiosk}
          selectedLocation={selectedLocation}
          newRadius={newRadius}
          onRemoveSelectedLocation={handleRemoveSelectedLocation}
        />
      </div>

      {/* Realtime New Employee Notification Banner */}
      {newEmployeeBanner && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1500] bg-slate-900/95 backdrop-blur-2xl rounded-2xl px-5 py-3.5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] border border-emerald-500/40 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
            <Sparkles size={20} className="animate-pulse text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">New Employee Added</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">REALTIME</span>
            </div>
            <p className="text-sm font-bold text-slate-100 mt-0.5">
              {newEmployeeBanner.full_name} <span className="text-slate-400 font-normal">({newEmployeeBanner.franchises?.name || 'Franchise'})</span>
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button 
              onClick={() => {
                setAutoOpenKiosk({ ...newEmployeeBanner, _t: Date.now() });
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
            >
              View Card
            </button>
            <button 
              onClick={() => setNewEmployeeBanner(null)}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

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
        <div className={`absolute top-8 left-1/2 -translate-x-1/2 z-[1000] backdrop-blur-2xl rounded-2xl px-5 py-3 shadow-[0_15px_40px_rgba(0,0,0,0.7)] border flex flex-col md:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-4 ${
          interceptingEmployees.length > 0
            ? 'bg-slate-900/95 border-rose-500/80 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
            : 'bg-slate-900/95 border-slate-700 text-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${
              interceptingEmployees.length > 0
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-bounce'
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            }`}>
              {interceptingEmployees.length > 0 ? <AlertTriangle size={20} /> : <MapPin size={18} />}
            </div>
            <div>
              <span className="text-xs font-bold block">Click map or enter coordinates manually:</span>
              {interceptingEmployees.length > 0 && (
                <p className="text-[11px] font-black text-rose-400 mt-0.5 animate-pulse">
                  ⚠️ RADIUS INTERCEPT ALERT! Intersects with {interceptingEmployees[0].full_name} ({interceptingEmployees[0].distance}m away, overlap {interceptingEmployees[0].overlap}m)
                </p>
              )}
            </div>
          </div>

          {/* Manual Input Fields */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <input
              type="number"
              step="any"
              value={selectedLocation?.lat ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedLocation(prev => ({ ...prev, lat: val === '' ? '' : parseFloat(val) }));
              }}
              placeholder="Latitude"
              className="w-24 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs font-mono text-emerald-400 outline-none"
            />
            <span className="text-slate-600 text-xs">•</span>
            <input
              type="number"
              step="any"
              value={selectedLocation?.lng ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedLocation(prev => ({ ...prev, lng: val === '' ? '' : parseFloat(val) }));
              }}
              placeholder="Longitude"
              className="w-24 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs font-mono text-emerald-400 outline-none"
            />
          </div>

          <button 
            onClick={() => setIsAddingEmployee(false)}
            className="bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-700 hover:border-rose-500/50 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg transition-all"
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

            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Role Filter</label>
              <div className="relative">
                <select 
                  className="w-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold text-sm rounded-2xl appearance-none outline-none py-3.5 px-4 cursor-pointer hover:bg-purple-500/20 transition-colors"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="all" className="bg-slate-900 text-slate-200">All Roles Selected</option>
                  <option value="Agent" className="bg-slate-900 text-slate-200">Agent</option>
                  <option value="Reliever" className="bg-slate-900 text-slate-200">Reliever</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" size={16} />
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
            className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 shrink-0">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <UserPlus className="text-emerald-500" size={20} />
                {editingEmployeeId ? 'Edit Employee Pin' : 'Add New Employee Pin'}
              </h3>
              <button type="button" onClick={() => setIsEmployeeModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEmployee} className="p-6 overflow-y-auto custom-scrollbar flex-1">
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
                  {(!user || !user.franchise_id) && (
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
                  )}
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
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Coordinates & Proximity</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Radius:</span>
                        <input
                          type="number"
                          min="10"
                          max="5000"
                          value={employeeFormData.allowed_radius || '100'}
                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, allowed_radius: e.target.value })}
                          className="w-16 bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs px-2 py-1 rounded text-center outline-none focus:border-emerald-500"
                        />
                        <span className="text-xs text-slate-500 font-mono">m</span>
                      </div>
                    </div>

                    <div className="flex gap-4 font-mono text-sm text-emerald-400">
                      <div className="flex items-center">
                        <span className="text-slate-500 mr-1">LAT:</span>
                        <input
                          type="number"
                          step="any"
                          value={selectedLocation?.lat ?? ''}
                          onChange={(e) => setSelectedLocation(prev => ({ ...prev, lat: e.target.value }))}
                          className="w-[100px] bg-transparent border-b border-slate-700 focus:border-emerald-500 outline-none text-emerald-400 font-mono"
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-slate-500 mr-1">LNG:</span>
                        <input
                          type="number"
                          step="any"
                          value={selectedLocation?.lng ?? ''}
                          onChange={(e) => setSelectedLocation(prev => ({ ...prev, lng: e.target.value }))}
                          className="w-[100px] bg-transparent border-b border-slate-700 focus:border-emerald-500 outline-none text-emerald-400 font-mono"
                        />
                      </div>
                    </div>

                    {/* RADIUS INTERCEPT ALERT BADGE */}
                    {interceptingEmployees.length > 0 && (
                      <div className="pt-3 border-t border-rose-500/30">
                        <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider">
                              <AlertTriangle size={16} className="animate-bounce text-rose-400" />
                              <span>Radius Intercept Alert!</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
                              {interceptingEmployees.length} Intercept{interceptingEmployees.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          {interceptingEmployees.map((intercept, idx) => (
                            <div key={intercept.id || idx} className="bg-slate-900/90 rounded-lg p-2.5 border border-rose-500/30 text-xs">
                              <div className="flex items-center justify-between text-slate-200 font-bold mb-1">
                                <span>{intercept.full_name} <span className="text-slate-500 font-normal">({intercept.employee_id || 'ID'})</span></span>
                                <span className="text-rose-400 font-mono">{intercept.distance} meters apart</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                                <span>New ({intercept.newRadius}m) + Existing ({intercept.empRadius}m)</span>
                                <span className="text-rose-300 font-bold bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                                  Overlap: {intercept.overlap}m
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 mt-4 border-t border-slate-700/50">
                {/* 2x2 Picture */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Employee 2x2 Picture</label>
                  <div className="border border-emerald-500/30 border-dashed bg-emerald-500/5 rounded-xl p-3 flex gap-3 h-[110px]">
                    <div className="w-[84px] h-[84px] bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {employeeFormData.photo_url ? (
                        <img src={employeeFormData.photo_url} alt="2x2" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black text-slate-600">2x2</span>
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-bold text-slate-300">2x2 Picture</span>
                      <label className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors w-fit cursor-pointer mt-2">
                        {uploading.photo_url ? 'Uploading...' : <><Upload size={12} /> Upload</>}
                        <input type="file" accept="image/*" className="hidden" disabled={uploading.photo_url} onChange={(e) => handleFileUpload(e, 'photo_url')} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Kiosk Location Image */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kiosk Location Image</label>
                  <div className="border border-slate-600 border-dashed rounded-xl p-3 flex items-center justify-center gap-4 h-[110px] bg-slate-800/50">
                    <div className="w-[72px] h-[72px] border border-slate-600 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-500 overflow-hidden">
                      {employeeFormData.id_photo_url ? (
                        <img src={employeeFormData.id_photo_url} alt="Kiosk" className="w-full h-full object-cover" />
                      ) : (
                        <Store size={24} />
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-bold text-slate-300 mb-2">Kiosk Photo</span>
                      <label className="bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors w-fit cursor-pointer">
                        {uploading.id_photo_url ? 'Uploading...' : <><Upload size={12} /> Upload</>}
                        <input type="file" accept="image/*" className="hidden" disabled={uploading.id_photo_url} onChange={(e) => handleFileUpload(e, 'id_photo_url')} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* GPS Screenshot */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">GPS Screenshot</label>
                  <div className="border border-slate-600 border-dashed rounded-xl p-3 flex items-center justify-center gap-4 h-[110px] bg-slate-800/50">
                    <div className="w-[72px] h-[72px] border border-slate-600 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-500 overflow-hidden">
                      {employeeFormData.coordinate_screenshot_url ? (
                        <img src={employeeFormData.coordinate_screenshot_url} alt="GPS" className="w-full h-full object-cover" />
                      ) : (
                        <MapPin size={24} />
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-bold text-slate-300 leading-tight mb-2">GPS<br/>Screenshot</span>
                      <label className="bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors w-fit cursor-pointer">
                        {uploading.coordinate_screenshot_url ? 'Uploading...' : <><Upload size={12} /> Upload</>}
                        <input type="file" accept="image/*" className="hidden" disabled={uploading.coordinate_screenshot_url} onChange={(e) => handleFileUpload(e, 'coordinate_screenshot_url')} />
                      </label>
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
