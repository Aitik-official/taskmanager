import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Home, CheckSquare, FolderOpen, Users, LogOut, User, Briefcase } from 'lucide-react';

interface SidebarProps {
  activeTab: 'overview' | 'tasks' | 'projects' | 'employees' | 'profile' | 'independent-work';
  onTabChange: (tab: 'overview' | 'tasks' | 'projects' | 'employees' | 'profile' | 'independent-work') => void;
  isEmployee?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isEmployee = false }) => {
  const { logout, user } = useAuth();

  // Different tabs for employees vs directors/project heads
  const tabs = isEmployee 
    ? [
        { id: 'overview', label: 'Dashboard', icon: Home },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        { id: 'projects', label: 'Projects', icon: FolderOpen },
        { id: 'independent-work', label: 'Independent Work', icon: Briefcase },
        { id: 'profile', label: 'Profile', icon: Users },
      ]
    : [
        { id: 'overview', label: 'Dashboard', icon: Home },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        { id: 'projects', label: 'Projects', icon: FolderOpen },
        { id: 'employees', label: 'Employees', icon: Users },
        { id: 'independent-work', label: 'Independent Work', icon: Briefcase },
        { id: 'profile', label: 'Profile', icon: User },
      ];

  return (
    <div style={{
      width: '256px',
      height: '100vh',
      backgroundColor: '#1e3a8a',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 10
    }}>
      {/* Company Branding */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h1 style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: '4px'
        }}>
          Korals Design Pvt.Ltd
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#94a3b8',
          margin: 0
        }}>
          Project Monitoring Application
        </p>
      </div>

      {/* Navigation Menu */}
      <div style={{
        flex: 1,
        padding: '16px'
      }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as 'overview' | 'tasks' | 'projects' | 'employees' | 'profile' | 'independent-work')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                <Icon size={20} />
                <span style={{ fontWeight: '500', fontSize: '14px' }}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#ffffff',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.name || 'User'}
            </p>
            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              margin: 0,
              textTransform: 'capitalize'
            }}>
              {user?.role || 'Employee'}
            </p>
          </div>
        </div>
        
        <button
          onClick={logout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            color: '#cbd5e1',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '14px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#cbd5e1';
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
