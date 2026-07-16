import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, MapPin, Navigation, Car, AlertTriangle, Users, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Custom Marker for Supervisors
const createSupervisorIcon = (color, heading = 0) => {
  const safeColor = color || '#3b82f6';

  const svgIcon = `
    <svg viewBox="0 0 24 24" width="12" height="12" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg); transition: transform 0.3s ease;">
      <path d="M12 2L4 20l8-4 8 4-8-18z" fill="white" />
    </svg>
  `;

  return new L.DivIcon({
    className: 'custom-div-icon bg-transparent border-0',
    html: `
      <div class="relative flex items-center justify-center" style="width: 36px; height: 36px;">
        <div class="absolute inset-0 rounded-full animate-ping opacity-40" style="background-color: ${safeColor}; animation-duration: 1s;"></div>
        <div class="relative flex items-center justify-center rounded-full border-[3px] border-white shadow-lg" style="background-color: ${safeColor}; width: 24px; height: 24px;">
          ${svgIcon}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const employeeIconCache = {};
const createEmployeeIcon = (color) => {
  const safeColor = color || '#3b82f6';
  if (employeeIconCache[safeColor]) return employeeIconCache[safeColor];

  const svgIcon = `
    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${safeColor}" stroke="white" stroke-width="2" />
      <circle cx="12" cy="12" r="4" fill="white" />
    </svg>
  `;

  employeeIconCache[safeColor] = new L.DivIcon({
    className: 'custom-div-icon bg-transparent border-0',
    html: `
      <div class="relative flex items-center justify-center drop-shadow-md">
        <div>${svgIcon}</div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
  
  return employeeIconCache[safeColor];
};

// Component to handle dynamic panning and resizing
function MapController({ centerPos, isSidebarOpen }) {
  const map = useMap();
  
  useEffect(() => {
    if (centerPos) {
      map.flyTo(centerPos, 15, { animate: true, duration: 1.5 });
    }
  }, [centerPos, map]);

  useEffect(() => {
    // Invalidate map size after sidebar transition finishes to prevent gray areas
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 350);
    return () => clearTimeout(timer);
  }, [isSidebarOpen, map]);

  return null;
}

export default function RealtimeMonitoringPage({ user }) {
  const [locations, setLocations] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([8.242, 124.262]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [employees, setEmployees] = useState([]);

  const fetchData = async () => {
    try {
      // Fetch supervisor locations and join with supervisors and franchises
      let query = supabase
        .from('supervisor_locations')
        .select(`
          *,
          supervisors (
            id, name, color, franchise_id,
            franchises (name)
          )
        `)
        .order('last_updated', { ascending: false });

      const empQuery = supabase
        .from('employees')
        .select('id, full_name, latitude, longitude, supervisor_id, role, franchise_id')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      const [locRes, empRes] = await Promise.all([query, empQuery]);

      if (locRes.error) throw locRes.error;
      if (empRes.error) throw empRes.error;

      let filteredLocs = locRes.data;
      let filteredEmps = empRes.data || [];
      if (user?.role === 'franchise_admin') {
         filteredLocs = locRes.data.filter(d => d.supervisors?.franchise_id === user.franchise_id);
         filteredEmps = filteredEmps.filter(e => e.franchise_id === user.franchise_id);
      }

      setLocations(filteredLocs || []);
      setEmployees(filteredEmps);
    } catch (err) {
      console.error('Error fetching live tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const pollData = async () => {
      await fetchData();
      if (isMounted) {
        timeoutId = setTimeout(pollData, 1000);
      }
    };

    pollData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user]);

  const handleSupervisorSelect = (loc) => {
    setSelectedSupervisor(loc.supervisor_id);
    setMapCenter([loc.latitude, loc.longitude]);
  };

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Side Panel */}
      <div className={`bg-slate-900 z-20 shadow-2xl relative h-full flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-full sm:w-80 lg:w-96 border-r border-slate-800' : 'w-0 border-0 overflow-hidden'}`}>
        <div className="flex flex-col h-full w-[100vw] sm:w-80 lg:w-96">
          <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Live Tracking</h1>
              <p className="text-xs sm:text-sm text-indigo-400 font-medium">Field Supervisors</p>
            </div>
          </div>
          <p 
            className="text-[10px] sm:text-xs text-slate-400 mt-2 flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
            onClick={() => setSelectedSupervisor('all')}
            title="Click to view all employees"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-time updates active
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && locations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center p-8 bg-slate-800/30 rounded-2xl border border-slate-700/50">
              <Users size={32} className="mx-auto mb-3 text-slate-500" />
              <p className="text-slate-400 text-sm">No supervisors currently broadcasting location.</p>
            </div>
          ) : (
            locations.map((loc) => {
              const sup = loc.supervisors;
              if (!sup) return null;
              
              const isSelected = selectedSupervisor === loc.supervisor_id;
              const lastUpdatedDate = new Date(loc.last_updated);
              const minutesAgo = (new Date() - lastUpdatedDate) / 1000 / 60;
              const isStale = minutesAgo > 5; // Stale if no update in 5 minutes

              return (
                <div 
                  key={loc.id}
                  onClick={() => handleSupervisorSelect(loc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                    isSelected 
                      ? 'bg-slate-800/80 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                      : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-slate-800 shadow-lg"
                        style={{ backgroundColor: sup.color || '#3b82f6' }}
                      >
                        <span className="text-white font-bold text-sm">
                          {sup.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-200">{sup.name}</h3>
                        <p className="text-[10px] sm:text-xs text-slate-400">{sup.franchises?.name}</p>
                      </div>
                    </div>
                    {isStale && (
                      <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-[10px] font-bold">
                        <AlertTriangle size={12} />
                        Offline
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-slate-900/50 rounded-lg p-2 flex items-center gap-1 sm:gap-2">
                      <Car size={14} className="text-indigo-400 flex-shrink-0" />
                      <div className="overflow-hidden min-w-0">
                        <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">Speed</p>
                        <p className="text-[10px] sm:text-xs text-slate-300 font-medium truncate">
                          {(loc.speed || 0).toFixed(1)} <span className="text-[8px] sm:text-[10px] text-slate-500">m/s</span>
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2 flex items-center gap-1 sm:gap-2">
                      <Navigation size={14} className="text-indigo-400 flex-shrink-0" style={{ transform: `rotate(${loc.heading || 0}deg)` }} />
                      <div className="overflow-hidden min-w-0">
                        <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">Heading</p>
                        <p className="text-[10px] sm:text-xs text-slate-300 font-medium truncate">
                          {Math.round(loc.heading || 0)}&deg;
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center text-[8px] sm:text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock size={10} /> 
                      Last signal
                    </span>
                    <span className={isStale ? 'text-amber-500/70' : 'text-emerald-400/70'}>
                      {formatDistanceToNow(lastUpdatedDate, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-slate-950">
        <MapContainer
          center={mapCenter}
          zoom={12}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            attribution="Map data &copy; Google"
          />
          <MapController centerPos={mapCenter} isSidebarOpen={isSidebarOpen} />
          
          {locations.map(loc => {
            if (!loc.supervisors) return null;
            return (
              <Marker
                key={`sup-${loc.id}`}
                position={[loc.latitude, loc.longitude]}
                icon={createSupervisorIcon(loc.supervisors.color, loc.heading)}
              >
                <Popup className="custom-popup">
                  <div className="font-sans p-1">
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">{loc.supervisors.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mb-1">{loc.supervisors.franchises?.name}</p>
                    <p className="text-[10px] sm:text-xs text-slate-600">Speed: {(loc.speed || 0).toFixed(1)} m/s</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {(selectedSupervisor === 'all' ? employees : employees.filter(e => e.supervisor_id === selectedSupervisor))
            .map(emp => {
              const supColor = locations.find(l => l.supervisor_id === emp.supervisor_id)?.supervisors?.color || '#3b82f6';
              return (
              <Marker
                key={`emp-${emp.id}`}
                position={[emp.latitude, emp.longitude]}
                icon={createEmployeeIcon(supColor)}
              >
                <Popup className="custom-popup">
                  <div className="font-sans p-1">
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">{emp.full_name}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mb-1">{emp.employee_id} • {emp.role}</p>
                    <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 inline-block mt-1">Assigned Employee</span>
                  </div>
                </Popup>
              </Marker>
            )})}
        </MapContainer>
        
        {/* Map Overlay Controls could go here */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-6 left-0 z-[1000] bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-white p-2 rounded-r-xl border border-l-0 border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:bg-slate-800 transition-all"
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );
}
