import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex flex-col items-center justify-center text-slate-200">
        <div className="relative flex items-center justify-center">
          {/* Animated Glowing Ring */}
          <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-amber-400 animate-spin"></div>
          <div className="absolute w-8 h-8 rounded-full bg-indigo-500/10 blur-sm"></div>
        </div>
        <p className="mt-4 text-xs font-mono tracking-widest text-slate-400 uppercase">
          Verifying Sovereign Credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
