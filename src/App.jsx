import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';

import LandingPage from './pages/LandingPage';
import Login       from './pages/auth/Login';

import DoctorDashboard  from './pages/doctor/Dashboard';
import Patients         from './pages/doctor/Patients';
import NewAnalysis      from './pages/doctor/NewAnalysis';
import History          from './pages/doctor/History';
import Notifications    from './pages/doctor/Notifications';
import PatientProfile   from './pages/doctor/PatientProfile';
import DigitalTwin      from './pages/doctor/DigitalTwin';

import AdminDashboard from './pages/admin/Dashboard';
import ManageUsers    from './pages/admin/ManageUsers';
import Logs           from './pages/admin/Logs';

import PatientHome from './pages/patient/Dashboard';
import MyResults   from './pages/patient/MyResults';
import MyProfile   from './pages/patient/MyProfile';

function ProtectedLayout({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/"      element={<LandingPage />} />
      <Route path="/login" element={<Login />} />

      {/* Doctor */}
      <Route path="/doctor/dashboard"              element={<ProtectedLayout><DoctorDashboard /></ProtectedLayout>} />
      <Route path="/doctor/patients"               element={<ProtectedLayout><Patients /></ProtectedLayout>} />
      <Route path="/doctor/patients/:id"           element={<ProtectedLayout><PatientProfile /></ProtectedLayout>} />
      <Route path="/doctor/patients/:id/twin"      element={<ProtectedLayout><DigitalTwin /></ProtectedLayout>} />
      <Route path="/doctor/new-analysis"           element={<ProtectedLayout><NewAnalysis /></ProtectedLayout>} />
      <Route path="/doctor/history"                element={<ProtectedLayout><History /></ProtectedLayout>} />
      <Route path="/doctor/notifications"          element={<ProtectedLayout><Notifications /></ProtectedLayout>} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<ProtectedLayout><AdminDashboard /></ProtectedLayout>} />
      <Route path="/admin/users"     element={<ProtectedLayout><ManageUsers /></ProtectedLayout>} />
      <Route path="/admin/logs"      element={<ProtectedLayout><Logs /></ProtectedLayout>} />

      {/* Patient */}
      <Route path="/patient/dashboard" element={<ProtectedLayout><PatientHome /></ProtectedLayout>} />
      <Route path="/patient/results"   element={<ProtectedLayout><MyResults /></ProtectedLayout>} />
      <Route path="/patient/profile"   element={<ProtectedLayout><MyProfile /></ProtectedLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}