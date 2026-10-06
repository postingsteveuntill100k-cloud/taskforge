import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { LoginDto, RegisterDto, UserSafe } from '../types/index.js';
import { useToast } from './ToastContext.js';

interface AuthContextType {
  user: UserSafe | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSafe | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { addToast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      if (!api.auth.hasToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await api.auth.me();
        setUser(me);
      } catch (err) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const handleAuthExpired = () => {
      setUser(null);
      addToast('warning', 'Your session has expired. Please log in again.');
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [addToast]);

  const login = async (dto: LoginDto) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(dto);
      setUser(res.user);
      addToast('success', `Welcome back, ${res.user.name}!`);
    } catch (err: any) {
      addToast('error', err.message || 'Login failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (dto: RegisterDto) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(dto);
      setUser(res.user);
      addToast('success', `Account created successfully! Welcome, ${res.user.name}.`);
    } catch (err: any) {
      addToast('error', err.message || 'Registration failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout();
      setUser(null);
      addToast('info', 'You have been logged out.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
