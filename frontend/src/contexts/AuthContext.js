import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set the default Authorization header for all axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user profile
      const fetchProfile = async () => {
        try {
          const response = await axios.get(`${API_URL}/profile`);
          setUser(response.data);
        } catch (err) {
          console.error('Error fetching profile:', err);
          logout();
        } finally {
          setLoading(false);
        }
      };
      
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/login`, { email, password });
      const { user, token } = response.data;
      
      // Store token in localStorage and set axios default headers
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      return user;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
      throw err;
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/register`, userData);
      const { user, token } = response.data;
      
      // Store token in localStorage and set axios default headers
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      return user;
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
      throw err;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, setError }}>
      {!loading && children}
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

export default AuthContext;
