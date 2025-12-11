'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Employee } from '../types';
import { employeeLogin } from '../services/employeeService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isDirector: boolean;
  isProjectHead: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users for fallback authentication
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Korals Design Pvt.Ltd',
    email: 'director@company.com',
    role: 'Director',
    avatar: '👨‍💼'
  },
  {
    id: '2',
    name: 'Sarah ProjectHead',
    email: 'projecthead@company.com',
    role: 'Project Head',
    avatar: '👩‍💻'
  },
  {
    id: '3',
    name: 'Mike Employee',
    email: 'employee@company.com',
    role: 'Employee',
    avatar: '👨‍🔧'
  }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data on app load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log('✅ Restored user from localStorage:', parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('🔄 AuthContext: Attempting login...');
      
      // First try employee login with backend API
      try {
        console.log('🔄 Trying employee login with backend...');
        const employee = await employeeLogin(username, password);
        console.log('✅ Employee login successful:', employee);
        
        // Convert employee to user format
        const userData: User = {
          id: employee.id || employee._id || '',
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email || employee.username,
          role: employee.role,
          avatar: '👤'
        };
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('✅ User set in context:', userData);
        return true;
        
      } catch (employeeError) {
        console.log('⚠️ Employee login failed, trying mock users...');
        
        // Fallback to mock authentication for demo users
        const foundUser = mockUsers.find(u => u.email === username || u.name === username);
        
        if (foundUser && password === 'password') { // Simple password for demo
          setUser(foundUser);
          localStorage.setItem('user', JSON.stringify(foundUser));
          console.log('✅ Mock user login successful:', foundUser);
          return true;
        }
        
        console.log('❌ No valid user found');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Login error in AuthContext:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const isDirector = user?.role === 'Director';
  const isProjectHead = user?.role === 'Project Head';
  const isEmployee = user?.role === 'Employee';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isDirector,
      isProjectHead,
      isEmployee
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
