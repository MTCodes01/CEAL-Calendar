import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CalendarPage from './pages/CalendarPage';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Lazy load admin dashboard to prevent JS leakage to non-admins
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));

// Protected route wrapper -- allows authenticated users, and optionally guests
function ProtectedRoute({ children, allowGuest = false }) {
  const { isAuthenticated, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) return children;
  if (allowGuest && isGuest) return children;
  return <Navigate to="/login" />;
}

// Admin route wrapper
function AdminRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated && user?.is_staff ? children : <Navigate to="/calendar" />;
}

// Root redirect: authenticated or guest -> /calendar, otherwise -> /login
function RootRedirect() {
  const { isAuthenticated, isGuest, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated || isGuest) return <Navigate to="/calendar" />;
  return <Navigate to="/login" />;
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
                <Route
                  path="/calendar"
                  element={
                    <ProtectedRoute allowGuest={true}>
                      <CalendarPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <Suspense fallback={
                        <div className="min-h-screen flex items-center justify-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                      }>
                        <AdminDashboard />
                      </Suspense>
                    </AdminRoute>
                  }
                />
                <Route path="/" element={<RootRedirect />} />
              </Routes>
              <Footer />
            </div>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
