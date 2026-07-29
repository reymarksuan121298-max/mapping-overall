import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './pages/Layout';
import DashboardPage from './pages/DashboardPage';
import MapDashboard from './pages/MapDashboard';
import EmployeesPage from './pages/EmployeesPage';
import SupervisorsPage from './pages/SupervisorsPage';
import AttendancePage from './pages/AttendancePage';
import FranchisesPage from './pages/FranchisesPage';
import AreasPage from './pages/AreasPage';
import MunicipalitiesPage from './pages/MunicipalitiesPage';
import RealtimeMonitoringPage from './pages/RealtimeMonitoringPage';
import LoginPage from './pages/LoginPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { supabase } from './supabaseClient';

const SharedMapWrapper = () => {
  const { franchiseName } = useParams();
  const [franchiseId, setFranchiseId] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const fetchFranchise = async () => {
      if (!franchiseName || franchiseName.toLowerCase() === 'all') {
        setFranchiseId('all');
        setLoading(false);
        return;
      }

      const decodedName = decodeURIComponent(franchiseName).replace(/-/g, ' ');
      
      const { data, error } = await supabase
        .from('franchises')
        .select('id')
        .ilike('name', `%${decodedName}%`)
        .limit(1);
        
      if (error) {
        setError(error.message);
      } else if (data && data.length > 0) {
        setFranchiseId(data[0].id);
      } else {
        setError(`Franchise "${decodedName}" not found`);
      }
      setLoading(false);
    };
    
    fetchFranchise();
  }, [franchiseName]);

  if (loading) {
    return <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-emerald-500 font-black tracking-widest"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>LOADING MAP...</div>;
  }
  
  if (error) {
    return <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-rose-500 font-bold uppercase tracking-widest">{error}</div>;
  }

  const mockUser = {
    role: 'viewer',
    franchise_id: franchiseId === 'all' ? null : parseInt(franchiseId),
    name: 'Public Viewer'
  };
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900">
      <MapDashboard user={mockUser} />
    </div>
  );
};

function App() {
  const [user, setUser] = React.useState(() => {
    const saved = localStorage.getItem('kiosk_user');
    return saved ? JSON.parse(saved) : null;
  });

  const ViewerGuard = ({ children }) => {
    if (user?.role === 'viewer') return <Navigate to="/map" replace />;
    return children;
  };

  return (
    <>
      <ToastContainer 
        position="top-center" 
        autoClose={3000} 
        style={{ top: '110px' }} 
      />
      <BrowserRouter>
        <Routes>
          {/* Public route accessible without login */}
          <Route path="/share/map/:franchiseName" element={<SharedMapWrapper />} />

          {!user ? (
            <Route path="*" element={<LoginPage onLogin={setUser} />} />
          ) : (
            <Route path="/" element={<Layout user={user} onLogout={() => { localStorage.removeItem('kiosk_user'); setUser(null); }} />}>
              <Route index element={<Navigate to={user?.role === 'viewer' ? "/map" : "/dashboard"} replace />} />
              <Route path="dashboard" element={<ViewerGuard><DashboardPage user={user} /></ViewerGuard>} />
              <Route path="map" element={<MapDashboard user={user} />} />
              <Route path="employees" element={<ViewerGuard><EmployeesPage user={user} /></ViewerGuard>} />
              <Route path="supervisors" element={<ViewerGuard><SupervisorsPage user={user} /></ViewerGuard>} />
              <Route path="franchises" element={<ViewerGuard><FranchisesPage user={user} /></ViewerGuard>} />
              <Route path="areas" element={<ViewerGuard><AreasPage user={user} /></ViewerGuard>} />
              <Route path="municipalities" element={<ViewerGuard><MunicipalitiesPage user={user} /></ViewerGuard>} />
              <Route path="realtime" element={<ViewerGuard><RealtimeMonitoringPage user={user} /></ViewerGuard>} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
