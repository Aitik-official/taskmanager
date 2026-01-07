'use client'

import React, { useState, useEffect } from 'react';
import { X, Save, Edit, Trash2 } from 'lucide-react';
import { Project, User, Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ProjectModalProps {
  project?: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  users: (User | Employee)[];
  // Callback reserved for adding comments to a project (currently unused here)
  onCommentAdded?: (projectId: string, comment: any) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
  onDelete,
  users
}) => {
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);

  // Debug logging for users prop
  useEffect(() => {
    console.log('🔄 ProjectModal: Users prop received:', {
      totalUsers: users?.length || 0,
      employeeUsers: users?.filter(u => u.role === 'Employee').length || 0,
      users: users?.map(u => ({
        id: u.id,
        name: 'name' in u ? u.name : `${u.firstName} ${u.lastName}`,
        role: u.role
      }))
    });
  }, [users]);
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    projectNumber: '',
    location: '',
    description: '',
    contactDetails: '',
    projectRemarks: [],
    assignedEmployeeId: '',
    assignedEmployeeName: '',
    status: 'Current',
    startDate: '',
    progress: 0
  });

  // State for managing project remarks
  const [newRemarkDate, setNewRemarkDate] = useState('');
  const [newRemarkText, setNewRemarkText] = useState('');

  useEffect(() => {
    if (project) {
      setFormData({
        ...project,
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        progress: project.progress || 0,
        projectRemarks: project.projectRemarks || []
      });
    } else {
      setFormData({
        name: '',
        projectNumber: '',
        location: '',
        description: '',
        contactDetails: '',
        projectRemarks: [],
        assignedEmployeeId: '',
        assignedEmployeeName: '',
        status: 'Current',
        startDate: '',
        progress: 0
      });
    }
    setIsEditMode(false);
    setNewRemarkDate('');
    setNewRemarkText('');
  }, [project, user]);

  const handleInputChange = (field: keyof Project, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description) {
      window.alert('Please fill in all required fields');
      return;
    }

    const projectData: Project = {
      id: project?.id || project?._id, // Use existing ID if available
      name: formData.name,
      projectNumber: formData.projectNumber || '',
      location: formData.location || '',
      description: formData.description,
      contactDetails: formData.contactDetails || '',
      projectRemarks: formData.projectRemarks || [],
      assignedEmployeeId: formData.assignedEmployeeId || '',
      assignedEmployeeName: formData.assignedEmployeeName || '',
      status: formData.status || 'Current',
      startDate: formData.startDate || '',
      progress: Number(formData.progress) || 0
    };

    try {
      await onSave(projectData);
      setIsEditMode(false);
      onClose(); // Close the modal after successful save
    } catch (error: any) {
      console.error('Error saving project:', error);
      window.alert('Error saving project. Please try again.');
    }
  };

  const handleDelete = () => {
    if (project && project.id && onDelete && canEdit && window.confirm('Are you sure you want to delete this project?')) {
      onDelete(project.id);
      onClose();
    }
  };

  const canEdit = user?.role === 'Director';

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
              {project ? (isEditMode ? 'Edit Project' : 'Project Details') : 'Create New Project'}
            </h2>
            {!canEdit && project && (
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginTop: '4px',
                margin: 0
              }}>
                {user?.role === 'Employee' ? 'Employee View - Read Only Access' : 
                 user?.role === 'Project Head' ? 'Project Head View - Limited Access' : 
                 'View Only Access'}
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

        {project && !isEditMode ? (
          // Project Details View (Read-only)
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Project Header */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#111827',
                margin: 0
              }}>
                {project.name}
              </h3>
              <span style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: project.status === 'Current' ? '#dcfce7' :
                                project.status === 'Upcoming' ? '#dbeafe' :
                                project.status === 'Completed' ? '#dbeafe' :
                                project.status === 'Sleeping (On Hold)' ? '#fef3c7' :
                                '#f3f4f6',
                color: project.status === 'Current' ? '#166534' :
                       project.status === 'Upcoming' ? '#1e40af' :
                       project.status === 'Completed' ? '#1e40af' :
                       project.status === 'Sleeping (On Hold)' ? '#92400e' :
                       '#374151'
              }}>
                {project.status}
              </span>
            </div>

            {/* Project Information */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <h4 style={{
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '12px',
                  fontSize: '16px'
                }}>
                  Project Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  {project.projectNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Project Number:</span>
                      <span style={{ fontWeight: '500' }}>{project.projectNumber}</span>
                    </div>
                  )}
                  {project.location && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Location:</span>
                      <span style={{ fontWeight: '500' }}>{project.location}</span>
                    </div>
                  )}
                  {project.assignedEmployeeName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Assigned Employee:</span>
                      <span style={{ fontWeight: '500' }}>{project.assignedEmployeeName}</span>
                    </div>
                  )}
                  {project.startDate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Start Date:</span>
                      <span style={{ fontWeight: '500' }}>{new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Description */}
            <div>
              <h4 style={{
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px',
                fontSize: '16px'
              }}>
                Project Description
              </h4>
              <p style={{
                color: '#374151',
                backgroundColor: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                margin: 0,
                lineHeight: '1.5'
              }}>
                {project.description}
              </p>
            </div>

            {/* Contact Details */}
            {project.contactDetails && (
              <div>
                <h4 style={{
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '8px',
                  fontSize: '16px'
                }}>
                  Contact Details
                </h4>
                <p style={{
                  color: '#374151',
                  backgroundColor: '#f9fafb',
                  padding: '16px',
                  borderRadius: '8px',
                  margin: 0,
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}>
                  {project.contactDetails}
                </p>
              </div>
            )}

            {/* Project Remarks */}
            {project.projectRemarks && project.projectRemarks.length > 0 && (
              <div>
                <h4 style={{
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '12px',
                  fontSize: '16px'
                }}>
                  Project Remarks
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {project.projectRemarks.map((remark, index) => (
                    <div key={index} style={{
                      backgroundColor: '#f9fafb',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginBottom: '8px',
                        fontWeight: '500'
                      }}>
                        {new Date(remark.date).toLocaleDateString()}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#374151',
                        lineHeight: '1.5'
                      }}>
                        {remark.remark}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
              {canEdit && (
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
                  Edit Project
                </button>
              )}
              {canEdit && onDelete && project && project.id && (
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
                  Delete Project
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
          // Create/Edit Project Form
          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., ABC, XYZ, LRQ"
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

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Project Number
                </label>
                <input
                  type="text"
                  value={formData.projectNumber || ''}
                  onChange={(e) => handleInputChange('projectNumber', e.target.value)}
                  placeholder="e.g., 2025-001"
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
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Project location"
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
                />
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
                  <option value="Current">Current</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Sleeping (On Hold)">Sleeping (On Hold)</option>
                  <option value="Completed">Completed</option>
                </select>
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
                Project Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                placeholder="Enter project description"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
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

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Contact Details
              </label>
              <textarea
                value={formData.contactDetails || ''}
                onChange={(e) => handleInputChange('contactDetails', e.target.value)}
                rows={3}
                placeholder="Enter contact details (phone, email, etc.)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Project Remarks Section */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Project Remarks (Date-wise)
              </label>
              
              {/* Existing Remarks */}
              {formData.projectRemarks && formData.projectRemarks.length > 0 && (
                <div style={{
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {formData.projectRemarks.map((remark, index) => (
                    <div key={index} style={{
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '4px',
                          fontWeight: '500'
                        }}>
                          {new Date(remark.date).toLocaleDateString()}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#111827'
                        }}>
                          {remark.remark}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedRemarks = formData.projectRemarks?.filter((_, i) => i !== index) || [];
                          handleInputChange('projectRemarks', updatedRemarks);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#fecaca';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#fee2e2';
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Remark */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr auto',
                  gap: '12px',
                  alignItems: 'flex-end'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={newRemarkDate}
                      onChange={(e) => setNewRemarkDate(e.target.value)}
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
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      Remark
                    </label>
                    <input
                      type="text"
                      value={newRemarkText}
                      onChange={(e) => setNewRemarkText(e.target.value)}
                      placeholder="Enter remark"
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
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newRemarkDate && newRemarkText.trim()) {
                          e.preventDefault();
                          const updatedRemarks = [...(formData.projectRemarks || []), {
                            date: newRemarkDate,
                            remark: newRemarkText.trim()
                          }];
                          handleInputChange('projectRemarks', updatedRemarks);
                          setNewRemarkDate('');
                          setNewRemarkText('');
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (newRemarkDate && newRemarkText.trim()) {
                        const updatedRemarks = [...(formData.projectRemarks || []), {
                          date: newRemarkDate,
                          remark: newRemarkText.trim()
                        }];
                        handleInputChange('projectRemarks', updatedRemarks);
                        setNewRemarkDate('');
                        setNewRemarkText('');
                      }
                    }}
                    disabled={!newRemarkDate || !newRemarkText.trim()}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: (!newRemarkDate || !newRemarkText.trim()) ? '#9ca3af' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (!newRemarkDate || !newRemarkText.trim()) ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => {
                      if (newRemarkDate && newRemarkText.trim()) {
                        e.currentTarget.style.backgroundColor = '#1d4ed8';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (newRemarkDate && newRemarkText.trim()) {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

                                    {/* Form Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
                          {project && isEditMode && (
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
                              Cancel Edit
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
                            {project && isEditMode ? 'Update Project' : 'Create Project'}
                          </button>
                        </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProjectModal;
