'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Globe } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('🔄 Attempting login with:', { email, password });
      const success = await login(email, password);
      if (success) {
        console.log('✅ Login successful, navigating to dashboard');
        router.push('/');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#F8F7F5', 
      display: 'flex', 
      position: 'relative' 
    }}>
      {/* Yellow Left Border */}
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '2%',
        height: '100vh',
        backgroundColor: '#FEE100',
        zIndex: 1
      }} />

      {/* Header */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '40px',
        zIndex: 10
      }}>
        {/* Logo */}
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: '#000',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '10px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '6px',
              left: '6px',
              width: '12px',
              height: '12px',
              backgroundColor: '#000',
              borderRadius: '50%'
            }} />
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        color: '#333333',
        fontSize: '14px',
        cursor: 'pointer',
        zIndex: 10
      }}>
        <Globe size={16} />
        <span>English</span>
        <span style={{ fontSize: '12px' }}>▼</span>
      </div>

      {/* Main Content */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '20px'
      }}>
        {/* Login Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '40px',
          width: '100%',
          maxWidth: '400px',
          position: 'relative'
        }}>
          {/* Title */}
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#333333',
            marginBottom: '10px',
            fontFamily: 'serif'
          }}>
            Log in
          </h1>

          {/* Account Creation Prompt */}
          <p style={{
            fontSize: '14px',
            color: '#333333',
            marginBottom: '30px'
          }}>
            Need a Mailchimp account? <a href="#" style={{ color: '#007C89', textDecoration: 'underline' }}>Create an account</a>
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Username/Email Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333333',
                marginBottom: '8px'
              }}>
                Username or Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #CCCCCC',
                  borderRadius: '4px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007C89'}
                onBlur={(e) => e.target.style.borderColor = '#CCCCCC'}
              />
            </div>

            {/* Password Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333333',
                marginBottom: '8px'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 60px 12px 12px',
                    border: '1px solid #CCCCCC',
                    borderRadius: '4px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007C89'}
                  onBlur={(e) => e.target.style.borderColor = '#CCCCCC'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: '#007C89',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span>Show</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                color: '#dc2626',
                fontSize: '14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                padding: '12px'
              }}>
                {error}
              </div>
            )}

            {/* Keep me logged in checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                style={{
                  width: '16px',
                  height: '16px',
                  border: '1px solid #CCCCCC',
                  borderRadius: '2px'
                }}
              />
              <label style={{
                fontSize: '14px',
                color: '#333333',
                cursor: 'pointer'
              }}>
                Keep me logged in
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: '#007C89',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => !isLoading && ((e.target as HTMLButtonElement).style.backgroundColor = '#005f6b')}
              onMouseOut={(e) => !isLoading && ((e.target as HTMLButtonElement).style.backgroundColor = '#007C89')}
            >
              {isLoading ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          {/* Forgot Links */}
          <div style={{
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <a href="#" style={{ color: '#007C89', textDecoration: 'underline', fontSize: '14px' }}>
                Forgot username?
              </a>
              <a href="#" style={{ color: '#007C89', textDecoration: 'underline', fontSize: '14px' }}>
                Forgot password?
              </a>
            </div>
            <a href="#" style={{ color: '#007C89', textDecoration: 'underline', fontSize: '14px' }}>
              Can't log in?
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        fontSize: '12px',
        color: '#666666'
      }}>
        <div>
          ©2024 Intuit Inc. All rights reserved. Mailchimp® is a registered trademark of The Rocket Science Group,
        </div>
        <div style={{ marginTop: '5px' }}>
          <a href="#" style={{ color: '#666666', textDecoration: 'underline', marginRight: '10px' }}>Cookie Preferences</a>
          <a href="#" style={{ color: '#666666', textDecoration: 'underline', marginRight: '10px' }}>Privacy</a>
          <a href="#" style={{ color: '#666666', textDecoration: 'underline' }}>Terms</a>
        </div>
      </div>

      {/* Feedback Button */}
      <div style={{
        position: 'fixed',
        right: '0',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: '#333333',
        color: '#FFFFFF',
        padding: '10px 5px',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        fontSize: '12px',
        cursor: 'pointer',
        zIndex: 10
      }}>
        Feedback
      </div>
    </div>
  );
};

export default Login;