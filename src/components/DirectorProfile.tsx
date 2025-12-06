'use client'

import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Calendar, Building, Shield, Save, Edit, X, Eye, EyeOff, Camera, Upload } from 'lucide-react';
import { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getEmployeeById, updateEmployee, createEmployee } from '../services/employeeService';

const DirectorProfile: React.FC = () => {
  const { user, login } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee & { profilePicture?: string }>>({});
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>('');
  const [isFallbackData, setIsFallbackData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadEmployeeProfile = async () => {
      if (!user?.id) {
        console.error('❌ User ID not found:', user);
        setError('User ID not found');
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔄 Loading director profile for user ID:', user.id);
        // Pass email as fallback for non-ObjectId IDs (like mock users)
        const employeeData = await getEmployeeById(user.id, user.email);
        console.log('✅ Director profile loaded:', employeeData);
        setEmployee(employeeData);
        const profilePic = (employeeData as any).profilePicture || (employeeData as any).avatar || '';
        setProfilePicture(profilePic);
        setProfilePicturePreview(profilePic);
        setFormData({
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          email: employeeData.email,
          phone: employeeData.phone,
          position: employeeData.position,
          department: employeeData.department,
          joiningDate: employeeData.joiningDate,
          status: employeeData.status,
          username: employeeData.username,
          profilePicture: profilePic
        });
      } catch (err: any) {
        console.error('❌ Error loading director profile:', err);
        
        // If employee not found (404), create a fallback employee object from user data
        if (err.response?.status === 404 || err.message?.includes('not found')) {
          console.log('⚠️ Employee not found in database, creating fallback from user data');
          setIsFallbackData(true);
          const nameParts = user.name?.split(' ') || ['', ''];
          const fallbackEmployee: Employee = {
            id: user.id,
            firstName: nameParts[0] || 'Director',
            lastName: nameParts.slice(1).join(' ') || 'User',
            email: user.email || '',
            phone: '',
            position: user.role || 'Director',
            department: 'Management',
            joiningDate: new Date().toISOString(),
            status: 'Active',
            username: user.email?.split('@')[0] || 'director',
            password: '',
            role: user.role as 'Director' | 'Project Head' | 'Employee'
          };
          
          setEmployee(fallbackEmployee);
          setFormData({
            firstName: fallbackEmployee.firstName,
            lastName: fallbackEmployee.lastName,
            email: fallbackEmployee.email,
            phone: fallbackEmployee.phone,
            position: fallbackEmployee.position,
            department: fallbackEmployee.department,
            joiningDate: fallbackEmployee.joiningDate,
            status: fallbackEmployee.status,
            username: fallbackEmployee.username,
            profilePicture: ''
          });
          setError(''); // Clear error since we have fallback data
        } else {
          setError(`Failed to load profile: ${err.response?.data?.message || err.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployeeProfile();
  }, [user?.id]);

  const handleInputChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        window.alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        window.alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfilePicture(base64String);
        setProfilePicturePreview(base64String);
        setFormData(prev => ({
          ...prev,
          profilePicture: base64String
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfilePicture('');
    setProfilePicturePreview('');
    setFormData(prev => ({
      ...prev,
      profilePicture: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!employee?.id && !employee?._id) {
      window.alert('Employee ID not found');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.position) {
      window.alert('Please fill in all required fields (First Name, Last Name, Email, Phone, and Designation)');
      return;
    }

    try {
      setSaving(true);
      const employeeId = employee?.id || employee?._id || '';
      // Include profile picture in update data
      const updateData = {
        ...formData,
        profilePicture: profilePicture || formData.profilePicture,
        role: user?.role || employee?.role || 'Director'
      };
      
      let savedEmployee;
      
      // Try to update first
      try {
        // Pass email as fallback for non-ObjectId IDs (like mock users)
        savedEmployee = await updateEmployee(employeeId, updateData, user?.email);
      } catch (updateErr: any) {
        // If update fails with 404, create new employee
        if (updateErr.response?.status === 404 || updateErr.message?.includes('not found')) {
          console.log('⚠️ Employee not found, creating new employee record');
          // Create new employee with required fields
          const newEmployeeData = {
            firstName: formData.firstName!,
            lastName: formData.lastName!,
            email: formData.email!,
            phone: formData.phone || '',
            position: formData.position || 'Director',
            department: formData.department || 'Management',
            joiningDate: formData.joiningDate || new Date().toISOString(),
            status: (formData.status || 'Active') as 'Active' | 'Inactive' | 'On Leave',
            username: formData.username || user?.email?.split('@')[0] || 'director',
            password: employee?.password || 'temp123', // Temporary password, should be changed
            role: (user?.role || 'Director') as 'Director' | 'Project Head' | 'Employee',
            profilePicture: profilePicture || formData.profilePicture || ''
          };
          savedEmployee = await createEmployee(newEmployeeData);
        } else {
          throw updateErr; // Re-throw if it's not a 404 error
        }
      }
      
      setEmployee(savedEmployee);
      const savedProfilePic = (savedEmployee as any).profilePicture || (savedEmployee as any).avatar || '';
      setProfilePicture(savedProfilePic);
      setProfilePicturePreview(savedProfilePic);
      setIsFallbackData(false); // Reset fallback flag since we now have a real employee record
      setIsEditing(false);
      
      // Update user in context if name or email changed
      if (formData.firstName && formData.lastName) {
        const updatedUser = {
          ...user!,
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email || user!.email
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // Note: We can't directly update the context user, but the next login will reflect changes
      }
      
      window.alert('Profile saved successfully!');
    } catch (err: any) {
      console.error('❌ Error saving profile:', err);
      window.alert(`Failed to save profile: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (employee) {
      const profilePic = (employee as any).profilePicture || (employee as any).avatar || '';
      setProfilePicture(profilePic);
      setProfilePicturePreview(profilePic);
      setFormData({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        department: employee.department,
        joiningDate: employee.joiningDate,
        status: employee.status,
        username: employee.username,
        profilePicture: profilePic
      });
    }
    setIsEditing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
            }}>Unable to load your profile.</div>
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
              {isEditing ? 'Edit your personal and work information' : 'View and edit your personal and work information'}
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
              >
                <Edit size={16} />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s ease',
                    opacity: saving ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s ease',
                    opacity: saving ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#10b981';
                    }
                  }}
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Warning Banner for Fallback Data */}
      {isFallbackData && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Shield size={20} color="#92400e" />
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#92400e',
              margin: 0,
              marginBottom: '4px'
            }}>
              Profile Not Found in Database
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#b45309',
              margin: 0
            }}>
              Your profile information is being loaded from your account. Please fill in your details and save to create your employee profile in the system.
            </p>
          </div>
        </div>
      )}

      {/* Profile Picture Section */}
      <div style={{
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        borderRadius: '8px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          margin: 0,
          width: '100%',
          textAlign: 'left'
        }}>
          Profile Picture
        </h2>
        <div style={{
          position: 'relative',
          display: 'inline-block'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '3px solid #ffffff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            {profilePicturePreview || profilePicture ? (
              <img 
                src={profilePicturePreview || profilePicture} 
                alt="Profile" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <User size={48} color="#9ca3af" />
            )}
          </div>
          {isEditing && (
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              display: 'flex',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                title="Upload Photo"
              >
                <Camera size={18} />
              </button>
              {profilePicturePreview && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ef4444';
                  }}
                  title="Remove Photo"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        {!isEditing && (
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0,
            textAlign: 'center'
          }}>
            Click "Edit Profile" to change your profile picture
          </p>
        )}
        {isEditing && (
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0,
            textAlign: 'center'
          }}>
            Click the camera icon to upload a new profile picture (Max 5MB)
          </p>
        )}
      </div>

      {/* Profile Information */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <User size={20} color="#3b82f6" />
            Personal Information
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                First Name *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
              ) : (
                <div style={{
                  fontSize: '16px',
                  color: '#111827',
                  padding: '8px 0'
                }}>
                  {employee.firstName}
                </div>
              )}
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Last Name *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
              ) : (
                <div style={{
                  fontSize: '16px',
                  color: '#111827',
                  padding: '8px 0'
                }}>
                  {employee.lastName}
                </div>
              )}
            </div>

            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                <Mail size={16} color="#6b7280" />
                Email Address *
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
              ) : (
                <div style={{
                  fontSize: '16px',
                  color: '#111827',
                  padding: '8px 0'
                }}>
                  {employee.email}
                </div>
              )}
            </div>

            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                <Phone size={16} color="#6b7280" />
                Phone Number *
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
              ) : (
                <div style={{
                  fontSize: '16px',
                  color: '#111827',
                  padding: '8px 0'
                }}>
                  {employee.phone}
                </div>
              )}
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
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Building size={20} color="#3b82f6" />
            Work Information
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Designation (Position) *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.position || ''}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Enter your designation"
                  required
                />
              ) : (
                <div style={{
                  fontSize: '16px',
                  color: '#111827',
                  padding: '8px 0'
                }}>
                  {employee.position}
                </div>
              )}
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Department
              </label>
              <div style={{
                fontSize: '16px',
                color: '#111827',
                padding: '8px 0'
              }}>
                {employee.department}
              </div>
            </div>

            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                <Calendar size={16} color="#6b7280" />
                Joining Date
              </label>
              <div style={{
                fontSize: '16px',
                color: '#111827',
                padding: '8px 0'
              }}>
                {formatDate(employee.joiningDate)}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Status
              </label>
              <span style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                ...getStatusColor(employee.status)
              }}>
                {employee.status}
              </span>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Username
              </label>
              <div style={{
                fontSize: '16px',
                color: '#111827',
                padding: '8px 0'
              }}>
                {employee.username}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Role
              </label>
              <div style={{
                fontSize: '16px',
                color: '#111827',
                padding: '8px 0',
                fontWeight: '500'
              }}>
                {employee.role}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectorProfile;

