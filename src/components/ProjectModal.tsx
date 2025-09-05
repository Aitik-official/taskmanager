'use client'

import React, { useState, useEffect } from 'react';
import { X, Save, Edit, Trash2, MessageCircle, Send } from 'lucide-react';
import { Project, User, ProjectComment, Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addProjectComment } from '../services/projectService';

interface ProjectModalProps {
  project?: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  users: (User | Employee)[];
  onCommentAdded?: (projectId: string, comment: ProjectComment) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
  onDelete,
  users,
  onCommentAdded
}) => {
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

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
    description: '',
    assignedEmployeeId: '',
    assignedEmployeeName: '',
    status: 'Active',
    startDate: '',
    progress: 0
  });

  useEffect(() => {
    if (project) {
      setFormData({
        ...project,
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        progress: project.progress || 0
      });
    } else {
      setFormData({
        name: '',
        description: '',
        assignedEmployeeId: '',
        assignedEmployeeName: '',
        status: 'Active',
        startDate: '',
        progress: 0
      });
    }
    setIsEditMode(false);
  }, [project]);

  const handleInputChange = (field: keyof Project, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-update assignedEmployeeName when assignedEmployeeId changes
    if (field === 'assignedEmployeeId') {
      const selectedUser = users.find(u => u.id === value);
      if (selectedUser) {
        // Handle both User and Employee types
        const employeeName = 'name' in selectedUser 
          ? selectedUser.name 
          : `${selectedUser.firstName} ${selectedUser.lastName}`;
        
        setFormData(prev => ({
          ...prev,
          assignedEmployeeName: employeeName
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.assignedEmployeeId || !formData.assignedEmployeeName || !formData.startDate) {
      window.alert('Please fill in all required fields');
      return;
    }

    const projectData: Project = {
      id: project?.id || project?._id, // Use existing ID if available
      name: formData.name,
      description: formData.description,
      assignedEmployeeId: formData.assignedEmployeeId || '',
      assignedEmployeeName: formData.assignedEmployeeName || '',
      status: formData.status || 'Active',
      startDate: formData.startDate,
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

  const handleAddComment = async () => {
    if (!commentText.trim() || !project || !user) return;
    
    console.log('Project object:', project);
    console.log('Project ID:', project.id);
    console.log('Project _id:', project._id);
    
    // Use _id if id is not available (MongoDB ObjectId)
    const projectId = project._id || project.id;
    if (!projectId) {
      console.error('No project ID found:', project);
      window.alert('Error: Project ID not found. Please try again.');
      return;
    }
    
    console.log('Using project ID for comment:', projectId);
    console.log('Project ID type:', typeof projectId);
    
    try {
      setIsAddingComment(true);
      console.log('Adding comment to project:', projectId);
      console.log('User data:', { id: user.id, name: user.name, role: user.role });
      
      const commentData = {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        content: commentText.trim()
      };
      
      console.log('Comment data being sent:', commentData);
      
      // Try to save to backend first
      let backendSuccess = false;
      let backendComment: any = null;
      
      try {
        console.log('🔄 Attempting to save comment to backend...');
        console.log('📤 Project ID being sent:', projectId);
        console.log('📤 Comment data being sent:', commentData);
        
        const updatedProject = await addProjectComment(projectId, commentData);
        console.log('✅ Backend response successful:', updatedProject);
        backendSuccess = true;
        
        // Extract the new comment from the backend response
        if (updatedProject.comments && updatedProject.comments.length > 0) {
          // Find the comment we just added (by content and user)
          backendComment = updatedProject.comments.find((c: any) => 
            c.content === commentText.trim() && 
            c.userId === user.id &&
            c.userName === user.name
          );
          console.log('🔍 Found backend comment:', backendComment);
        }
      } catch (backendError: any) {
        console.error('❌ Backend save failed:', backendError);
        console.error('Error details:', {
          message: backendError.message,
          status: backendError.response?.status,
          data: backendError.response?.data
        });
        console.warn('⚠️ Continuing with local update only...');
      }
      
      // Update the local project state to show the new comment immediately
      if (project) {
        // Use backend comment if available, otherwise create local comment
        const newComment = backendComment || {
          id: Date.now().toString(),
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          content: commentText.trim(),
          timestamp: new Date().toISOString(),
          isVisibleToEmployee: true
        };
        
        // Ensure comments array exists
        const currentComments = project.comments || [];
        
        // Update the project object with the new comment
        const updatedLocalProject = {
          ...project,
          comments: [...currentComments, newComment]
        };
        
        console.log('Updated local project:', updatedLocalProject);
        
        // Notify parent component about the new comment
        if (onCommentAdded) {
          onCommentAdded(projectId, newComment);
        }
      }
      
      setCommentText('');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      window.alert('Error adding comment. Please try again.');
    } finally {
      setIsAddingComment(false);
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
            {/* Debug Info */}
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#dbeafe',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Project Info:</p>
              <p style={{ margin: '0 0 4px 0' }}>Project ID: {project.id}</p>
              <p style={{ margin: '0 0 4px 0' }}>Status: {project.status}</p>
              <p style={{ margin: '0 0 4px 0' }}>Progress: {project.progress}%</p>
            </div>

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
                backgroundColor: project.status === 'Active' ? '#dcfce7' :
                                project.status === 'Completed' ? '#dbeafe' :
                                '#fef3c7',
                color: project.status === 'Active' ? '#166534' :
                       project.status === 'Completed' ? '#1e40af' :
                       '#92400e'
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
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Assigned Employee:</span>
                    <span style={{ fontWeight: '500' }}>{project.assignedEmployeeName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Start Date:</span>
                    <span style={{ fontWeight: '500' }}>{new Date(project.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

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
                  Progress
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#6b7280' }}>Completion:</span>
                    <span style={{ fontWeight: '500' }}>{project.progress}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '9999px',
                    height: '12px'
                  }}>
                    <div 
                      style={{
                        height: '12px',
                        borderRadius: '9999px',
                        transition: 'all 0.3s ease',
                        backgroundColor: project.progress === 100 ? '#10b981' : '#3b82f6',
                        width: `${project.progress}%`
                      }}
                    ></div>
                  </div>
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
                Description
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

            {/* Comments Section */}
            <div style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '24px'
            }}>
              <h4 style={{
                fontWeight: '600',
                color: '#111827',
                marginBottom: '16px',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <MessageCircle size={20} style={{ marginRight: '8px' }} />
                Project Comments
              </h4>
              
              {/* Comments List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '16px',
                maxHeight: '240px',
                overflowY: 'auto'
              }}>
                {project.comments && project.comments.length > 0 ? (
                  project.comments.map((comment) => (
                    <div key={comment.id} style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontWeight: '500',
                            fontSize: '14px',
                            color: '#111827'
                          }}>
                            {comment.userName}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            backgroundColor: '#e5e7eb',
                            padding: '2px 8px',
                            borderRadius: '9999px'
                          }}>
                            {comment.userRole}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          {new Date(comment.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p style={{
                        fontSize: '14px',
                        color: '#374151',
                        margin: 0
                      }}>
                        {comment.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    textAlign: 'center',
                    padding: '16px 0',
                    margin: 0
                  }}>
                    No comments yet. Start the conversation!
                  </p>
                )}
              </div>
              
              {/* Add Comment Form */}
              <div style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px'
              }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    style={{
                      flex: 1,
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
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || isAddingComment}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: (!commentText.trim() || isAddingComment) ? '#9ca3af' : '#2563eb',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: (!commentText.trim() || isAddingComment) ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    onMouseOver={(e) => {
                      if (commentText.trim() && !isAddingComment) {
                        e.currentTarget.style.backgroundColor = '#1d4ed8';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (commentText.trim() && !isAddingComment) {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }
                    }}
                  >
                    <Send size={16} />
                    {isAddingComment ? 'Adding...' : 'Send'}
                  </button>
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
                  Assigned Employee *
                </label>
                <select
                  value={formData.assignedEmployeeId}
                  onChange={(e) => handleInputChange('assignedEmployeeId', e.target.value)}
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
                  <option value="">Select Employee</option>
                  {users.filter(u => {
                    // Handle both User and Employee types
                    if ('name' in u) {
                      return u.role === 'Employee'; // User type
                    } else {
                      return u.role === 'Employee'; // Employee type
                    }
                  }).map(user => (
                    <option key={user.id} value={user.id}>
                      {'name' in user ? user.name : `${user.firstName} ${user.lastName}`} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
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
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Progress (%)
                </label>
                <input
                  type="number"
                  value={formData.progress || 0}
                  onChange={(e) => handleInputChange('progress', parseInt(e.target.value) || 0)}
                  min="0"
                  max="100"
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
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
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
