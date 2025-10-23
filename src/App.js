import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HospitalDashboard from './pages/HospitalDashboard';
import PatientDashboard from './pages/PatientDashboard';
import InsurerDashboard from './pages/InsurerDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hospital" element={<HospitalDashboard />} />
        <Route path="/patient" element={<PatientDashboard />} />
        <Route path="/insurer" element={<InsurerDashboard />} />
        <Route path="/pharmacy" element={<PharmacyDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
