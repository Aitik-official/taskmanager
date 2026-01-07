'use client'

import React, { useState, useEffect } from 'react';
import { Task, Project, User, Employee } from '../types';
import { X, Save, MessageSquare, AlertTriangle, Plus, Trash2, Bell, ChevronDown, Check } from 'lucide-react';
import { taskApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { createProject, deleteProject } from '../services/projectService';

interface TaskModalProps {
  task?: Task | null;
  projects: Project[];
  users: (User | Employee)[];
  tasks?: Task[]; // List of existing tasks for employee to select from
  onClose: () => void;
  onSave: (task: Task) => void;
  isDirector: boolean;
  isProjectHead: boolean;
  isEmployee: boolean;
  onProjectsChange?: () => void; // Callback to refresh projects list
}

const TaskModal: React.FC<TaskModalProps> = ({
  task,
  projects,
  users,
  tasks = [],
  onClose,
  onSave,
  isDirector,
  isProjectHead,
  isEmployee,
  onProjectsChange
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    assignedToId: '',
    assignedEmployeeIds: [],
    assignedEmployeeNames: [],
    projectHeadId: '',
    priority: 'Less Urgent',
    status: 'Pending',
    dueDate: '',
    estimatedHours: 0,
    directorRating: undefined,
    isLocked: false,
    workDone: 0,
    flagDirectorInputRequired: false,
    reminderDate: ''
  });
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [taskTitleMode, setTaskTitleMode] = useState<'select' | 'manual'>('manual'); // For employee dashboard: select from existing tasks or manual input
  
  const [newComment, setNewComment] = useState('');
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionData, setExtensionData] = useState({
    newDeadline: '',
    reason: '',
    responseComment: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  
  // For director project management
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  useEffect(() => {
    if (task) {
      // Normalize assignedToId to match the format used in select options
      let normalizedAssignedToId = task.assignedToId || '';
      let normalizedAssignedToName = task.assignedToName || '';
      
      if (normalizedAssignedToId && users.length > 0) {
        // Try to find matching user to ensure ID format consistency
        const matchingUser = users.find(u => {
          const userId = u.id || ('_id' in u ? u._id : '') || '';
          return userId === normalizedAssignedToId || 
                 (u.id && u.id === normalizedAssignedToId) ||
                 ('_id' in u && u._id === normalizedAssignedToId);
        });
        if (matchingUser) {
          normalizedAssignedToId = matchingUser.id || ('_id' in matchingUser ? matchingUser._id : '') || normalizedAssignedToId;
          // Update name if not set or if it doesn't match
          if (!normalizedAssignedToName) {
            normalizedAssignedToName = 'name' in matchingUser 
              ? matchingUser.name 
              : `${matchingUser.firstName} ${matchingUser.lastName}`;
          }
        }
      }
      
      // Normalize projectHeadId if present
      let normalizedProjectHeadId = task.projectHeadId || '';
      let normalizedProjectHeadName = task.projectHeadName || '';
      
      if (normalizedProjectHeadId && users.length > 0) {
        const matchingProjectHead = users.find(u => {
          const userId = u.id || ('_id' in u ? u._id : '') || '';
          return userId === normalizedProjectHeadId;
        });
        if (matchingProjectHead) {
          normalizedProjectHeadId = matchingProjectHead.id || ('_id' in matchingProjectHead ? matchingProjectHead._id : '') || normalizedProjectHeadId;
          if (!normalizedProjectHeadName) {
            normalizedProjectHeadName = 'name' in matchingProjectHead 
              ? matchingProjectHead.name 
              : `${matchingProjectHead.firstName} ${matchingProjectHead.lastName}`;
          }
        }
      }
      
      // Handle multiple assigned employees
      let assignedEmployeeIds: string[] = [];
      let assignedEmployeeNames: string[] = [];
      
      if (task.assignedEmployeeIds && task.assignedEmployeeIds.length > 0) {
        // Use the new multiple assignment format
        assignedEmployeeIds = task.assignedEmployeeIds;
        assignedEmployeeNames = task.assignedEmployeeNames || [];
      } else if (normalizedAssignedToId) {
        // Fallback to single assignment for backward compatibility
        assignedEmployeeIds = [normalizedAssignedToId];
        assignedEmployeeNames = [normalizedAssignedToName];
      }
      
      setSelectedEmployeeIds(assignedEmployeeIds);
      
      setFormData(prev => ({
        ...prev,
        ...task,
        assignedToId: normalizedAssignedToId,
        assignedToName: normalizedAssignedToName,
        assignedEmployeeIds: assignedEmployeeIds,
        assignedEmployeeNames: assignedEmployeeNames,
        projectHeadId: normalizedProjectHeadId,
        projectHeadName: normalizedProjectHeadName,
        dueDate: task.dueDate ? (task.dueDate.split('T')[0] || task.dueDate) : (task.startDate ? task.startDate.split('T')[0] : ''),
        reminderDate: task.reminderDate ? (task.reminderDate.split('T')[0] || task.reminderDate) : ''
      }));
    } else if (isEmployee && user) {
      // When creating a new task as an employee, pre-fill with employee's own ID
      setFormData({
        title: '',
        description: '',
        assignedToId: user.id || '',
        assignedToName: user.name || user.email || '',
        priority: 'Less Urgent',
        status: 'Pending',
        dueDate: '',
        estimatedHours: 0,
        directorRating: undefined,
        isLocked: false,
        workDone: 0,
        flagDirectorInputRequired: false,
        reminderDate: ''
      });
    }
  }, [task, isEmployee, user, users]);


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
        const user = users.find(u => {
          const userId = u.id || ('_id' in u ? u._id : '') || '';
          return userId === value;
        });
        if (user) {
          // Handle both User and Employee types
          const userName = 'name' in user 
            ? user.name 
            : `${user.firstName} ${user.lastName}`;
          updated.assignedToName = userName;
        }
      }
      
      if (field === 'projectHeadId') {
        const projectHead = users.find(u => {
          const userId = u.id || ('_id' in u ? u._id : '') || '';
          return userId === value;
        });
        if (projectHead) {
          const projectHeadName = 'name' in projectHead 
            ? projectHead.name 
            : `${projectHead.firstName} ${projectHead.lastName}`;
          updated.projectHeadName = projectHeadName;
        } else {
          updated.projectHeadName = '';
        }
      }
      
      return updated;
    });
  };

  const handleEmployeeSelectionChange = (employeeId: string, checked: boolean) => {
    if (checked) {
      // Add employee to selection
      const newSelectedIds = [...selectedEmployeeIds, employeeId];
      setSelectedEmployeeIds(newSelectedIds);
      
      // Update names array
      const employee = users.find(u => {
        const userId = u.id || ('_id' in u ? u._id : '') || '';
        return userId === employeeId;
      });
      
      if (employee) {
        const employeeName = 'name' in employee 
          ? employee.name 
          : `${employee.firstName} ${employee.lastName}`;
        
        const currentNames = formData.assignedEmployeeNames || [];
        const newNames = [...currentNames, employeeName];
        
        setFormData(prev => ({
          ...prev,
          assignedEmployeeIds: newSelectedIds,
          assignedEmployeeNames: newNames,
          // Keep backward compatibility - use first employee
          assignedToId: newSelectedIds[0] || '',
          assignedToName: newNames[0] || ''
        }));
      }
    } else {
      // Remove employee from selection
      const newSelectedIds = selectedEmployeeIds.filter(id => id !== employeeId);
      setSelectedEmployeeIds(newSelectedIds);
      
      // Update names array
      const employee = users.find(u => {
        const userId = u.id || ('_id' in u ? u._id : '') || '';
        return userId === employeeId;
      });
      
      if (employee) {
        const employeeName = 'name' in employee 
          ? employee.name 
          : `${employee.firstName} ${employee.lastName}`;
        
        const currentNames = formData.assignedEmployeeNames || [];
        const newNames = currentNames.filter(name => name !== employeeName);
        
        setFormData(prev => ({
          ...prev,
          assignedEmployeeIds: newSelectedIds,
          assignedEmployeeNames: newNames,
          // Keep backward compatibility - use first employee
          assignedToId: newSelectedIds[0] || '',
          assignedToName: newNames[0] || ''
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one employee is selected
    if (selectedEmployeeIds.length === 0 && !isEmployee) {
      alert('Please select at least one employee to assign this task.');
      return;
    }
    
    // Get assigned employees from selectedEmployeeIds
    const assignedEmployeeIds = selectedEmployeeIds.length > 0 
      ? selectedEmployeeIds 
      : (isEmployee && user?.id ? [user.id] : []);
    
    const assignedEmployeeNames: string[] = [];
    assignedEmployeeIds.forEach(id => {
      const foundUser = users.find(u => {
        const userId = u.id || ('_id' in u ? u._id : '') || '';
        return userId === id;
      });
      if (foundUser) {
        const userName = 'name' in foundUser 
          ? foundUser.name 
          : `${foundUser.firstName} ${foundUser.lastName}`;
        assignedEmployeeNames.push(userName);
      }
    });
    
    // Get assignedToId from formData, with fallback for employees (backward compatibility)
    const assignedToId = assignedEmployeeIds[0] || (isEmployee ? (user?.id || '') : '');
    const assignedToName = assignedEmployeeNames[0] || (isEmployee && user ? (user.name || user.email || '') : '');
    
    // Get projectHeadId and projectHeadName from formData
    const projectHeadId = formData.projectHeadId || '';
    let projectHeadName = formData.projectHeadName || '';
    if (!projectHeadName && projectHeadId) {
      const foundProjectHead = users.find(u => {
        const userId = u.id || ('_id' in u ? u._id : '') || '';
        return userId === projectHeadId;
      });
      if (foundProjectHead) {
        projectHeadName = 'name' in foundProjectHead 
          ? foundProjectHead.name 
          : `${foundProjectHead.firstName} ${foundProjectHead.lastName}`;
      }
    }
    
    const taskData: Task = {
      id: task?.id || task?._id || Date.now().toString(),
      // Only include _id if we're editing an existing task
      ...(task?._id && { _id: task._id }),
      title: formData.title || '',
      description: formData.description || '',
      projectId: formData.projectId || '',
      projectName: formData.projectName || projects.find(p => p.id === formData.projectId)?.name || '',
      assignedToId: assignedToId,
      assignedToName: assignedToName,
      assignedEmployeeIds: assignedEmployeeIds,
      assignedEmployeeNames: assignedEmployeeNames,
      assignedById: task?.assignedById || user?.id || '1',
      assignedByName: task?.assignedByName || user?.name || 'Admin',
      projectHeadId: projectHeadId || undefined,
      projectHeadName: projectHeadName || undefined,
      priority: (formData.priority || 'Less Urgent') as 'Urgent' | 'Less Urgent' | 'Free Time' | 'Custom',
      status: task?.status || 'Pending', // Keep existing status or default to Pending
      estimatedHours: task?.estimatedHours || 0, // Keep existing or default to 0
      actualHours: task?.actualHours,
      startDate: task?.startDate || new Date().toISOString().split('T')[0], // Default to today
      dueDate: task?.dueDate || new Date().toISOString().split('T')[0], // Default to today
      completedDate: task?.completedDate,
      isLocked: task?.isLocked || false, // Keep existing or default to false
      comments: task?.comments || [],
      rating: task?.rating,
      ratingComment: task?.ratingComment,
      directorRating: task?.directorRating,
      newDeadlineProposal: task?.newDeadlineProposal,
      reasonForExtension: task?.reasonForExtension,
      extensionRequestStatus: task?.extensionRequestStatus || 'Pending',
      workDone: formData.workDone || 0,
      flagDirectorInputRequired: formData.flagDirectorInputRequired || false,
      reminderDate: formData.reminderDate || undefined
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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    // Ensure we have required fields
    if (!user?.id) {
      alert('Error: User ID not found. Please log out and log in again.');
      return;
    }
    
    try {
      const newProject: Omit<Project, 'id' | '_id'> = {
        name: newProjectName.trim(),
        description: 'New project', // Required field - provide default description
        assignedEmployeeId: user.id,
        assignedEmployeeName: user.name || user.email || 'User',
        status: 'Current',
        startDate: new Date().toISOString().split('T')[0],
        progress: 0
      };
      
      await createProject(newProject);
      setNewProjectName('');
      setShowNewProjectInput(false);
      
      // Refresh projects list
      if (onProjectsChange) {
        onProjectsChange();
      }
      
      // Auto-select the newly created project
      setTimeout(async () => {
        const updatedProjects = await fetch('/api/projects').then(res => res.json());
        const createdProject = updatedProjects.find((p: Project) => p.name === newProject.name);
        if (createdProject) {
          handleInputChange('projectId', createdProject.id || createdProject._id || '');
        }
      }, 500);
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert(`Error creating project: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteProject(projectId);
      
      // If the deleted project was selected, clear the selection
      if (formData.projectId === projectId) {
        handleInputChange('projectId', '');
      }
      
      // Refresh projects list
      if (onProjectsChange) {
        onProjectsChange();
      }
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert(`Error deleting project: ${error.response?.data?.message || error.message}`);
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
                      startDate: task.startDate ? task.startDate.split('T')[0] : '',
                      reminderDate: task.reminderDate ? (task.reminderDate.split('T')[0] || task.reminderDate) : ''
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
                Priority *
              </label>
                <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value as 'Urgent' | 'Less Urgent' | 'Free Time' | 'Custom')}
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
                {isEmployee && <option value="Custom">Custom</option>}
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
                onChange={(e) => handleInputChange('status', e.target.value as 'Pending' | 'Completed' | 'In Progress')}
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
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
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
                Project Name
              </label>
              {isDirector ? (
                <div style={{ position: 'relative' }}>
                  {/* Custom Dropdown Button */}
                  <div
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      paddingRight: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '38px'
                    }}
                  >
                    <span style={{ color: formData.projectId ? '#111827' : '#9ca3af' }}>
                      {formData.projectId 
                        ? projects.find(p => (p.id || p._id) === formData.projectId)?.name || 'No Project (Optional)'
                        : 'No Project (Optional)'}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{
                        transform: isProjectDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }}
                    >
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  
                  {/* Custom Dropdown Menu */}
                  {isProjectDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* No Project Option */}
                      <div
                        onClick={() => {
                          handleInputChange('projectId', '');
                          setIsProjectDropdownOpen(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: formData.projectId === '' ? '#f3f4f6' : 'transparent',
                          borderBottom: '1px solid #e5e7eb'
                        }}
                        onMouseEnter={(e) => {
                          if (formData.projectId !== '') {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.projectId !== '') {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <span style={{ fontSize: '14px', color: '#374151' }}>No Project (Optional)</span>
                      </div>
                      
                      {/* Project List with Delete Buttons - Only show Current projects */}
                      {projects.filter(project => project.status === 'Current').map(project => {
                        const projectId = project.id || project._id || '';
                        const isSelected = formData.projectId === projectId;
                        return (
                          <div
                            key={projectId}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
                              borderBottom: '1px solid #e5e7eb'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#f9fafb';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <span
                              onClick={() => {
                                handleInputChange('projectId', projectId);
                                setIsProjectDropdownOpen(false);
                              }}
                              style={{
                                flex: 1,
                                fontSize: '14px',
                                color: '#374151',
                                fontWeight: isSelected ? '500' : '400'
                              }}
                            >
                              {project.name}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteProject(projectId, project.name);
                                setIsProjectDropdownOpen(false);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444',
                                borderRadius: '4px',
                                marginLeft: '8px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fee2e2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              title={`Delete ${project.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                      
                      {/* Add New Project Option */}
                      <div
                        onClick={() => {
                          setShowNewProjectInput(true);
                          setIsProjectDropdownOpen(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          color: '#3b82f6',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                      >
                        <Plus size={16} />
                        <span style={{ fontSize: '14px' }}>Add New Project</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Click outside to close dropdown */}
                  {isProjectDropdownOpen && (
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                      }}
                      onClick={() => setIsProjectDropdownOpen(false)}
                    />
                  )}
                  
                  {/* Add New Project Input */}
                  {showNewProjectInput && (
                    <div style={{
                      marginTop: '8px',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="Enter new project name"
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateProject();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleCreateProject}
                          disabled={!newProjectName.trim()}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: newProjectName.trim() ? '#3b82f6' : '#9ca3af',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={16} />
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewProjectInput(false);
                            setNewProjectName('');
                          }}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {/* Custom Dropdown Button */}
                  <div
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      paddingRight: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '38px'
                    }}
                  >
                    <span style={{ color: formData.projectId ? '#111827' : '#9ca3af' }}>
                      {formData.projectId 
                        ? projects.find(p => (p.id || p._id) === formData.projectId)?.name || 'No Project (Optional)'
                        : 'No Project (Optional)'}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{
                        transform: isProjectDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }}
                    >
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  
                  {/* Custom Dropdown Menu */}
                  {isProjectDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* No Project Option */}
                      <div
                        onClick={() => {
                          handleInputChange('projectId', '');
                          setIsProjectDropdownOpen(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: formData.projectId === '' ? '#f3f4f6' : 'transparent',
                          borderBottom: '1px solid #e5e7eb'
                        }}
                        onMouseEnter={(e) => {
                          if (formData.projectId !== '') {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.projectId !== '') {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <span style={{ fontSize: '14px', color: '#374151' }}>No Project (Optional)</span>
                      </div>
                      
                      {/* Project List with Delete Buttons - Only show Current projects */}
                      {projects.filter(project => project.status === 'Current').map(project => {
                        const projectId = project.id || project._id || '';
                        const isSelected = formData.projectId === projectId;
                        return (
                          <div
                            key={projectId}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
                              borderBottom: '1px solid #e5e7eb'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#f9fafb';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <span
                              onClick={() => {
                                handleInputChange('projectId', projectId);
                                setIsProjectDropdownOpen(false);
                              }}
                              style={{
                                flex: 1,
                                fontSize: '14px',
                                color: '#374151',
                                fontWeight: isSelected ? '500' : '400'
                              }}
                            >
                              {project.name}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteProject(projectId, project.name);
                                setIsProjectDropdownOpen(false);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444',
                                borderRadius: '4px',
                                marginLeft: '8px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fee2e2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              title={`Delete ${project.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                      
                      {/* Add New Project Option */}
                      <div
                        onClick={() => {
                          setShowNewProjectInput(true);
                          setIsProjectDropdownOpen(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          color: '#3b82f6',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                      >
                        <Plus size={16} />
                        <span style={{ fontSize: '14px' }}>Add New Project</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Click outside to close dropdown */}
                  {isProjectDropdownOpen && (
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                      }}
                      onClick={() => setIsProjectDropdownOpen(false)}
                    />
                  )}
                  
                  {/* Add New Project Input */}
                  {showNewProjectInput && (
                    <div style={{
                      marginTop: '8px',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="Enter new project name"
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateProject();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleCreateProject}
                          disabled={!newProjectName.trim()}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: newProjectName.trim() ? '#3b82f6' : '#9ca3af',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={16} />
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewProjectInput(false);
                            setNewProjectName('');
                          }}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assigned Employees Field - Multi-select Dropdown */}
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Assigned Employee(s) *
              </label>
              <div
                onClick={() => {
                  if (!isEmployee) {
                    setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  backgroundColor: isEmployee ? '#f3f4f6' : '#ffffff',
                  cursor: isEmployee ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '40px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isEmployee) {
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isEmployee && !isEmployeeDropdownOpen) {
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
              >
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignItems: 'center'
                }}>
                  {selectedEmployeeIds.length === 0 ? (
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>
                      Select Employee(s)
                    </span>
                  ) : (
                    selectedEmployeeIds.map(id => {
                      const employee = users.find(u => {
                        const userId = u.id || ('_id' in u ? u._id : '') || '';
                        return userId === id;
                      });
                      if (!employee) return null;
                      const userName = 'name' in employee 
                        ? employee.name 
                        : `${employee.firstName} ${employee.lastName}`;
                      return (
                        <span
                          key={id}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#eff6ff',
                            color: '#1e40af',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {userName}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmployeeSelectionChange(id, false);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              color: '#1e40af'
                            }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>
                <ChevronDown 
                  size={18} 
                  style={{ 
                    color: '#6b7280',
                    transform: isEmployeeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }} 
                />
              </div>

              {/* Dropdown Menu */}
              {isEmployeeDropdownOpen && !isEmployee && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    zIndex: 1000,
                    maxHeight: '250px',
                    overflowY: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {users
                    .filter(u => {
                      if (isEmployee) {
                        const userId = u.id || ('_id' in u ? u._id : '') || '';
                        return userId === user?.id;
                      }
                      if ('role' in u) {
                        if (u.role === 'Employee') {
                          if ('status' in u) {
                            return u.status === 'Active';
                          }
                          return true;
                        }
                        return false;
                      }
                      if ('firstName' in u) {
                        if ('status' in u) {
                          return u.status === 'Active';
                        }
                        return true;
                      }
                      return false;
                    })
                    .map(u => {
                      const userId = u.id || ('_id' in u ? u._id : '') || '';
                      const userName = 'name' in u 
                        ? u.name 
                        : `${u.firstName} ${u.lastName}`;
                      const isChecked = selectedEmployeeIds.includes(userId);
                      
                      return (
                        <label
                          key={userId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isChecked ? '#dbeafe' : '#f9fafb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isChecked ? '#eff6ff' : 'transparent';
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              handleEmployeeSelectionChange(userId, e.target.checked);
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#3b82f6'
                            }}
                          />
                          <span style={{
                            fontSize: '14px',
                            color: '#111827',
                            fontWeight: isChecked ? '600' : '500',
                            flex: 1
                          }}>
                            {userName}
                          </span>
                          {isChecked && (
                            <Check size={16} color="#3b82f6" />
                          )}
                        </label>
                      );
                    })}
                  {users.filter(u => {
                    if (isEmployee) {
                      const userId = u.id || ('_id' in u ? u._id : '') || '';
                      return userId === user?.id;
                    }
                    if ('role' in u && u.role === 'Employee') {
                      if ('status' in u) return u.status === 'Active';
                      return true;
                    }
                    if ('firstName' in u) {
                      if ('status' in u) return u.status === 'Active';
                      return true;
                    }
                    return false;
                  }).length === 0 && (
                    <div style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '14px'
                    }}>
                      No active employees available
                    </div>
                  )}
                </div>
              )}

              {/* Click outside to close dropdown */}
              {isEmployeeDropdownOpen && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999
                  }}
                  onClick={() => setIsEmployeeDropdownOpen(false)}
                />
              )}

              {selectedEmployeeIds.length > 0 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#059669',
                  fontWeight: '500'
                }}>
                  {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {/* Project Head Field - Show for directors */}
            {isDirector && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Project Head
                </label>
                <select
                  value={String(formData.projectHeadId || '')}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    handleInputChange('projectHeadId', newValue);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer'
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
                  <option value="">Select Project Head (Optional)</option>
                  {users
                    .filter(u => {
                      // Show only Project Heads
                      if ('role' in u) {
                        return u.role === 'Project Head';
                      }
                      return false;
                    })
                    .map(u => {
                      const userId = u.id || ('_id' in u ? u._id : '') || '';
                      const userName = 'name' in u 
                        ? u.name 
                        : `${u.firstName} ${u.lastName}`;
                      return (
                        <option key={userId} value={userId}>
                          {userName}
                        </option>
                      );
                    })}
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
              Task Title *
              </label>
              {isEmployee && tasks.length > 0 && (
                <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setTaskTitleMode('select')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: taskTitleMode === 'select' ? '#3b82f6' : '#f3f4f6',
                      color: taskTitleMode === 'select' ? '#ffffff' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Select from Tasks
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskTitleMode('manual')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: taskTitleMode === 'manual' ? '#3b82f6' : '#f3f4f6',
                      color: taskTitleMode === 'manual' ? '#ffffff' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Add New Title
                  </button>
                </div>
              )}
              {isEmployee && taskTitleMode === 'select' && tasks.length > 0 ? (
              <select
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
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
                  <option value="">Select a task</option>
                  {tasks.map(t => (
                    <option key={t.id || t._id} value={t.title}>
                      {t.title}
                  </option>
                ))}
              </select>
              ) : (
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
              Description / Remarks *
                  </label>
                  <textarea
              value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Daily comments on work done"
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
                    Work Done (%)
                  </label>
                  <select
                    value={formData.workDone || 0}
                    onChange={(e) => handleInputChange('workDone', parseInt(e.target.value))}
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
                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(percent => (
                      <option key={percent} value={percent}>
                        {percent}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                cursor: 'pointer',
                marginBottom: '8px'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.flagDirectorInputRequired || false}
                      onChange={(e) => handleInputChange('flagDirectorInputRequired', e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <span>Flag (Director Input Required)</span>
                  </label>
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '4px',
                    margin: 0
                  }}>
                    Used when staff needs clarification, approval, or input
                  </p>
                </div>
          </div>

          {/* Reminder Date Field */}
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
              <Bell size={16} color="#6b7280" />
              Reminder Date
            </label>
            <input
              type="date"
              value={formData.reminderDate || ''}
              onChange={(e) => handleInputChange('reminderDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
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
            />
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '4px',
              margin: 0
            }}>
              Select a date to send a reminder to the assigned employee about this task
            </p>
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
                  Priority *
                </label>
                  <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value as 'Urgent' | 'Less Urgent' | 'Free Time' | 'Custom')}
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
                  {isEmployee && <option value="Custom">Custom</option>}
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
                  onChange={(e) => handleInputChange('status', e.target.value as 'Pending' | 'Completed' | 'In Progress')}
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
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
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
                  Project Name
                </label>
                {isDirector ? (
                  <div style={{ position: 'relative' }}>
                    {/* Custom Dropdown Button */}
                    <div
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        paddingRight: '40px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '38px'
                      }}
                    >
                      <span style={{ color: formData.projectId ? '#111827' : '#9ca3af' }}>
                        {formData.projectId 
                          ? projects.find(p => (p.id || p._id) === formData.projectId)?.name || 'No Project (Optional)'
                          : 'No Project (Optional)'}
                      </span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{
                          transform: isProjectDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}
                      >
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    
                    {/* Custom Dropdown Menu */}
                    {isProjectDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '4px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          zIndex: 1000,
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* No Project Option */}
                        <div
                          onClick={() => {
                            handleInputChange('projectId', '');
                            setIsProjectDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: formData.projectId === '' ? '#f3f4f6' : 'transparent',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                          onMouseEnter={(e) => {
                            if (formData.projectId !== '') {
                              e.currentTarget.style.backgroundColor = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.projectId !== '') {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <span style={{ fontSize: '14px', color: '#374151' }}>No Project (Optional)</span>
                        </div>
                        
                        {/* Project List with Delete Buttons - Only show Current projects */}
                        {projects.filter(project => project.status === 'Current').map(project => {
                          const projectId = project.id || project._id || '';
                          const isSelected = formData.projectId === projectId;
                          return (
                            <div
                              key={projectId}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
                                borderBottom: '1px solid #e5e7eb'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = '#f9fafb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <span
                                onClick={() => {
                                  handleInputChange('projectId', projectId);
                                  setIsProjectDropdownOpen(false);
                                }}
                                style={{
                                  flex: 1,
                                  fontSize: '14px',
                                  color: '#374151',
                                  fontWeight: isSelected ? '500' : '400'
                                }}
                              >
                                {project.name}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteProject(projectId, project.name);
                                  setIsProjectDropdownOpen(false);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ef4444',
                                  borderRadius: '4px',
                                  marginLeft: '8px'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fee2e2';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title={`Delete ${project.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                        
                        {/* Add New Project Option */}
                        <div
                          onClick={() => {
                            setShowNewProjectInput(true);
                            setIsProjectDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: '#f9fafb',
                            borderTop: '1px solid #e5e7eb',
                            color: '#3b82f6',
                            fontWeight: '500'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }}
                        >
                          <Plus size={16} />
                          <span style={{ fontSize: '14px' }}>Add New Project</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Click outside to close dropdown */}
                    {isProjectDropdownOpen && (
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 999
                        }}
                        onClick={() => setIsProjectDropdownOpen(false)}
                      />
                    )}
                    
                    {/* Add New Project Input */}
                    {showNewProjectInput && (
                      <div style={{
                        marginTop: '8px',
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Enter new project name"
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none'
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleCreateProject();
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleCreateProject}
                            disabled={!newProjectName.trim()}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: newProjectName.trim() ? '#3b82f6' : '#9ca3af',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                              fontSize: '14px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Plus size={16} />
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewProjectInput(false);
                              setNewProjectName('');
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {/* Custom Dropdown Button */}
                    <div
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                        paddingRight: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '38px'
                      }}
                    >
                      <span style={{ color: formData.projectId ? '#111827' : '#9ca3af' }}>
                        {formData.projectId 
                          ? projects.find(p => (p.id || p._id) === formData.projectId)?.name || 'No Project (Optional)'
                          : 'No Project (Optional)'}
                      </span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        style={{
                          transform: isProjectDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}
                      >
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    
                    {/* Custom Dropdown Menu */}
                    {isProjectDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '4px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          zIndex: 1000,
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* No Project Option */}
                        <div
                          onClick={() => {
                            handleInputChange('projectId', '');
                            setIsProjectDropdownOpen(false);
                    }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: formData.projectId === '' ? '#f3f4f6' : 'transparent',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                          onMouseEnter={(e) => {
                            if (formData.projectId !== '') {
                              e.currentTarget.style.backgroundColor = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.projectId !== '') {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                    }}
                  >
                          <span style={{ fontSize: '14px', color: '#374151' }}>No Project (Optional)</span>
                        </div>
                        
                        {/* Project List with Delete Buttons - Only show Current projects */}
                        {projects.filter(project => project.status === 'Current').map(project => {
                          const projectId = project.id || project._id || '';
                          const isSelected = formData.projectId === projectId;
                          return (
                            <div
                              key={projectId}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
                                borderBottom: '1px solid #e5e7eb'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = '#f9fafb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <span
                                onClick={() => {
                                  handleInputChange('projectId', projectId);
                                  setIsProjectDropdownOpen(false);
                                }}
                                style={{
                                  flex: 1,
                                  fontSize: '14px',
                                  color: '#374151',
                                  fontWeight: isSelected ? '500' : '400'
                                }}
                              >
                                {project.name}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteProject(projectId, project.name);
                                  setIsProjectDropdownOpen(false);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ef4444',
                                  borderRadius: '4px',
                                  marginLeft: '8px'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fee2e2';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title={`Delete ${project.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                        
                        {/* Add New Project Option */}
                        <div
                          onClick={() => {
                            setShowNewProjectInput(true);
                            setIsProjectDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: '#f9fafb',
                            borderTop: '1px solid #e5e7eb',
                            color: '#3b82f6',
                            fontWeight: '500'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }}
                        >
                          <Plus size={16} />
                          <span style={{ fontSize: '14px' }}>Add New Project</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Click outside to close dropdown */}
                    {isProjectDropdownOpen && (
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 999
                        }}
                        onClick={() => setIsProjectDropdownOpen(false)}
                      />
                    )}
                    
                    {/* Add New Project Input */}
                    {showNewProjectInput && (
                      <div style={{
                        marginTop: '8px',
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Enter new project name"
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none'
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleCreateProject();
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleCreateProject}
                            disabled={!newProjectName.trim()}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: newProjectName.trim() ? '#3b82f6' : '#9ca3af',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                              fontSize: '14px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Plus size={16} />
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewProjectInput(false);
                              setNewProjectName('');
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Assigned Employees Field - Multi-select Dropdown */}
                <div style={{ position: 'relative' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Assigned Employee(s) *
                  </label>
                  <div
                    onClick={() => {
                      if (!isEmployee) {
                        setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: isEmployee ? '#f3f4f6' : '#ffffff',
                      cursor: isEmployee ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '40px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isEmployee) {
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isEmployee && !isEmployeeDropdownOpen) {
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }
                    }}
                  >
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      alignItems: 'center'
                    }}>
                      {selectedEmployeeIds.length === 0 ? (
                        <span style={{ color: '#9ca3af', fontSize: '14px' }}>
                          Select Employee(s)
                        </span>
                      ) : (
                        selectedEmployeeIds.map(id => {
                          const employee = users.find(u => {
                            const userId = u.id || ('_id' in u ? u._id : '') || '';
                            return userId === id;
                          });
                          if (!employee) return null;
                          const userName = 'name' in employee 
                            ? employee.name 
                            : `${employee.firstName} ${employee.lastName}`;
                          return (
                            <span
                              key={id}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#eff6ff',
                                color: '#1e40af',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {userName}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEmployeeSelectionChange(id, false);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: '#1e40af'
                                }}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>
                    <ChevronDown 
                      size={18} 
                      style={{ 
                        color: '#6b7280',
                        transform: isEmployeeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }} 
                    />
                  </div>

                  {/* Dropdown Menu */}
                  {isEmployeeDropdownOpen && !isEmployee && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        zIndex: 1000,
                        maxHeight: '250px',
                        overflowY: 'auto'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {users
                        .filter(u => {
                          if (isEmployee) {
                            const userId = u.id || ('_id' in u ? u._id : '') || '';
                            return userId === user?.id;
                          }
                          if ('role' in u) {
                            if (u.role === 'Employee') {
                              if ('status' in u) {
                                return u.status === 'Active';
                              }
                              return true;
                            }
                            return false;
                          }
                          if ('firstName' in u) {
                            if ('status' in u) {
                              return u.status === 'Active';
                            }
                            return true;
                          }
                          return false;
                        })
                        .map(u => {
                          const userId = u.id || ('_id' in u ? u._id : '') || '';
                          const userName = 'name' in u 
                            ? u.name 
                            : `${u.firstName} ${u.lastName}`;
                          const isChecked = selectedEmployeeIds.includes(userId);
                          
                          return (
                            <label
                              key={userId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                cursor: 'pointer',
                                backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                                borderBottom: '1px solid #f3f4f6',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = isChecked ? '#dbeafe' : '#f9fafb';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = isChecked ? '#eff6ff' : 'transparent';
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  handleEmployeeSelectionChange(userId, e.target.checked);
                                }}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#3b82f6'
                                }}
                              />
                              <span style={{
                                fontSize: '14px',
                                color: '#111827',
                                fontWeight: isChecked ? '600' : '500',
                                flex: 1
                              }}>
                                {userName}
                              </span>
                              {isChecked && (
                                <Check size={16} color="#3b82f6" />
                              )}
                            </label>
                          );
                        })}
                      {users.filter(u => {
                        if (isEmployee) {
                          const userId = u.id || ('_id' in u ? u._id : '') || '';
                          return userId === user?.id;
                        }
                        if ('role' in u && u.role === 'Employee') {
                          if ('status' in u) return u.status === 'Active';
                          return true;
                        }
                        if ('firstName' in u) {
                          if ('status' in u) return u.status === 'Active';
                          return true;
                        }
                        return false;
                      }).length === 0 && (
                        <div style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: '#6b7280',
                          fontSize: '14px'
                        }}>
                          No active employees available
                        </div>
                      )}
                    </div>
                  )}

                  {/* Click outside to close dropdown */}
                  {isEmployeeDropdownOpen && (
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                      }}
                      onClick={() => setIsEmployeeDropdownOpen(false)}
                    />
                  )}

                  {selectedEmployeeIds.length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#059669',
                      fontWeight: '500'
                    }}>
                      {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>

                {/* Project Head Field - Show for directors */}
                {isDirector && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Project Head
                    </label>
                    <select
                      value={String(formData.projectHeadId || '')}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        handleInputChange('projectHeadId', newValue);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        outline: 'none',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer'
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
                      <option value="">Select Project Head (Optional)</option>
                      {users
                        .filter(u => {
                          // Show only Project Heads
                          if ('role' in u) {
                            return u.role === 'Project Head';
                          }
                          return false;
                        })
                        .map(u => {
                          const userId = u.id || ('_id' in u ? u._id : '') || '';
                          const userName = 'name' in u 
                            ? u.name 
                            : `${u.firstName} ${u.lastName}`;
                          return (
                            <option key={userId} value={userId}>
                              {userName}
                            </option>
                          );
                        })}
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
                  Task Title *
                </label>
                {isEmployee && tasks.length > 0 && (
                  <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setTaskTitleMode('select')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: taskTitleMode === 'select' ? '#3b82f6' : '#f3f4f6',
                        color: taskTitleMode === 'select' ? '#ffffff' : '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Select from Tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskTitleMode('manual')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: taskTitleMode === 'manual' ? '#3b82f6' : '#f3f4f6',
                        color: taskTitleMode === 'manual' ? '#ffffff' : '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Add New Title
                    </button>
                  </div>
                )}
                {isEmployee && taskTitleMode === 'select' && tasks.length > 0 ? (
                <select
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
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
                    <option value="">Select a task</option>
                    {tasks.map(t => (
                      <option key={t.id || t._id} value={t.title}>
                        {t.title}
                    </option>
                  ))}
                </select>
                ) : (
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
                Description / Remarks *
                    </label>
                    <textarea
                value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Daily comments on work done"
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
                      Work Done (%)
                    </label>
                    <select
                      value={formData.workDone || 0}
                      onChange={(e) => handleInputChange('workDone', parseInt(e.target.value))}
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
                      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(percent => (
                        <option key={percent} value={percent}>
                          {percent}%
                        </option>
                      ))}
                    </select>
                  </div>
                  </div>

            {/* Reminder Date Field - Create Form */}
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
                <Bell size={16} color="#6b7280" />
                Reminder Date
              </label>
                      <input
                type="date"
                value={formData.reminderDate || ''}
                onChange={(e) => handleInputChange('reminderDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
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
              />
                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '4px',
                      margin: 0
                    }}>
                Select a date to send a reminder to the assigned employee about this task
                    </p>
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
