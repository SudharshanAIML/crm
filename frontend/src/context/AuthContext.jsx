import { createContext, useContext, useState, useEffect } from 'react';
import { getCompanyById } from '../services/companyService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and user in localStorage
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedCompany = localStorage.getItem('company');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      if (storedCompany) setCompany(JSON.parse(storedCompany));
      else {
        // Try to fetch company from token if not stored
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1] || ''));
          if (payload?.companyId) {
            getCompanyById(payload.companyId).then((c) => {
              setCompany(c || null);
              if (c) localStorage.setItem('company', JSON.stringify(c));
            }).catch(() => {});
          }
        } catch (e) {
          // ignore
        }
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    // Fetch company when logging in (companyId may be in JWT)
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1] || ''));
      if (payload?.companyId) {
        getCompanyById(payload.companyId).then((c) => {
          setCompany(c || null);
          if (c) localStorage.setItem('company', JSON.stringify(c));
        }).catch(() => {});
      } else {
        setCompany(null);
        localStorage.removeItem('company');
      }
    } catch (e) {
      setCompany(null);
      localStorage.removeItem('company');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Check if user needs to complete onboarding
  const needsOnboarding = user && (!user.phone || !user.department);

  // Role-based helpers
  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  const value = {
    user,
    token,
    company,
    loading,
    login,
    logout,
    needsOnboarding,
    isAuthenticated: !!token,
    isAdmin,
    isEmployee,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
