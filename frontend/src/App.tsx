import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import pages (we'll create these next)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import InstitutionDashboard from './pages/InstitutionDashboard';
import CollectorDashboard from './pages/CollectorDashboard';
import ArtworkRegistration from './pages/ArtworkRegistration';
import ProvenanceVerification from './pages/ProvenanceVerification';
import AdminConsole from './pages/AdminConsole';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <header className="app-header">
          <h1>Aureum: Artchain Provenance Trail</h1>
          <nav className="app-nav">
            {/* Navigation will be dynamic based on auth status */}
          </nav>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
            <Route path="/collector/dashboard" element={<CollectorDashboard />} />
            <Route path="/artwork/register" element={<ArtworkRegistration />} />
            <Route path="/verify" element={<ProvenanceVerification />} />
            <Route path="/admin" element={<AdminConsole />} />
            {/* Protected routes would go here with auth checks */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} Aureum. All rights reserved.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;