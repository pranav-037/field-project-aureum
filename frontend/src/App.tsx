import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './contexts/WalletContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Import pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfileDashboard from './pages/ProfileDashboard';
import InstitutionDashboard from './pages/InstitutionDashboard';
import CollectorDashboard from './pages/CollectorDashboard';
import ArtworkRegistration from './pages/ArtworkRegistration';
import ProvenanceVerification from './pages/ProvenanceVerification';
import AdminConsole from './pages/AdminConsole';

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* Auth-Guarded Profile Dashboard */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfileDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/profile-dashboard" element={<Navigate to="/profile" replace />} />

                <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
                <Route path="/collector/dashboard" element={<CollectorDashboard />} />
                <Route path="/artwork/register" element={<ArtworkRegistration />} />
                <Route path="/verify" element={<ProvenanceVerification />} />
                <Route path="/admin" element={<AdminConsole />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
