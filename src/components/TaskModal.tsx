'use client'

import React, { useState, useEffect } from 'react';
import { Task, Project, User, Employee } from '../types';
import { X, Save, MessageSquare, AlertTriangle } from 'lucide-react';
import { taskApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface TaskModalProps {
  task?: Task | null;
  projects: Project[];
  users: (User | Employee)[];
  onClose: () => void;
  onSave: (task: Task) => void;
  isDirector: boolean;
  isProjectHead: boolean;
  isEmployee: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({
  task,
  projects,
  users,
  onClose,
  onSave,
  isDirector,
  isProjectHead,
  isEmployee
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    assignedToId: '',
    priority: 'Less Urgent',
    status: 'Pending',
    dueDate: '',
    estimatedHours: 0,
    directorRating: undefined,
    isLocked: false
  });
  
  const [newComment, setNewComment] = useState('');
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionData, setExtensionData] = useState({
    newDeadline: '',
    reason: '',
    responseComment: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        dueDate: task.dueDate ? (task.dueDate.split('T')[0] || task.dueDate) : (task.startDate ? task.startDate.split('T')[0] : '')
      });
    }
  }, [task]);


  const handleInputChange = (field: keyof Task, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-update related fields when IDs change
      if (field === 'projectId') {
        const project = projects.find(p => p.id === value);
        if (project) {
          updated.projectName = project.name;
        }
      }
      
      if (field === 'assignedToId') {
        const user = users.find(u => u.id === value);
        if (user) {
          // Handle both User and Employee types
          const userName = 'name' in user 
            ? user.name 
            : `${user.firstName} ${user.lastName}`;
          updated.assignedToName = userName;
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData: Task = {
      id: task?.id || task?._id || Date.now().toString(),
      // Only include _id if we're editing an existing task
      ...(task?._id && { _id: task._id }),
      title: formData.title || '',
      description: formData.description || '',
      projectId: formData.projectId || '',
      projectName: formData.projectName || projects.find(p => p.id === formData.projectId)?.name || '',
      assignedToId: formData.assignedToId || '',
      assignedToName: formData.assignedToName || (() => {
        const foundUser = users.find(u => u.id === formData.assignedToId);
        if (foundUser) {
          return 'name' in foundUser ? foundUser.name : `${foundUser.firstName} ${foundUser.lastName}`;
        }
        return '';
      })(),
      assignedById: task?.assignedById || user?.id || '1',
      assignedByName: task?.assignedByName || user?.name || 'Admin',
      priority: formData.priority || 'Less Urgent',
      status: formData.status || 'Pending',
      estimatedHours: formData.estimatedHours || 0,
      actualHours: task?.actualHours,
      startDate: formData.dueDate || formData.startDate || '', // Keep for backward compatibility
      dueDate: formData.dueDate || '',
      completedDate: task?.completedDate,
      isLocked: formData.isLocked || false,
      comments: task?.comments || [],
      rating: task?.rating,
      ratingComment: task?.ratingComment,
      directorRating: formData.directorRating,
      newDeadlineProposal: task?.newDeadlineProposal,
      reasonForExtension: task?.reasonForExtension,
      extensionRequestStatus: task?.extensionRequestStatus || 'Pending'
    };

    onSave(taskData);
    
    // If editing, exit edit mode
    if (isEditMode) {
      setIsEditMode(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !task) return;
    
    // Use _id if id is not available (MongoDB uses _id)
    const taskId = task.id || task._id;
    
    if (!taskId) {
      console.error('No task ID available:', task);
      return;
    }
    
    console.log('Adding comment to task:', taskId);
    console.log('Current task comments:', task.comments);
    
    try {
      // Add comment to database
      const updatedTask = await taskApi.addComment(
        taskId as string,
        newComment,
        user?.id || 'current-user',
        user?.name || 'Current User'
      );
      
      console.log('Comment added to database:', updatedTask);
      console.log('Updated task comments:', updatedTask.comments);
      
      // Update the local task state to show the comment immediately
      const updatedLocalTask = {
        ...task,
        comments: updatedTask.comments
      };
      
      console.log('Calling onSave with updated task:', updatedLocalTask);
      
      // Call onSave with the updated task to refresh the parent component
      onSave(updatedLocalTask);
      setNewComment('');
      
    } catch (error: any) {
      console.error('Error adding comment:', error);
      // Fallback to local update if API fails
    const comment = {
      id: Date.now().toString(),
        _id: Date.now().toString(), // MongoDB ID
        taskId: taskId as string,
        userId: user?.id || 'current-user',
        userName: user?.name || 'Current User',
      content: newComment,
      timestamp: new Date().toISOString(),
      isVisibleToEmployee: true
    };

      const updatedTask = {
        ...task,
        comments: [...(task.comments || []), comment]
      };
      onSave(updatedTask);
    setNewComment('');
    }
  };

  const handleExtensionRequest = () => {
    if (!extensionData.newDeadline || !extensionData.reason || !task) return;
    
    const updatedTask = {
      ...task,
      newDeadlineProposal: extensionData.newDeadline,
      reasonForExtension: extensionData.reason,
      extensionRequestStatus: 'Pending' as const,
      extensionRequestDate: new Date().toISOString()
    };
    
    onSave(updatedTask);
    setShowExtensionForm(false);
    setExtensionData({ newDeadline: '', reason: '', responseComment: '' });
  };

  const handleExtensionResponse = async (status: 'Approved' | 'Rejected') => {
    if (!task || !extensionData.responseComment) return;
    
    try {
      const taskId = task.id || task._id;
      if (!taskId) {
        console.error('No task ID available for extension response:', task);
        return;
      }
      
      await taskApi.updateExtensionStatus(
        taskId,
        status,
        extensionData.responseComment,
        user?.name || 'Admin'
      );
      
      // Reload the task data
      const updatedTask = {
        ...task,
        extensionRequestStatus: status,
        extensionResponseComment: extensionData.responseComment
      };
      
      onSave(updatedTask);
      setExtensionData(prev => ({ ...prev, responseComment: '' }));
    } catch (error: any) {
      console.error('Error updating extension status:', error);
    }
  };

  const canEdit = isDirector || (isProjectHead && !task?.isLocked) || (isEmployee && !task?.isLocked);
  

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
      padding: '16px',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '896px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            {task ? 'Task Details' : 'Create New Task'}
          </h2>
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

        {task && !isEditMode ? (
          // Task Details View (Read-only)
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Task Header with Title and Status */}
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
                {task.title}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: task.priority === 'Urgent' ? '#fecaca' :
                                  task.priority === 'Less Urgent' ? '#fef3c7' :
                                  task.priority === 'Free Time' ? '#dcfce7' :
                                  '#f3f4f6',
                  color: task.priority === 'Urgent' ? '#dc2626' :
                         task.priority === 'Less Urgent' ? '#92400e' :
                         task.priority === 'Free Time' ? '#166534' :
                         '#374151'
                }}>
                  {task.priority} Priority
                </span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: task.status === 'Completed' ? '#dcfce7' :
                                  task.status === 'In Progress' ? '#fef3c7' :
                                  task.status === 'Pending' ? '#dbeafe' :
                                  '#fecaca',
                  color: task.status === 'Completed' ? '#166534' :
                         task.status === 'In Progress' ? '#92400e' :
                         task.status === 'Pending' ? '#1e40af' :
                         '#dc2626'
                }}>
                  {task.status}
                </span>
              </div>
            </div>

            {/* Task Information & Timeline Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {/* Task Information Card */}
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
                  Task Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Project:</span>
                    <span style={{ fontWeight: '500' }}>{task.projectName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Assigned To:</span>
                    <span style={{ fontWeight: '500' }}>{task.assignedToName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Created:</span>
                    <span style={{ fontWeight: '500' }}>
                      {task.startDate
                        ? new Date(task.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : 'No start date'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline Card */}
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
                  Timeline
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Start Date:</span>
                    <span style={{ fontWeight: '500' }}>
                      {task.startDate
                        ? new Date(task.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : 'No start date'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div>
              <h4 style={{
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px',
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
                {task.description}
              </p>
            </div>

            {/* Comments Section */}
            <div>
              <h4 style={{
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Comments</span>
                <span style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '4px 8px',
                  borderRadius: '9999px'
                }}>
                  {(task.comments || []).length} comment{(task.comments || []).length !== 1 ? 's' : ''}
                </span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {(task.comments || []).length > 0 ? (
                  (task.comments || []).map(comment => (
                    <div key={comment.id || comment._id} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flexShrink: 0 }}>
                        <div style={{
                          height: '32px',
                          width: '32px',
                          backgroundColor: '#2563eb',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          {comment.userName.charAt(0)}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                            {comment.userName}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {(() => {
                              const now = new Date();
                              const commentTime = new Date(comment.timestamp);
                              const diffHours = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60 * 60));
                              if (diffHours < 1) return 'Just now';
                              if (diffHours === 1) return '1 hour ago';
                              return `${diffHours} hours ago`;
                            })()}
                          </span>
                        </div>
                        <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                    No comments yet.
                  </p>
                )}
              </div>

              {/* Add Comment Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  <strong>Commenting as:</strong> {user?.name || 'Current User'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write your comment here..."
                    rows={3}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none',
                      resize: 'none',
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
                <button
                  type="button"
                  onClick={addComment}
                    disabled={!newComment.trim()}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: !newComment.trim() ? '#9ca3af' : '#2563eb',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: !newComment.trim() ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s ease',
                      alignSelf: 'flex-end',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    onMouseOver={(e) => {
                      if (newComment.trim()) {
                        e.currentTarget.style.backgroundColor = '#1d4ed8';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (newComment.trim()) {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }
                    }}
                >
                    Add Comment
                </button>
                </div>
              </div>
            </div>

            {/* Extension Request Section */}
            {task && task.status !== 'Completed' && new Date(task.dueDate) < new Date() && !task.newDeadlineProposal && isEmployee && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                  Request Extension
                </h4>
                
                {!showExtensionForm ? (
                  <button
                    type="button"
                    onClick={() => setShowExtensionForm(true)}
                    className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    Request New Deadline
                  </button>
                ) : (
                  <div className="space-y-4 p-4 bg-orange-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Proposed Deadline
                      </label>
                      <input
                        type="date"
                        value={extensionData.newDeadline}
                        onChange={(e) => setExtensionData(prev => ({ ...prev, newDeadline: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Extension
                      </label>
                      <textarea
                        value={extensionData.reason}
                        onChange={(e) => setExtensionData(prev => ({ ...prev, reason: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Please provide a valid reason for the extension request..."
                        required
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleExtensionRequest}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Submit Request
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowExtensionForm(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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
              
              
              
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    console.log('Edit button clicked!');
                    console.log('Setting edit mode to true');
                    console.log('Current task:', task);
                    setIsEditMode(true);
                    setFormData({
                      ...task,
                      dueDate: task.dueDate ? (task.dueDate.split('T')[0] || task.dueDate) : (task.startDate ? task.startDate.split('T')[0] : ''),
                      startDate: task.startDate ? task.startDate.split('T')[0] : ''
                    });
                    console.log('Form data set:', {
                      ...task,
                      dueDate: task.dueDate ? (task.dueDate.split('T')[0] || task.dueDate) : (task.startDate ? task.startDate.split('T')[0] : ''),
                      startDate: task.startDate ? task.startDate.split('T')[0] : ''
                    });
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
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
                  Edit Task
                </button>
              )}
            </div>
          </div>
        ) : task && isEditMode ? (
          // Edit Task Form
          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Edit Task
              </h3>
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                style={{
                  color: '#6b7280',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                Cancel Edit
              </button>
            </div>
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
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                disabled={false}
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
                Select Project
              </label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => handleInputChange('projectId', e.target.value)}
                disabled={false}
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
                <option value="">No Project (Optional)</option>
                {projects.map(project => (
                  <option key={project.id || project._id} value={project.id || project._id}>
                    {project.name}
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
                Assigned To (Staff User) *
              </label>
              <select
                value={formData.assignedToId}
                onChange={(e) => handleInputChange('assignedToId', e.target.value)}
                disabled={false}
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
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {'name' in user ? user.name : `${user.firstName} ${user.lastName}`}
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
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value as 'Urgent' | 'Less Urgent' | 'Free Time')}
                disabled={false}
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
                <option value="Urgent">Urgent</option>
                <option value="Less Urgent">Less Urgent</option>
                <option value="Free Time">Free Time</option>
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
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={false}
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
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
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
                Due Date *
              </label>
              <input
                type="date"
                value={formData.dueDate || (formData.startDate ? formData.startDate.split('T')[0] : '')}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                disabled={false}
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
                Estimated Hours *
              </label>
              <input
                type="number"
                value={formData.estimatedHours || 0}
                onChange={(e) => handleInputChange('estimatedHours', parseInt(e.target.value) || 0)}
                disabled={false}
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
                min="0"
                required
              />
            </div>

            {isDirector && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Director Rating
                </label>
                <select
                  value={formData.directorRating === undefined ? '' : (typeof formData.directorRating === 'boolean' ? (formData.directorRating ? 'Yes' : 'No') : formData.directorRating.toString())}
                  onChange={(e) => {
                    const value = e.target.value;
                    let ratingValue: boolean | number | 'Yes' | 'No' | undefined;
                    if (value === 'Yes') ratingValue = 'Yes';
                    else if (value === 'No') ratingValue = 'No';
                    else if (value === 'true') ratingValue = true;
                    else if (value === 'false') ratingValue = false;
                    else if (value.match(/^\d+$/)) ratingValue = parseInt(value);
                    else ratingValue = undefined;
                    handleInputChange('directorRating', ratingValue);
                  }}
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
                  <option value="">Select Rating</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="1">⭐ (1 Star)</option>
                  <option value="2">⭐⭐ (2 Stars)</option>
                  <option value="3">⭐⭐⭐ (3 Stars)</option>
                  <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                </select>
              </div>
            )}

            {isDirector && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                gridColumn: '1 / -1'
              }}>
                <input
                  type="checkbox"
                  id="isLocked"
                  checked={formData.isLocked}
                  onChange={(e) => handleInputChange('isLocked', e.target.checked)}
                  style={{
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    color: '#2563eb',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <label htmlFor="isLocked" style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}>
                  Lock Task (Prevent Employee Edits)
                </label>
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
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={false}
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

          {/* Save Button for Edit Mode */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb'
          }}>
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
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>

          {/* Comments Section */}
          {task && (
            <div style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '24px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#111827',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <MessageSquare size={20} style={{ marginRight: '8px' }} />
                Comments
                </div>
                <span style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '4px 8px',
                  borderRadius: '9999px'
                }}>
                  {((task as Task).comments || []).length} comment{((task as Task).comments || []).length !== 1 ? 's' : ''}
                </span>
              </h3>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '16px',
                maxHeight: '160px',
                overflowY: 'auto'
              }}>
                {((task as Task).comments || []).length > 0 ? (
                  ((task as Task).comments || []).map((comment) => (
                    <div key={comment.id || comment._id} style={{
                      backgroundColor: '#f9fafb',
                      padding: '12px',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#111827'
                        }}>
                          {comment.userName}
                        </span>
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
                    No comments yet.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  <strong>Commenting as:</strong> {user?.name || 'Current User'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write your comment here..."
                    rows={3}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none',
                      resize: 'none',
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
                <button
                  type="button"
                  onClick={addComment}
                    disabled={!newComment.trim()}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: !newComment.trim() ? '#9ca3af' : '#2563eb',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: !newComment.trim() ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s ease',
                      alignSelf: 'flex-end',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    onMouseOver={(e) => {
                      if (newComment.trim()) {
                        e.currentTarget.style.backgroundColor = '#1d4ed8';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (newComment.trim()) {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }
                    }}
                >
                    Add Comment
                </button>
                </div>
              </div>
            </div>
          )}

          {/* Extension Request Section */}
          {task && isEmployee && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                Request Extension
              </h3>
              
              
              {!((task as Task).newDeadlineProposal) ? (
                <>
              {!showExtensionForm ? (
                <button
                  type="button"
                  onClick={() => setShowExtensionForm(true)}
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  Request New Deadline
                </button>
              ) : (
                <div className="space-y-4 p-4 bg-orange-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Proposed Deadline
                    </label>
                    <input
                      type="date"
                      value={extensionData.newDeadline}
                      onChange={(e) => setExtensionData(prev => ({ ...prev, newDeadline: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Extension
                    </label>
                    <textarea
                      value={extensionData.reason}
                      onChange={(e) => setExtensionData(prev => ({ ...prev, reason: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Please provide a valid reason for the extension request..."
                      required
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleExtensionRequest}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Submit Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExtensionForm(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
                </>
              ) : (
                <p className="text-gray-600">Extension already requested for this task.</p>
              )}
            </div>
          )}

          {/* Extension Request Status Section for Employees */}
          {task && (task as Task).newDeadlineProposal && isEmployee && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-blue-600" />
                Extension Request Status
              </h3>
              
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (task as Task).extensionRequestStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                      (task as Task).extensionRequestStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {(task as Task).extensionRequestStatus || 'Pending'}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proposed Deadline
                    </label>
                    <span className="text-sm font-medium">
                      {new Date((task as Task).newDeadlineProposal!).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Reason
                  </label>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                    {(task as Task).reasonForExtension}
                  </p>
                </div>
                
                {(task as Task).extensionRequestStatus !== 'Pending' && (task as Task).extensionResponseComment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Response from Management
                    </label>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {(task as Task).extensionResponseComment}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Extension Request Status Section for Directors/Project Heads */}
          {task && (task as Task).newDeadlineProposal && (isDirector || isProjectHead) && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-blue-600" />
                Extension Request Review
              </h3>
              
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Status
                    </label>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (task as Task).extensionRequestStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                      (task as Task).extensionRequestStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {(task as Task).extensionRequestStatus || 'Pending'}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proposed Deadline
                    </label>
                    <span className="text-sm font-medium">
                      {new Date((task as Task).newDeadlineProposal!).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Extension
                  </label>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                    {(task as Task).reasonForExtension}
                  </p>
                </div>
                
                {(task as Task).extensionRequestStatus === 'Pending' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Response Comment
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add your response to the extension request..."
                        onChange={(e) => setExtensionData(prev => ({ ...prev, responseComment: e.target.value }))}
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => handleExtensionResponse('Approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve Extension
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtensionResponse('Rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject Extension
                      </button>
                    </div>
                  </div>
                )}
                
                {(task as Task).extensionRequestStatus !== 'Pending' && (task as Task).extensionResponseComment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Response
                    </label>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {(task as Task).extensionResponseComment}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}


          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb'
          }}>
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
              Cancel
            </button>
            {canEdit && (
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
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
              >
                <Save size={16} />
                {task ? 'Update Task' : 'Create Task'}
              </button>
            )}
          </div>
        </form>
        ) : (
          // Create New Task Form
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
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
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
                  Select Project
                </label>
                <select
                  value={formData.projectId || ''}
                  onChange={(e) => handleInputChange('projectId', e.target.value)}
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
                  <option value="">No Project (Optional)</option>
                  {projects.map(project => (
                    <option key={project.id || project._id} value={project.id || project._id}>
                      {project.name}
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
                  Assigned To (Staff User) *
                </label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) => handleInputChange('assignedToId', e.target.value)}
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
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {'name' in user ? user.name : `${user.firstName} ${user.lastName}`}
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
                  Priority *
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value as 'Urgent' | 'Less Urgent' | 'Free Time')}
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
                  <option value="Urgent">Urgent</option>
                  <option value="Less Urgent">Less Urgent</option>
                  <option value="Free Time">Free Time</option>
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
                  Status *
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
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
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
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
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
                  Estimated Hours *
                </label>
                <input
                  type="number"
                  value={formData.estimatedHours || 0}
                  onChange={(e) => handleInputChange('estimatedHours', parseInt(e.target.value) || 0)}
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
                  min="0"
                  required
                />
              </div>

              {isDirector && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Director Rating
                  </label>
                  <select
                    value={formData.directorRating === undefined ? '' : (typeof formData.directorRating === 'boolean' ? (formData.directorRating ? 'Yes' : 'No') : formData.directorRating.toString())}
                    onChange={(e) => {
                      const value = e.target.value;
                      let ratingValue: boolean | number | 'Yes' | 'No' | undefined;
                      if (value === 'Yes') ratingValue = 'Yes';
                      else if (value === 'No') ratingValue = 'No';
                      else if (value === 'true') ratingValue = true;
                      else if (value === 'false') ratingValue = false;
                      else if (value.match(/^\d+$/)) ratingValue = parseInt(value);
                      else ratingValue = undefined;
                      handleInputChange('directorRating', ratingValue);
                    }}
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
                    <option value="">Select Rating</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="1">⭐ (1 Star)</option>
                    <option value="2">⭐⭐ (2 Stars)</option>
                    <option value="3">⭐⭐⭐ (3 Stars)</option>
                    <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                    <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                  </select>
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

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
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
                Cancel
              </button>
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
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
              >
                <Save size={16} />
                Create Task
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TaskModal;
