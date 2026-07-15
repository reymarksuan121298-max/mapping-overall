import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Linking, Platform, PermissionsAndroid, TextInput, ScrollView, Modal } from 'react-native';
import WebView from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import { supabase } from './supabase';

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
};

export default function MapScreen({ account, onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [spvrSearchTerm, setSpvrSearchTerm] = useState('');
  const [myDeviceLocation, setMyDeviceLocation] = useState(null);
  const [location, setLocation] = useState(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(account.type === 'supervisor' ? account.id : null);
  const [supervisorsList, setSupervisorsList] = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [routeDistance, setRouteDistance] = useState(null);
  const webviewRef = useRef(null);
  const lastLocRef = useRef(null);
  
  const selectedSpvrName = supervisorsList.find(s => s.id === selectedSupervisorId)?.name || 'Select Supervisor';

  const filteredEmployees = employees.filter(emp => 
    emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (account.type === 'user') {
      const fetchSupervisors = async () => {
        let query = supabase.from('supervisors').select('id, name');
        if (account.franchise_id) {
          query = query.eq('franchise_id', account.franchise_id);
        }
        const { data } = await query;
        if (data) {
          const fullList = [{id: 'all', name: 'All Supervisors'}, ...data];
          setSupervisorsList(fullList);
          if (!selectedSupervisorId) {
             setSelectedSupervisorId('all');
          }
        }
      };
      fetchSupervisors();
    }
  }, [account]);

  useEffect(() => {
    if (selectedSupervisorId) {
      fetchEmployees(selectedSupervisorId);
    }
  }, [selectedSupervisorId]);

  useEffect(() => {
    let watchId = null;
    let locationInterval = null;

    const setupGeolocation = async () => {
      watchId = await startTracking();
    };
    setupGeolocation();

    return () => {
      if (watchId !== null) Geolocation.clearWatch(watchId);
    };
  }, [account, selectedSupervisorId]);

  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({ type: 'update_employees', employees: filteredEmployees, clear: true }));
    }
  }, [employees, searchTerm]);

  useEffect(() => {
    if (webviewRef.current && location) {
      webviewRef.current.postMessage(JSON.stringify({ type: 'update_location', lat: location.latitude, lng: location.longitude, heading: location.heading || 0 }));
    }
  }, [location]);

  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({ type: 'set_map_dragging', enabled: !dropdownVisible }));
    }
  }, [dropdownVisible]);

  useEffect(() => {
    if (myDeviceLocation) {
      setLocation(myDeviceLocation);
    }
  }, [myDeviceLocation]);

  const fetchEmployees = async (supervisorId) => {
    try {
      let query = supabase
        .from('employees')
        .select('*, supervisors(color)')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (supervisorId === 'all') {
         if (account.franchise_id) {
           query = query.eq('franchise_id', account.franchise_id);
         }
      } else {
         query = query.eq('supervisor_id', supervisorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err.message);
    }
  };

  const startTracking = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'App needs access to your location for live tracking.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Location permission is required for live tracking.');
          return null;
        }
      } catch (err) {
        console.warn(err);
        return null;
      }
    } else {
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'always',
      });
      Geolocation.requestAuthorization();
    }

    // Get an initial fast fix immediately
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude, heading, speed } = position.coords;
        const finalSpeed = speed && speed > 0 ? speed : 0;
        lastLocRef.current = { latitude, longitude, time: Date.now() };
        setMyDeviceLocation({ latitude, longitude, heading });
        updateLocationInDB(latitude, longitude, heading, finalSpeed);
      },
      error => console.warn('Initial location error:', error),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );

    return Geolocation.watchPosition(
      position => {
        const { latitude, longitude, heading, speed } = position.coords;
        let finalSpeed = speed && speed > 0 ? speed : 0;
        
        if (lastLocRef.current) {
          const prev = lastLocRef.current;
          const timeSec = (Date.now() - prev.time) / 1000;
          if (timeSec > 0) {
            const dist = getDistance(prev.latitude, prev.longitude, latitude, longitude);
            if (finalSpeed === 0) {
              finalSpeed = dist / timeSec;
            }
          }
        }
        lastLocRef.current = { latitude, longitude, time: Date.now() };
        if (!Number.isFinite(finalSpeed)) finalSpeed = 0;
        if (finalSpeed > 40) finalSpeed = 40; // cap at 144km/h to prevent GPS jitter bugs
        
        setMyDeviceLocation({ latitude, longitude, heading });
        updateLocationInDB(latitude, longitude, heading, finalSpeed);
      },
      error => console.error('Geolocation Error:', error),
      { enableHighAccuracy: true, distanceFilter: 0, interval: 1000, fastestInterval: 500 }
    );
  };

  const updateLocationInDB = async (lat, lng, heading, speed) => {
    try {
      const s = Number.isFinite(speed) ? speed : 0;
      const h = Number.isFinite(heading) ? heading : 0;

      if (account.type === 'supervisor') {
        const { error } = await supabase
          .from('supervisor_locations')
          .upsert({
            supervisor_id: account.id,
            latitude: lat,
            longitude: lng,
            heading: h,
            speed: s,
            last_updated: new Date().toISOString()
          }, { onConflict: 'supervisor_id' });
        if (error) console.error('Supabase update error:', error.message);
      } else if (account.type === 'user') {
        const { error } = await supabase
          .from('franchise_locations')
          .upsert({
            user_id: account.id,
            latitude: lat,
            longitude: lng,
            heading: h,
            speed: s,
            last_updated: new Date().toISOString()
          }, { onConflict: 'user_id' });
        if (error) console.error('Supabase update error:', error.message);
      }
    } catch (err) {
      console.error('Network error during location update', err);
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'alert') {
        Alert.alert('Notice', data.message);
      } else if (data.type === 'route_distance') {
        setRouteDistance(data.distance);
      }
    } catch (e) {
      // ignore
    }
  };

  const leafletHTML = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css" />
      <script src="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js"></script>
      <script src="https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate.js"></script>
      <style>
        body { padding: 0; margin: 0; background-color: #0f172a; }
        #map { height: 100vh; width: 100vw; }
        .custom-popup .leaflet-popup-content-wrapper { background: #1e293b; color: white; border-radius: 8px; }
        .custom-popup .leaflet-popup-tip { background: #1e293b; }
        .navigate-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-weight: bold; margin-top: 8px; width: 100%; cursor: pointer; }
        /* Hide the text instructions from OSRM to keep UI clean */
        .leaflet-routing-container { display: none !important; }
        .leaflet-control-layers { background: rgba(30, 41, 59, 0.9) !important; color: white !important; border: 1px solid #334155 !important; border-radius: 8px !important; }
        .leaflet-control-layers-toggle { filter: invert(1); }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
        const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });

        const map = L.map('map', { 
          zoomControl: false, 
          attributionControl: false,
          layers: [streetMap],
          rotate: true,
          touchRotate: true
        }).setView([8.242, 124.262], 12);

        L.control.layers(
          { "Street View": streetMap, "Satellite View": satelliteMap }, 
          null, 
          { position: 'bottomleft' }
        ).addTo(map);

        let markers = {};
        let myLocationMarker = null;
        let routingControl = null;

        const getSpvrIcon = (heading = 0) => {
          return L.divIcon({
            className: 'bg-transparent border-0',
            html: \`
              <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
                <div style="position:absolute; inset:0; background-color:#3b82f6; border-radius:50%; animation:ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; opacity:0.4;"></div>
                <div style="position:relative; width:24px; height:24px; background-color:#3b82f6; border-radius:50%; border:3px solid white; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                  <svg viewBox="0 0 24 24" width="12" height="12" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(\${heading}deg); transition: transform 0.3s ease;">
                    <path d="M12 2L4 20l8-4 8 4-8-18z" fill="white" />
                  </svg>
                </div>
              </div>
            \`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          });
        };

        const style = document.createElement('style');
        style.innerHTML = \`
          @keyframes ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
        \`;
        document.head.appendChild(style);

        const getEmpIcon = (color) => {
           return L.divIcon({
            className: 'bg-transparent border-0',
            html: \`<svg viewBox="0 0 24 36" width="16" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="\${color}" stroke="white" stroke-width="1.5" />
              <circle cx="12" cy="11" r="5" fill="#0f172a" />
            </svg>\`,
            iconSize: [16, 24],
            iconAnchor: [8, 24],
            popupAnchor: [0, -24]
          });
        };

        function onNavigate(lat, lng) {
          if (!myLocationMarker) {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'alert', message: 'Waiting for your current GPS location to calculate the route...' }));
             return;
          }
          
          if (routingControl) {
             map.removeControl(routingControl);
          }

          routingControl = L.Routing.control({
            waypoints: [
              myLocationMarker.getLatLng(),
              L.latLng(lat, lng)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            fitSelectedRoutes: true,
            showAlternatives: false,
            lineOptions: {
               styles: [{color: '#10b981', weight: 6, opacity: 0.8}]
            },
            createMarker: function() { return null; }
          }).addTo(map);

          routingControl.on('routesfound', function(e) {
            const routes = e.routes;
            if (routes && routes.length > 0) {
              const totalDistance = (routes[0].summary.totalDistance / 1000).toFixed(2);
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'route_distance', distance: totalDistance }));
            }
          });

          map.closePopup();
        }

        const handleIncomingMessage = function(event) {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'update_employees') {
              if (data.clear) {
                Object.values(markers).forEach(m => map.removeLayer(m));
                markers = {};
              }
              data.employees.forEach(emp => {
                if(!markers[emp.id]) {
                  const lat = parseFloat(emp.latitude);
                  const lng = parseFloat(emp.longitude);
                  const pinColor = (emp.supervisors && emp.supervisors.color) ? emp.supervisors.color : '${account.color || '#10b981'}';
                  const marker = L.marker([lat, lng], { icon: getEmpIcon(pinColor) })
                    .bindPopup(\`
                      <div style="text-align:center;">
                        <h3 style="margin:0;font-size:14px;font-weight:bold;">\${emp.full_name}</h3>
                        <p style="margin:2px 0 8px;font-size:10px;color:#94a3b8;">\${emp.employee_id}</p>
                        <button class="navigate-btn" onclick="onNavigate(\${lat}, \${lng})">Navigate to Route</button>
                      </div>
                    \`, { className: 'custom-popup' })
                    .addTo(map);
                  markers[emp.id] = marker;
                }
              });
              if(data.employees.length > 0) {
                 const group = new L.featureGroup(Object.values(markers));
                 map.fitBounds(group.getBounds().pad(0.5));
              }
            }

            if (data.type === 'route_all') {
               if (routingControl) map.removeControl(routingControl);
               
               let unvisited = data.employees.map(emp => ({
                 lat: parseFloat(emp.latitude),
                 lng: parseFloat(emp.longitude)
               }));
               
               if (unvisited.length === 0) {
                 window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'alert', message: 'No pins to route!' }));
                 return;
               }

               let currentPos = null;
               const waypoints = [];

               if (myLocationMarker) {
                 currentPos = myLocationMarker.getLatLng();
                 waypoints.push(currentPos);
               } else {
                 currentPos = L.latLng(unvisited[0].lat, unvisited[0].lng);
                 waypoints.push(currentPos);
                 unvisited.splice(0, 1);
               }
               
               // Nearest Neighbor algorithm to sort the route logically
               while(unvisited.length > 0) {
                 let nearestIdx = 0;
                 let minDistance = Infinity;
                 
                 for(let i = 0; i < unvisited.length; i++) {
                   const point = L.latLng(unvisited[i].lat, unvisited[i].lng);
                   const dist = currentPos.distanceTo(point);
                   if (dist < minDistance) {
                     minDistance = dist;
                     nearestIdx = i;
                   }
                 }
                 
                 const nextStop = unvisited[nearestIdx];
                 currentPos = L.latLng(nextStop.lat, nextStop.lng);
                 waypoints.push(currentPos);
                 unvisited.splice(nearestIdx, 1);
               }
               
               routingControl = L.Routing.control({
                  waypoints: waypoints,
                  routeWhileDragging: false,
                  addWaypoints: false,
                  fitSelectedRoutes: true,
                  showAlternatives: false,
                  lineOptions: { styles: [{color: '#f59e0b', weight: 5, opacity: 0.8}] },
                  createMarker: function() { return null; }
               }).addTo(map);

               routingControl.on('routesfound', function(e) {
                 const routes = e.routes;
                 if (routes && routes.length > 0) {
                   const totalDistance = (routes[0].summary.totalDistance / 1000).toFixed(2);
                   window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'route_distance', distance: totalDistance }));
                 }
               });
            }

            if (data.type === 'set_map_dragging') {
               if (data.enabled) {
                 map.dragging.enable();
                 map.touchZoom.enable();
               } else {
                 map.dragging.disable();
                 map.touchZoom.disable();
               }
            }

            if (data.type === 'clear_location') {
               if (myLocationMarker) {
                 map.removeLayer(myLocationMarker);
                 myLocationMarker = null;
               }
               if (routingControl) map.removeControl(routingControl);
            }

            if (data.type === 'update_location') {
               const lat = parseFloat(data.lat);
               const lng = parseFloat(data.lng);
               const heading = parseFloat(data.heading || 0);
               if (myLocationMarker) {
                 myLocationMarker.setLatLng([lat, lng]);
                 myLocationMarker.setIcon(getSpvrIcon(heading));
               } else {
                 myLocationMarker = L.marker([lat, lng], { icon: getSpvrIcon(heading), zIndexOffset: 1000 }).addTo(map);
               }
               map.panTo([lat, lng]);

               // Check distance for auto-arrived status (50 meters)
               const myLatLng = L.latLng(lat, lng);
               Object.keys(markers).forEach(id => {
                  const marker = markers[id];
                  if (!marker.isArrived) {
                     const dist = myLatLng.distanceTo(marker.getLatLng());
                     if (dist <= 50) {
                        marker.isArrived = true;
                        marker.setIcon(getEmpIcon('#22c55e'));
                        window.ReactNativeWebView.postMessage(JSON.stringify({ 
                          type: 'alert', 
                          message: 'You have arrived at a destination! Pin marked as done.' 
                        }));
                     }
                  }
               });
               
               // Update route start point if navigating ONLY if moved significantly to prevent severe lag
               if (routingControl) {
                 const currentWaypoints = routingControl.getWaypoints();
                 if (currentWaypoints.length > 0 && currentWaypoints[0].latLng) {
                    const distToRouteStart = myLatLng.distanceTo(currentWaypoints[0].latLng);
                    if (distToRouteStart > 25) { // Only recalculate route if moved > 25 meters
                       routingControl.spliceWaypoints(0, 1, myLatLng);
                    }
                 } else {
                    routingControl.spliceWaypoints(0, 1, myLatLng);
                 }
               }
            }
          } catch (err) {}
        };

        document.addEventListener('message', handleIncomingMessage);
        window.addEventListener('message', handleIncomingMessage);
      </script>
    </body>
    </html>
  `, [account?.color]);

  const webviewSource = useMemo(() => ({ html: leafletHTML }), [leafletHTML]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={webviewSource}
        style={styles.map}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        onLoadEnd={() => {
           // send initial data once loaded
           if (filteredEmployees.length > 0) {
             webviewRef.current.postMessage(JSON.stringify({ type: 'update_employees', employees: filteredEmployees, clear: true }));
           }
           if (location) {
             webviewRef.current.postMessage(JSON.stringify({ type: 'update_location', lat: location.latitude, lng: location.longitude, heading: location.heading || 0 }));
           }
        }}
      />

      {!isCardExpanded ? (
        <TouchableOpacity style={styles.fab} onPress={() => setIsCardExpanded(true)}>
          <Text style={styles.fabIcon}>☰</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerSubtitle}>
                 {account.type === 'user' ? 'ADMIN TRACKING' : 'LIVE TRACKING (LEAFLET)'}
              </Text>
              <Text style={styles.headerText}>{account.name}</Text>
            </View>
            <View style={{flexDirection: 'row', gap: 8}}>
              <TouchableOpacity onPress={() => setIsCardExpanded(false)} style={styles.minimizeBtn}>
                <Text style={styles.minimizeText}>HIDE</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
                <Text style={styles.logoutText}>LOGOUT</Text>
              </TouchableOpacity>
            </View>
          </View>

          {account.type === 'user' && supervisorsList.length > 0 && (
          <View style={{ zIndex: 10, elevation: 10 }}>
            <TouchableOpacity 
              style={styles.dropdownToggle}
              onPress={() => setDropdownVisible(!dropdownVisible)}
            >
              <Text style={styles.dropdownToggleText}>{selectedSpvrName}</Text>
              <Text style={styles.dropdownArrow}>{dropdownVisible ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            <Modal
              visible={dropdownVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setDropdownVisible(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPress={() => setDropdownVisible(false)}
              >
                <View style={styles.dropdownModalContent}>
                  <TextInput
                    style={styles.spvrSearchInput}
                    placeholder="Filter supervisors..."
                    placeholderTextColor="#64748b"
                    value={spvrSearchTerm}
                    onChangeText={setSpvrSearchTerm}
                  />
                  <ScrollView style={{ keyboardShouldPersistTaps: 'handled' }}>
                    {supervisorsList.filter(s => s.id === 'all' || s.name.toLowerCase().includes(spvrSearchTerm.toLowerCase())).map(spvr => (
                      <TouchableOpacity 
                        key={spvr.id} 
                        style={[styles.dropdownItem, selectedSupervisorId === spvr.id && styles.dropdownItemActive]}
                        onPress={() => {
                          setSelectedSupervisorId(spvr.id);
                          setDropdownVisible(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, selectedSupervisorId === spvr.id && styles.dropdownItemTextActive]}>
                          {spvr.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        )}
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          placeholderTextColor="#64748b"
          value={searchTerm}
          onChangeText={(text) => {
             setSearchTerm(text);
             if (webviewRef.current) {
               const filtered = employees.filter(emp => 
                 emp.full_name?.toLowerCase().includes(text.toLowerCase()) || 
                 emp.employee_id?.toLowerCase().includes(text.toLowerCase())
               );
               webviewRef.current.postMessage(JSON.stringify({ type: 'update_employees', employees: filtered, clear: true }));
             }
          }}
        />
        <TouchableOpacity 
          style={styles.routeAllBtn} 
          onPress={() => {
            if (webviewRef.current) {
              setRouteDistance(null);
              webviewRef.current.postMessage(JSON.stringify({ type: 'route_all', employees: filteredEmployees }));
              setIsCardExpanded(false);
            }
          }}>
          <Text style={styles.routeAllText}>Interconnect All Pins</Text>
        </TouchableOpacity>
      </View>
      )}

      {routeDistance && (
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeTitle}>TOTAL DISTANCE</Text>
          <Text style={styles.distanceBadgeText}>{routeDistance} km</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 14,
  },
  dropdownToggle: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownToggleText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownArrow: {
    color: '#94a3b8',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  dropdownModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '80%',
    overflow: 'hidden',
    elevation: 10,
  },
  spvrSearchInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 12,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  dropdownItemText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  routeAllBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  routeAllText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.5)',
  },
  logoutText: {
    color: '#f43f5e',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  minimizeBtn: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.5)',
  },
  minimizeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  fab: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#1e293b',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
    elevation: 10,
  },
  distanceBadgeTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  distanceBadgeText: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '900',
  }
});
