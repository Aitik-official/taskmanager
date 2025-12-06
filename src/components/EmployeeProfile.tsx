'use client'

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, MapPin, Building, Shield, Eye, EyeOff } from 'lucide-react';
import { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getEmployeeById } from '../services/employeeService';

const EmployeeProfile: React.FC = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadEmployeeProfile = async () => {
      if (!user?.id) {
        console.error('❌ User ID not found:', user);
        setError('User ID not found');
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔄 Loading employee profile for user ID:', user.id);
        console.log('🔄 User object:', user);
        // Pass email as fallback for non-ObjectId IDs (like mock users)
        const employeeData = await getEmployeeById(user.id, user.email);
        console.log('✅ Employee profile loaded:', employeeData);
        setEmployee(employeeData);
      } catch (err: any) {
        console.error('❌ Error loading employee profile:', err);
        console.error('❌ Error details:', err.response?.data || err.message);
        setError(`Failed to load employee profile: ${err.response?.data?.message || err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployeeProfile();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '256px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '2px solid #e5e7eb',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          <div style={{
            flexShrink: 0
          }}>
            <Shield style={{ height: '24px', width: '24px', color: '#f87171' }} />
          </div>
          <div style={{
            marginLeft: '12px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#991b1b',
              margin: 0
            }}>Error Loading Profile</h3>
            <div style={{
              marginTop: '8px',
              fontSize: '14px',
              color: '#b91c1c'
            }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fed7aa',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          <div style={{
            flexShrink: 0
          }}>
            <User style={{ height: '24px', width: '24px', color: '#fbbf24' }} />
          </div>
          <div style={{
            marginLeft: '12px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#92400e',
              margin: 0
            }}>Profile Not Found</h3>
            <div style={{
              marginTop: '8px',
              fontSize: '14px',
              color: '#b45309'
            }}>Unable to load your employee profile.</div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: Employee['status']) => {
    switch (status) {
      case 'Active': return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'Inactive': return { backgroundColor: '#fee2e2', color: '#991b1b' };
      case 'On Leave': return { backgroundColor: '#fef3c7', color: '#92400e' };
      default: return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0
            }}>My Profile</h1>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '4px',
              margin: 0
            }}>
              View your personal and work information
            </p>
          </div>
          <div style={{
            fontSize: '32px'
          }}>👤</div>
        </div>
      </div>

      {/* Profile Information */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
      }}>
        {/* Personal Information */}
        <div style={{
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          borderRadius: '8px',
          padding: '24px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            margin: 0
          }}>
            <User style={{ height: '20px', width: '20px', marginRight: '8px', color: '#2563eb' }} />
            Personal Information
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#dbeafe',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#2563eb',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Full Name</div>
                <div style={{
                  fontWeight: '500',
                  color: '#111827'
                }}>
                  {employee.firstName} {employee.lastName}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#dbeafe',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#2563eb',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Email Address</div>
                <div style={{
                  fontWeight: '500',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Mail style={{ height: '16px', width: '16px', marginRight: '8px', color: '#9ca3af' }} />
                  {employee.email}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#dbeafe',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#2563eb',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Phone Number</div>
                <div style={{
                  fontWeight: '500',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Phone style={{ height: '16px', width: '16px', marginRight: '8px', color: '#9ca3af' }} />
                  {employee.phone}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#dbeafe',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#2563eb',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Joining Date</div>
                <div style={{
                  fontWeight: '500',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Calendar style={{ height: '16px', width: '16px', marginRight: '8px', color: '#9ca3af' }} />
                  {formatDate(employee.joiningDate)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Work Information */}
        <div style={{
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          borderRadius: '8px',
          padding: '24px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            margin: 0
          }}>
            <Building style={{ height: '20px', width: '20px', marginRight: '8px', color: '#059669' }} />
            Work Information
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#dcfce7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#059669',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Position</div>
                <div style={{
                  fontWeight: '500',
                  color: '#111827'
                }}>{employee.position}</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#dcfce7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#059669',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Department</div>
                <div style={{
                  fontWeight: '500',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <MapPin style={{ height: '16px', width: '16px', marginRight: '8px', color: '#9ca3af' }} />
                  {employee.department}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#dcfce7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#059669',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Role</div>
                <div style={{
                  fontWeight: '500',
                  color: '#111827'
                }}>{employee.role}</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#dcfce7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#059669',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Status</div>
                <span style={{
                  padding: '4px 8px',
                  display: 'inline-flex',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '9999px',
                  ...getStatusColor(employee.status)
                }}>
                  {employee.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div style={{
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          margin: 0
        }}>
          <Shield style={{ height: '20px', width: '20px', marginRight: '8px', color: '#7c3aed' }} />
          Account Information
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#f3e8ff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#7c3aed',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Username</div>
                <div style={{
                  fontWeight: '500',
                  color: '#111827'
                }}>@{employee.username}</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#f3e8ff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#7c3aed',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Password</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    fontWeight: '500',
                    color: '#111827'
                  }}>
                    {showPassword ? employee.password : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      color: '#6b7280',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = '#374151';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = '#6b7280';
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff style={{ height: '16px', width: '16px' }} /> : <Eye style={{ height: '16px', width: '16px' }} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#f3e8ff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#7c3aed',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Employee ID</div>
                <div style={{
                  fontWeight: '500',
                  color: '#111827',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}>
                  {employee.id || employee._id || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#f3e8ff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#7c3aed',
                  borderRadius: '50%'
                }}></div>
              </div>
              <div style={{
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>Account Created</div>
                <div style={{
                  fontWeight: '500',
                  color: '#111827'
                }}>
                  {employee.createdAt ? formatDate(employee.createdAt) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div style={{
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start'
        }}>
          <Shield style={{ 
            height: '20px', 
            width: '20px', 
            color: '#2563eb',
            marginTop: '2px',
            marginRight: '12px',
            flexShrink: 0
          }} />
          <div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#1e40af',
              margin: 0
            }}>Security Information</h3>
            <div style={{
              marginTop: '4px',
              fontSize: '14px',
              color: '#1d4ed8'
            }}>
              <p style={{ margin: 0, marginBottom: '4px' }}>• This profile contains your personal and work information</p>
              <p style={{ margin: 0, marginBottom: '4px' }}>• Only you can view your password and account details</p>
              <p style={{ margin: 0 }}>• Contact your administrator if you need to update any information</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
