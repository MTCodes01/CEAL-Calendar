import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Guest mode -- stored in sessionStorage so a page refresh keeps the guest session
  const [isGuest, setIsGuest] = useState(() => sessionStorage.getItem('guestMode') === 'true');

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const extractErrorMessage = (errData, defaultMsg = 'An error occurred') => {
    if (!errData) return defaultMsg;
    if (typeof errData === 'string') return errData;

    // Check common DRF/Custom error structures
    if (errData.error && typeof errData.error === 'string') return errData.error;
    if (errData.detail) {
      if (typeof errData.detail === 'string') return errData.detail;
      if (typeof errData.detail.detail === 'string') return errData.detail.detail;
    }
    if (errData.non_field_errors) {
      if (Array.isArray(errData.non_field_errors)) return errData.non_field_errors[0];
      if (typeof errData.non_field_errors === 'string') return errData.non_field_errors;
    }

    // Fallback for field errors object
    return defaultMsg;
  };

  const loadUser = async () => {
    try {
      const response = await api.get('/api/auth/me/');
      // Safety check: ensure response data is a valid user object and not an error
      if (response.data && !response.data.detail) {
        setUser(response.data);
        // If a real user is loaded, clear any lingering guest flag
        sessionStorage.removeItem('guestMode');
        setIsGuest(false);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      await api.post('/api/auth/login/', { email, password });

      // Tokens are now set via HttpOnly cookies by the backend
      // We just need to load the user profile
      const userResponse = await api.get('/api/auth/me/');
      setUser(userResponse.data);
      // Clear guest mode on successful login
      sessionStorage.removeItem('guestMode');
      setIsGuest(false);
      return { success: true, user: userResponse.data };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: extractErrorMessage(error.response?.data, 'Login failed'),
      };
    }
  };

  const signup = async (userData) => {
    try {
      // 1. Register the user
      await api.post('/api/auth/signup/', userData);

      // 2. Attempt to log in automatically
      const loginResult = await login(userData.email, userData.password);

      if (!loginResult.success) {
        // Registration succeeded, but auto-login failed
        return {
          success: true,
          loginError: loginResult.error || 'Account created, but automatic login failed. Please log in manually.',
        };
      }

      return loginResult;
    } catch (error) {
      const errData = error.response?.data;
      return {
        success: false,
        error: errData || { error: 'Signup failed' },
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Cookies are cleared by the backend, just reset app state
      setUser(null);
      sessionStorage.removeItem('guestMode');
      setIsGuest(false);
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await api.put('/api/auth/me/', data);
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error.response?.data, 'Update failed'),
      };
    }
  };

  const enterGuestMode = () => {
    sessionStorage.setItem('guestMode', 'true');
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    sessionStorage.removeItem('guestMode');
    setIsGuest(false);
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isGuest,
    enterGuestMode,
    exitGuestMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
