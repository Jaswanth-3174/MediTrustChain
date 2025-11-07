import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HospitalDashboard from './pages/HospitalDashboard';
import PatientDashboard from './pages/PatientDashboard';
import InsurerDashboard from './pages/InsurerDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import Layout from './components/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/hospital" element={<Layout><HospitalDashboard /></Layout>} />
        <Route path="/patient" element={<Layout><PatientDashboard /></Layout>} />
        <Route path="/insurer" element={<Layout><InsurerDashboard /></Layout>} />
        <Route path="/pharmacy" element={<Layout><PharmacyDashboard /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
