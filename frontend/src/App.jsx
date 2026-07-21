import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  const [user, setUser] = React.useState(() => {
    const saved = localStorage.getItem('kiosk_user');
    return saved ? JSON.parse(saved) : null;
  });

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage onLogin={setUser} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} onLogout={() => { localStorage.removeItem('kiosk_user'); setUser(null); }} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage user={user} />} />
          <Route path="map" element={<MapDashboard user={user} />} />
          <Route path="employees" element={<EmployeesPage user={user} />} />
          <Route path="supervisors" element={<SupervisorsPage user={user} />} />
          <Route path="franchises" element={<FranchisesPage user={user} />} />
          <Route path="areas" element={<AreasPage user={user} />} />
          <Route path="municipalities" element={<MunicipalitiesPage user={user} />} />
          <Route path="realtime" element={<RealtimeMonitoringPage user={user} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
