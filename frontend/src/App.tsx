/**
 * Main App Component for InvestGhanaHub
 * Handles routing and authentication context
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const KYCPage = lazy(() => import('./pages/KYCPage'));
const InvestorPage = lazy(() => import('./pages/InvestorPage'));
const OwnerPage = lazy(() => import('./pages/OwnerPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

// Components
import Navbar from './components/Navbar';

// Types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'INVESTOR' | 'BUSINESS_OWNER' | 'ADMIN';
  kycStatus?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Protected Route Component
const ProtectedRoute = ({
  children,
  allowedRoles
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'BUSINESS_OWNER') return <Navigate to="/owner" replace />;
    return <Navigate to="/investor" replace />;
  }

  return <>{children}</>;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const routeFallback = (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="animate-pulse-slow">
        <div className="w-16 h-16 border-4 border-ghana-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  // Check for stored auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // Login function
  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const authValue: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-pulse-slow">
          <div className="w-16 h-16 border-4 border-ghana-gold-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <div className="min-h-screen bg-dark-950 text-dark-50">
        <Navbar />
        <main>
          <Suspense fallback={routeFallback}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route
                path="/login"
                element={
                  user ? (
                    <Navigate to={
                      user.role === 'ADMIN' ? '/admin' :
                        user.role === 'BUSINESS_OWNER' ? '/owner' : '/investor'
                    } replace />
                  ) : (
                    <LoginPage />
                  )
                }
              />
              <Route
                path="/register"
                element={
                  user ? (
                    <Navigate to={
                      user.role === 'ADMIN' ? '/admin' :
                        user.role === 'BUSINESS_OWNER' ? '/owner' : '/investor'
                    } replace />
                  ) : (
                    <RegisterPage />
                  )
                }
              />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              {/* Protected Routes */}
              <Route
                path="/kyc"
                element={
                  <ProtectedRoute>
                    <KYCPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/investor"
                element={
                  <ProtectedRoute allowedRoles={['INVESTOR', 'ADMIN']}>
                    <InvestorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner"
                element={
                  <ProtectedRoute allowedRoles={['BUSINESS_OWNER', 'ADMIN']}>
                    <OwnerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <ProtectedRoute>
                    <WalletPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </AuthContext.Provider>
  );
}

export default App;

