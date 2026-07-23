import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User, MapPin, Layers, Shield, Clock, Trash2 } from 'lucide-react';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom colored marker function
const iconCache = {};
const createCustomIcon = (color) => {
  const safeColor = color || '#3b82f6';
  if (iconCache[safeColor]) return iconCache[safeColor];

  const svgIcon = `
    <svg viewBox="0 0 24 36" width="16" height="24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="${safeColor}" stroke="white" stroke-width="1.5" />
      <circle cx="12" cy="11" r="5" fill="#0f172a" />
    </svg>
  `;

  iconCache[safeColor] = new L.DivIcon({
    className: 'custom-div-icon bg-transparent border-0',
    html: `<div>${svgIcon}</div>`,
    iconSize: [16, 24],
    iconAnchor: [8, 24],
    popupAnchor: [0, -24]
  });
  
  return iconCache[safeColor];
};

// Create Supervisor Pulse Icon
const createSupervisorIcon = () => {
  return new L.DivIcon({
    className: 'custom-div-icon bg-transparent border-0',
    html: `
      <div class="relative w-8 h-8 flex items-center justify-center">
        <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
        <div class="relative w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// Component to handle map clicks for adding pins
function MapClickHandler({ isActive, onLocationSelected }) {
  useMapEvents({
    click(e) {
      if (isActive && onLocationSelected) {
        onLocationSelected(e.latlng);
      }
    },
  });
  return null;
}

// Component to handle dynamic map bounds based on markers
function MapBounds({ kiosks, isFiltered }) {
  const map = useMap();

  useEffect(() => {
    const validKiosks = kiosks ? kiosks.filter(k => k.latitude != null && k.longitude != null) : [];
    if (validKiosks.length > 0 && isFiltered) {
      const bounds = L.latLngBounds(validKiosks.map(k => [k.latitude, k.longitude]));
      // Add padding and limit max zoom
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [kiosks, map, isFiltered]);

  return null;
}

const MAP_LAYERS = {
  dark: {
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd']
  },
  street: {
    name: 'Street View',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    subdomains: ['a', 'b', 'c']
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: 'Map data &copy; Google',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] // Massive performance boost: parallel downloading
  }
};

const KioskMap = React.memo(function KioskMap({ kiosks, isAddingEmployee, onLocationSelected, isFiltered, onEditEmployee, onDeleteEmployee, supervisorLocations = [] }) {
  const [activeLayer, setActiveLayer] = useState('street');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  const renderCircles = useMemo(() => {
    return kiosks.filter(k => k.latitude != null && k.longitude != null).map((kiosk) => {
      const spvrColor = kiosk.supervisors?.color || '#10b981';
      const radius = parseInt(kiosk.allowed_radius, 10) || 100;
      return (
        <Circle 
          key={`circle-${kiosk.id}`}
          center={[kiosk.latitude, kiosk.longitude]}
          pathOptions={{ fillColor: spvrColor, color: spvrColor, fillOpacity: 0.15, weight: 1.5, dashArray: '4 4' }}
          radius={radius}
        />
      );
    });
  }, [kiosks]);

  // Aggressively memoize markers so they are completely immune to local state changes (like opening the Layer menu)
  const renderMarkers = useMemo(() => {
    return kiosks.filter(k => k.latitude != null && k.longitude != null).map((kiosk) => {
      const spvrColor = kiosk.supervisors?.color || '#10b981';
      return (
        <Marker 
          key={`marker-${kiosk.id}`}
          position={[kiosk.latitude, kiosk.longitude]}
          icon={createCustomIcon(spvrColor)}
        >
          <Popup minWidth={360}>
            <div className="p-4 min-w-[360px] bg-slate-900 rounded-xl">
              {/* Header Section */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="font-black text-slate-100 text-xl leading-tight mb-1">{kiosk.full_name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Shield size={14} className="text-indigo-400" />
                    <span className="text-[10px] font-black tracking-widest uppercase">ID: {kiosk.employee_id}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      kiosk.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                    {kiosk.status || 'Unknown'}
                  </span>
                  <div className="flex items-center gap-3">
                    {onEditEmployee && (
                      <button 
                        onClick={() => onEditEmployee(kiosk)} 
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Edit Data
                      </button>
                    )}
                    {onDeleteEmployee && (
                      <button 
                        onClick={() => onDeleteEmployee(kiosk)} 
                        className="text-rose-400 hover:text-rose-300 transition-colors bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20"
                        title="Delete Employee"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Info Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Supervisor */}
                <div className="bg-slate-900/50 rounded-xl p-3.5 border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Supervisor</p>
                  <div className="flex items-start gap-2 mt-0.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: spvrColor, boxShadow: `0 0 10px ${spvrColor}` }}></div>
                    <p className="text-sm font-bold text-slate-200 leading-tight" title={kiosk.supervisors?.name}>
                      {kiosk.supervisors?.name || 'Unassigned'}
                    </p>
                  </div>
                </div>
                
                {/* Assignment */}
                <div className="bg-slate-900/50 rounded-xl p-3.5 border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Assignment</p>
                  <p className="text-sm font-bold text-slate-200">{kiosk.role || 'Agent'}</p>
                </div>
              </div>

              {/* Area / Franchise */}
              <div className="bg-slate-900/50 rounded-xl p-3.5 border border-slate-700/50 mb-3 hover:border-slate-600 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Area / Franchise</p>
                <p className="text-sm font-bold text-slate-200 truncate">
                  {kiosk.areas?.name ? `${kiosk.areas.name} • ` : ''}{kiosk.franchises?.name || 'No Franchise'}
                </p>
              </div>

              {/* Contact Number */}
              <div className="bg-slate-900/50 rounded-xl p-3.5 border border-slate-700/50 mb-3 hover:border-slate-600 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Contact Number</p>
                <p className="text-sm font-bold text-slate-200">{kiosk.contact_number || 'N/A'}</p>
              </div>

              {/* Status Transitions */}
              <div className="bg-slate-900/30 rounded-xl p-3 border border-slate-700/30 mb-3 flex items-center gap-2">
                <Clock size={14} className="text-indigo-400/70" />
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">No status transitions recorded today</p>
              </div>

              {/* Tactical Post */}
              <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20 flex justify-between items-center group cursor-default">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1.5 flex items-center gap-1.5">
                    Tactical Post
                  </p>
                  <p className="text-xs font-mono font-bold text-indigo-300">
                    {kiosk.latitude?.toFixed(6)} • {kiosk.longitude?.toFixed(6)}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)] group-hover:scale-110 transition-transform">
                  <MapPin size={14} className="text-rose-400" />
                </div>
              </div>
            </div>
            </Popup>
        </Marker>
      );
    });
  }, [kiosks]);

  // Center roughly on Mindanao, Philippines
  const defaultCenter = [7.9, 124.0];

  return (
    <div className={`relative w-full h-full ${isAddingEmployee ? 'cursor-crosshair' : ''}`}>
      <MapContainer 
        center={defaultCenter} 
        zoom={8} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false} // Will add custom zoom control later or rely on scroll
        preferCanvas={true} // MASSIVE PERFORMANCE BOOST: Draws circles on canvas instead of SVG DOM nodes
      >
        <TileLayer
          key={activeLayer}
          url={MAP_LAYERS[activeLayer].url}
          attribution={MAP_LAYERS[activeLayer].attribution}
          subdomains={MAP_LAYERS[activeLayer].subdomains}
          keepBuffer={8}
          updateWhenIdle={true}
          updateWhenZooming={false}
        />
        
        <MapBounds kiosks={kiosks} isFiltered={isFiltered} />
        <MapClickHandler isActive={isAddingEmployee} onLocationSelected={onLocationSelected} />

        {/* Floating Layer Control */}
        <div className="absolute bottom-8 left-8 z-[1000] flex items-end gap-3">
          <button 
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className={`w-14 h-14 rounded-full border-[3px] shadow-[0_0_20px_rgba(0,0,0,0.5)] flex-shrink-0 flex items-center justify-center transition-all group ${
              isLayerMenuOpen ? 'bg-slate-800 border-emerald-500/50 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-emerald-400 hover:border-emerald-500/30'
            }`}
          >
            <Layers size={24} className="transition-colors" />
          </button>

          {isLayerMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-[-1]" 
                onClick={() => setIsLayerMenuOpen(false)}
              />
              <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-left-4 duration-200 w-56 border border-slate-700/50 mb-0 relative">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 px-2">Visualization</h4>
              <div className="space-y-1">
                {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveLayer(key);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all border ${
                      activeLayer === key
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'text-slate-300 hover:bg-slate-800 border-transparent'
                    }`}
                  >
                    {layer.name}
                    {activeLayer === key && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,1)]"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            </>
          )}
        </div>

      {renderCircles}
      {renderMarkers}
      
      {/* Supervisor Live Locations */}
      {supervisorLocations.map((loc) => (
        <Marker
          key={`spvr-loc-${loc.supervisor_id}`}
          position={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}
          icon={createSupervisorIcon()}
        >
          <Popup>
            <div className="p-2 min-w-[200px] bg-slate-900 rounded-lg">
              <h3 className="font-black text-blue-400 text-sm mb-1">Live Tracking</h3>
              <p className="text-xs text-slate-300">Supervisor ID: {loc.supervisor_id}</p>
              <p className="text-[10px] text-slate-500 mt-2">
                Last updated: {new Date(loc.last_updated).toLocaleTimeString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
    </div>
  );
});

export default KioskMap;
