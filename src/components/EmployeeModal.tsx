'use client'

import React, { useState, useEffect } from 'react';
import { X, Save, Edit, Trash2, Eye, EyeOff, CheckSquare, FolderOpen } from 'lucide-react';
import { Employee, Project, Task } from '../types';

interface EmployeeModalProps {
  employee?: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee, assignmentData?: any) => void;
  onDelete?: (employeeId: string) => void;
  projects?: Project[];
  tasks?: Task[];
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSave,
  onDelete,
  projects,
  tasks
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    joiningDate: '',
    status: 'Active',
    username: '',
    password: '',
    role: 'Employee'
  });

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showAssignments, setShowAssignments] = useState(false);

  // Debug logging for props
  useEffect(() => {
    console.log('🔄 EmployeeModal: Props received:', {
      projects: projects?.length || 0,
      tasks: tasks?.length || 0,
      employee: employee?.id || 'none'
    });
  }, [projects, tasks, employee]);

  const departments = [
    'Engineering',
    'Design',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Support'
  ];

  const positions = [
    'Software Engineer',
    'Designer',
    'Marketing Manager',
    'Sales Representative',
    'HR Specialist',
    'Financial Analyst',
    'Operations Manager',
    'Support Specialist'
  ];

  useEffect(() => {
    if (employee) {
      setFormData({
        ...employee,
        joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : ''
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        joiningDate: '',
        status: 'Active',
        username: '',
        password: '',
        role: 'Employee'
      });
    }
    setIsEditMode(false);
  }, [employee]);

  const handleInputChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.phone || !formData.position || !formData.department || 
        !formData.joiningDate || !formData.username || !formData.password) {
      window.alert('Please fill in all required fields');
      return;
    }

    const employeeData: Employee = {
      id: employee?.id || employee?._id,
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      email: formData.email || '',
      phone: formData.phone || '',
      position: formData.position || '',
      department: formData.department || '',
      joiningDate: formData.joiningDate || '',
      status: formData.status || 'Active',
      username: formData.username || '',
      password: formData.password || '',
      role: formData.role || 'Employee'
    };

    try {
      console.log('🔄 Submitting employee with assignments:', {
        employee: employeeData,
        selectedProjects,
        selectedTasks
      });
      
      // Include assignment data
      const assignmentData = {
        employee: employeeData,
        assignedProjects: selectedProjects,
        assignedTasks: selectedTasks
      };
      
      await onSave(employeeData, assignmentData);
      setIsEditMode(false);
      onClose();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      window.alert('Error saving employee. Please try again.');
    }
  };

  const handleDelete = () => {
    if (employee && employee.id && onDelete && window.confirm('Are you sure you want to delete this employee?')) {
      onDelete(employee.id);
      onClose();
    }
  };

  const canEdit = !employee || isEditMode;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '896px',
        width: '100%',
        margin: '0 16px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0
            }}>
              {employee ? (isEditMode ? 'Edit Employee' : 'Employee Details') : 'Add New Employee'}
            </h2>
            {!canEdit && employee && (
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginTop: '4px',
                margin: 0
              }}>
                View only access - Click Edit to modify employee information
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              color: '#9ca3af',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#6b7280';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            <X size={24} />
          </button>
        </div>

        {employee && !isEditMode ? (
          // Employee Details View (Read-only)
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Employee Header */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0
                }}>
                  {employee.firstName} {employee.lastName}
                </h3>
                <p style={{
                  color: '#6b7280',
                  margin: '4px 0 0 0',
                  fontSize: '16px'
                }}>
                  {employee.position}
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}>
                  {employee.department}
                </p>
              </div>
              <span style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: employee.status === 'Active' ? '#dcfce7' :
                                employee.status === 'Inactive' ? '#fecaca' :
                                '#fef3c7',
                color: employee.status === 'Active' ? '#166534' :
                       employee.status === 'Inactive' ? '#dc2626' :
                       '#92400e'
              }}>
                {employee.status}
              </span>
            </div>

            {/* Employee Information */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              <div>
                <h4 style={{
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '12px',
                  fontSize: '16px'
                }}>
                  Contact Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Email:</span>
                    <span style={{ fontWeight: '500' }}>{employee.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Phone:</span>
                    <span style={{ fontWeight: '500' }}>{employee.phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Joining Date:</span>
                    <span style={{ fontWeight: '500' }}>{new Date(employee.joiningDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '12px',
                  fontSize: '16px'
                }}>
                  Account Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Username:</span>
                    <span style={{ fontWeight: '500' }}>{employee.username}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Role:</span>
                    <span style={{ fontWeight: '500' }}>{employee.role}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Password:</span>
                    <span style={{ fontWeight: '500' }}>••••••••</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
              >
                <Edit size={16} />
                Edit Employee
              </button>
              {onDelete && employee && employee.id && (
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                  }}
                >
                  <Trash2 size={16} />
                  Delete Employee
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  color: '#374151',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          // Employee Form (Create/Edit)
          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {/* First Name */}
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
                <input
                  type="text"
                  value={formData.firstName}
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
                  placeholder="Enter first name"
                  required
                />
              </div>

              {/* Last Name */}
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
                <input
                  type="text"
                  value={formData.lastName}
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
                  placeholder="Enter last name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
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
                  placeholder="Enter email"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
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
                  placeholder="Enter phone number"
                  required
                />
              </div>

              {/* Position */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Position *
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#ffffff'
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
                >
                  <option value="">Select position</option>
                  {positions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#ffffff'
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
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Joining Date */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Joining Date *
                </label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => handleInputChange('joiningDate', e.target.value)}
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
              </div>

              {/* Status */}
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
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#ffffff'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              {/* Username */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
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
                  placeholder="Enter username"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 40px 8px 12px',
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
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
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
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Role */}
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
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#ffffff'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="Employee">Employee</option>
                  <option value="Project Head">Project Head</option>
                  <option value="Director">Director</option>
                </select>
              </div>
            </div>

            {/* Task and Project Assignments */}
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '500',
                  color: '#111827',
                  margin: 0
                }}>
                  Assignments
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAssignments(!showAssignments)}
                  style={{
                    color: '#2563eb',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#1d4ed8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = '#2563eb';
                  }}
                >
                  {showAssignments ? 'Hide' : 'Show'} Assignment Options
                </button>
              </div>

              {showAssignments && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Project Assignments */}
                  <div>
                    <label style={{
                      display: 'flex',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '8px',
                      alignItems: 'center'
                    }}>
                      <FolderOpen size={16} style={{ marginRight: '8px', color: '#2563eb' }} />
                      Assign to Projects
                    </label>
                    <div style={{
                      maxHeight: '128px',
                      overflowY: 'auto',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      padding: '8px'
                    }}>
                      {projects && projects.length > 0 ? (
                        projects.map((project) => (
                          <label key={project.id || project._id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 0'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedProjects.includes(project.id || project._id || '')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProjects(prev => [...prev, project.id || project._id || '']);
                                } else {
                                  setSelectedProjects(prev => prev.filter(id => id !== (project.id || project._id || '')));
                                }
                              }}
                              style={{
                                borderRadius: '4px',
                                border: '1px solid #d1d5db',
                                color: '#2563eb',
                                cursor: 'pointer'
                              }}
                            />
                            <span style={{
                              fontSize: '14px',
                              color: '#374151'
                            }}>
                              {project.name} ({project.status})
                            </span>
                          </label>
                        ))
                      ) : (
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          padding: '8px 0',
                          textAlign: 'center'
                        }}>
                          No projects available for assignment
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Assignments */}
                  <div>
                    <label style={{
                      display: 'flex',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '8px',
                      alignItems: 'center'
                    }}>
                      <CheckSquare size={16} style={{ marginRight: '8px', color: '#16a34a' }} />
                      Assign to Tasks
                    </label>
                    <div style={{
                      maxHeight: '128px',
                      overflowY: 'auto',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      padding: '8px'
                    }}>
                      {tasks && tasks.length > 0 ? (
                        tasks.map((task) => (
                          <label key={task.id || task._id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 0'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedTasks.includes(task.id || task._id || '')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTasks(prev => [...prev, task.id || task._id || '']);
                                } else {
                                  setSelectedTasks(prev => prev.filter(id => id !== (task.id || task._id || '')));
                                }
                              }}
                              style={{
                                borderRadius: '4px',
                                border: '1px solid #d1d5db',
                                color: '#16a34a',
                                cursor: 'pointer'
                              }}
                            />
                            <span style={{
                              fontSize: '14px',
                              color: '#374151'
                            }}>
                              {task.title} ({task.status})
                            </span>
                          </label>
                        ))
                      ) : (
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          padding: '8px 0',
                          textAlign: 'center'
                        }}>
                          No tasks available for assignment
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment Summary */}
                  {(selectedProjects.length > 0 || selectedTasks.length > 0) && (
                    <div style={{
                      backgroundColor: '#dbeafe',
                      border: '1px solid #93c5fd',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      <h4 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1e40af',
                        marginBottom: '8px',
                        margin: 0
                      }}>
                        Assignment Summary
                      </h4>
                      <div style={{
                        fontSize: '14px',
                        color: '#1d4ed8',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        {selectedProjects.length > 0 && (
                          <div>📁 Projects: {selectedProjects.length} selected</div>
                        )}
                        {selectedTasks.length > 0 && (
                          <div>✅ Tasks: {selectedTasks.length} selected</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
              {employee && (
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  style={{
                    padding: '8px 16px',
                    color: '#374151',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
              >
                <Save size={16} />
                {employee ? 'Update Employee' : 'Add Employee'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EmployeeModal;
