import React from 'react';
import { User } from '../types';
import { Bell, Search } from 'lucide-react';

interface HeaderProps {
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  return (
    <header style={{
      background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      padding: '16px 24px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            position: 'relative'
          }}>
            <Search style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              height: '16px',
              width: '16px',
              color: 'rgba(255, 255, 255, 0.6)'
            }} />
            <input
              type="text"
              placeholder="Search tasks, projects..."
              style={{
                paddingLeft: '40px',
                paddingRight: '16px',
                paddingTop: '8px',
                paddingBottom: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                outline: 'none',
                width: '256px',
                color: '#ffffff',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                e.target.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <button style={{
            position: 'relative',
            padding: '8px',
            color: 'rgba(255, 255, 255, 0.8)',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}>
            <Bell style={{ height: '20px', width: '20px' }} />
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              height: '8px',
              width: '8px',
              backgroundColor: '#ef4444',
              borderRadius: '50%'
            }}></span>
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              textAlign: 'right'
            }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#ffffff',
                margin: 0
              }}>{user?.name}</p>
              <p style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'capitalize',
                margin: 0
              }}>{user?.role}</p>
            </div>
            <div style={{
              height: '32px',
              width: '32px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {user?.avatar || user?.name?.charAt(0)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
