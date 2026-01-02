'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Project, Task, DashboardStats, User } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import StatsCards from './StatsCards';
import TaskList from './TaskList';
import ProjectOverview from './ProjectOverview';
import ProjectList from './ProjectList';
import TaskModal from './TaskModal';
import ProjectModal from './ProjectModal';
import EmployeeList from './EmployeeList';
import { getProjects, createProject, updateProject, deleteProject } from '../services/projectService';
import { taskApi } from '../services/api';
import { AlertTriangle, AlertCircle, CheckCircle, CheckCircle2, Clock, Eye, X } from 'lucide-react';
import { IndependentWork, IndependentWorkAttachment } from '../types';
import { createIndependentWork, getIndependentWorkByEmployee, updateIndependentWork, deleteIndependentWork, addComment, getIndependentWorkById } from '../services/independentWorkService';

// Get users from employees API
const getUsersFromEmployees = async (): Promise<User[]> => {
  try {
    const response = await fetch('/api/employees');
    const employees = await response.json();
    return employees.map((emp: any) => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      role: emp.role
    }));
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

const EmployeeDashboard: React.FC = () => {
  const { user, isDirector, isProjectHead, isEmployee } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    inProgressTasks: 0,
    totalProjects: 0,
    activeProjects: 0,
    activeEmployees: 0
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'projects' | 'employees' | 'profile' | 'independent-work' | 'approvals'>('overview');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'completed' | 'pending' | 'overdue'>('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'all' | 'Urgent' | 'Less Urgent' | 'Free Time' | 'Custom'>('all');
  const [taskSourceFilter, setTaskSourceFilter] = useState<'all' | 'director' | 'self'>('all');
  const [projectSourceFilter, setProjectSourceFilter] = useState<'all' | 'director' | 'self'>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | 'employee' | 'completed' | 'pending'>('all');
  const [independentWork, setIndependentWork] = useState<IndependentWork[]>([]);
  const [independentWorkForm, setIndependentWorkForm] = useState({
    date: '',
    workDescription: '',
    category: 'Office' as 'Design' | 'Site' | 'Office' | 'Other',
    timeSpent: 0
  });
  const [independentWorkComment, setIndependentWorkComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Array<{ file: File; preview: string }>>([]);
  const [editingEntry, setEditingEntry] = useState<IndependentWork | null>(null);
  const [viewingEntry, setViewingEntry] = useState<IndependentWork | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  
  // Employee priority task counts
  const [employeePriorityStats, setEmployeePriorityStats] = useState({
    urgentTasks: 0,
    lessUrgentTasks: 0,
    freeTimeTasks: 0,
    totalCompletedTasks: 0
  });
  
  // Track selected priority card for showing filtered tasks table
  const [selectedPriorityCard, setSelectedPriorityCard] = useState<'urgent' | 'lessUrgent' | 'freeTime' | 'completed' | null>(null);
  
  // Track which task's workDone is being edited
  const [editingWorkDone, setEditingWorkDone] = useState<string | null>(null);
  const [workDoneValue, setWorkDoneValue] = useState<number>(0);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let fetchedTasks: Task[] = [];
      
      if (user) {
        if (isEmployee) {
          // Employees see only their assigned tasks
          fetchedTasks = await taskApi.getTasksByUser(user.id, 'Employee');
        } else if (isProjectHead) {
          // Project heads see tasks from their projects
          fetchedTasks = await taskApi.getTasksByUser(user.id, 'Project Head');
        } else {
          // Directors see all tasks
          fetchedTasks = await taskApi.getAllTasks();
        }
      } else {
        fetchedTasks = await taskApi.getAllTasks();
      }
      
      setTasks(fetchedTasks);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      // Fallback to empty array if API fails
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const fetchedProjects = await getProjects();
      // Transform the projects to match the expected type
      const transformedProjects = fetchedProjects.map(project => ({
        ...project,
        id: project.id || project._id || ''
      }));
      setProjects(transformedProjects);
    } catch (error: any) {
      console.error('Error loading projects:', error);
      // Fallback to empty array if API fails
      setProjects([]);
    }
  };

  useEffect(() => {
    // Load projects and tasks
    loadProjects();
    loadTasks();
    fetchUsers();
    if (isEmployee && user) {
      loadIndependentWork();
    }
  }, [user]);

  // Refresh task data when modal opens and poll for updates
  useEffect(() => {
    if (isTaskModalOpen && selectedTask) {
      const taskId = selectedTask.id || selectedTask._id;
      if (!taskId) return;

      // Fetch latest task data immediately when modal opens
      const refreshTask = async () => {
        const latestTask = await fetchLatestTask(taskId);
        if (latestTask) {
          setSelectedTask(latestTask);
        }
      };

      refreshTask();

      // Set up polling to check for updates every 3 seconds while modal is open
      const pollInterval = setInterval(() => {
        refreshTask();
      }, 3000); // Poll every 3 seconds

      // Cleanup interval when modal closes
      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [isTaskModalOpen, selectedTask?.id, selectedTask?._id]);

  const fetchUsers = async () => {
    try {
      const usersData = await getUsersFromEmployees();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const loadIndependentWork = async () => {
    if (!user?.id) return;
    try {
      const work = await getIndependentWorkByEmployee(user.id);
      setIndependentWork(work);
    } catch (error: any) {
      console.error('Error loading independent work:', error);
      setIndependentWork([]);
    }
  };

  const handleIndependentWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      if (editingEntry) {
        // Update existing entry
        const entryId = editingEntry.id || editingEntry._id;
        if (!entryId) return;

        await updateIndependentWork(entryId, {
          date: independentWorkForm.date,
          workDescription: independentWorkForm.workDescription,
          category: independentWorkForm.category,
          timeSpent: independentWorkForm.timeSpent
        });

        setNotificationMessage('Independent work entry updated successfully!');
        setEditingEntry(null);
        setIsEditing(false);
      } else {
        // Create new entry
        // Convert files to base64 attachments
        const attachments: IndependentWorkAttachment[] = [];
        for (const file of selectedFiles) {
          const fileData = await convertFileToBase64(file);
          attachments.push({
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: fileData,
            uploadedAt: new Date().toISOString()
          });
        }

        const workEntry: Omit<IndependentWork, 'id' | '_id' | 'createdAt' | 'updatedAt'> = {
          employeeId: user.id,
          employeeName: user.name || `${user.email}`,
          date: independentWorkForm.date,
          workDescription: independentWorkForm.workDescription,
          category: independentWorkForm.category,
          timeSpent: independentWorkForm.timeSpent,
          attachments: attachments
        };

        await createIndependentWork(workEntry);
        setNotificationMessage('Independent work entry added successfully!');
      }
      
      // Reset form
      setIndependentWorkForm({
        date: '',
        workDescription: '',
        category: 'Office',
        timeSpent: 0
      });
      setSelectedFiles([]);
      setFilePreviews([]);

      // Reload independent work
      await loadIndependentWork();

      // Show success notification
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving independent work:', error);
      alert(`Error ${editingEntry ? 'updating' : 'creating'} independent work entry. Please try again.`);
    }
  };

  const handleEditEntry = (entry: IndependentWork) => {
    setEditingEntry(entry);
    setIsEditing(true);
    setIndependentWorkForm({
      date: entry.date,
      workDescription: entry.workDescription,
      category: entry.category,
      timeSpent: entry.timeSpent
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewEntry = async (entry: IndependentWork) => {
    // When viewing an entry, fetch the latest version to ensure comments are up to date
    const entryId = entry.id || entry._id;
    if (entryId) {
      try {
        const latestEntry = await getIndependentWorkById(entryId);
        console.log('Fetched latest entry with comments:', latestEntry.comments);
        setViewingEntry(latestEntry);
      } catch (error) {
        // If fetch fails, use the entry from the list
        console.error('Error fetching latest entry:', error);
        setViewingEntry(entry);
      }
    } else {
      setViewingEntry(entry);
    }
  };

  const handleDeleteEntry = async (entry: IndependentWork) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const entryId = entry.id || entry._id;
      if (!entryId) return;

      await deleteIndependentWork(entryId);
      await loadIndependentWork();

      setNotificationMessage('Independent work entry deleted successfully!');
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error deleting independent work:', error);
      alert('Error deleting independent work entry. Please try again.');
    }
  };

  const handleAddIndependentWorkComment = async () => {
    if (!viewingEntry || !user?.id || !independentWorkComment.trim()) return;

    const commentContent = independentWorkComment.trim();
    const entryId = viewingEntry.id || viewingEntry._id;
    if (!entryId) return;

    // Clear the input immediately for better UX
    setIndependentWorkComment('');

    // Optimistically update UI for immediate feedback
    const optimisticComment = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name || user.email || 'User',
      content: commentContent,
      timestamp: new Date().toISOString()
    };

    const optimisticEntry = {
      ...viewingEntry,
      comments: [...(viewingEntry.comments || []), optimisticComment]
    };
    setViewingEntry(optimisticEntry);

    try {
      // Add comment to database and get updated entry
      const updated = await addComment(entryId, {
        userId: user.id,
        userName: user.name || user.email || 'User',
        content: commentContent
      });

      console.log('Comment added successfully. Updated entry:', updated);
      console.log('Comments in updated entry:', updated?.comments);

      // Update with the real data from server (ensures consistency)
      if (updated) {
        // Ensure comments array exists and is properly formatted
        const updatedWithComments = {
          ...updated,
          comments: Array.isArray(updated.comments) ? updated.comments : []
        };
        console.log('Setting viewingEntry with comments:', updatedWithComments.comments);
        console.log('Comments array length:', updatedWithComments.comments.length);
        // Force state update with a new object reference
        setViewingEntry({ ...updatedWithComments });
      } else {
        console.error('No updated entry received from server');
      }

      // Refresh the list in the background
      loadIndependentWork().catch(err => {
        console.error('Error refreshing independent work list:', err);
      });
    } catch (error: any) {
      console.error('Error adding comment to independent work:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Revert optimistic update on error
      setViewingEntry(viewingEntry);
      setIndependentWorkComment(commentContent);
      alert('Error adding comment. Please try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // Allow images and PDFs
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
      
      if (!isValidType) {
        alert(`${file.name} is not a valid file type. Please upload images or PDF files only.`);
        return false;
      }
      if (!isValidSize) {
        alert(`${file.name} is too large. Maximum file size is 10MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Create previews for images
    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviews(prev => [...prev, { file, preview: reader.result as string }]);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviews(prev => [...prev, { file, preview: '' }]);
      }
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setIsEditing(false);
    setIndependentWorkForm({
      date: '',
      workDescription: '',
      category: 'Office',
      timeSpent: 0
    });
    setSelectedFiles([]);
    setFilePreviews([]);
  };


  useEffect(() => {
    // Filter tasks based on user role for stats calculation
    let tasksForStats = tasks;
    if (isEmployee) {
      // Employees see only their assigned tasks
      tasksForStats = tasks.filter(task => task.assignedToId === user?.id);
    } else if (isProjectHead) {
      // Project heads see tasks from their projects
      const userProjectIds = projects
        .filter(p => p.assignedEmployeeId === user?.id)
        .map(p => p.id || p._id);
      tasksForStats = tasks.filter(task => {
        const taskProjectId = task.projectId || '';
        return userProjectIds.includes(taskProjectId);
      });
    }
    // Directors see all tasks (no filtering needed)

    // Filter projects based on user role for stats calculation
    let projectsForStats = projects;
    if (isEmployee) {
      // Employees see only projects they're assigned to
      projectsForStats = projects.filter(project => project.assignedEmployeeId === user?.id);
    } else if (isProjectHead) {
      // Project heads see projects they're assigned to
      projectsForStats = projects.filter(project => project.assignedEmployeeId === user?.id);
    }
    // Directors see all projects (no filtering needed)

    // Calculate dashboard stats from filtered data
    const totalTasks = tasksForStats.length;
    const completedTasks = tasksForStats.filter(t => t.status === 'Completed').length;
    const pendingTasks = tasksForStats.filter(t => t.status === 'Pending').length;
    const overdueTasks = tasksForStats.filter(t => t.status === 'Pending' && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const inProgressTasks = tasksForStats.filter(t => t.status === 'In Progress').length;
    const totalProjects = projectsForStats.length;
    const activeProjects = projectsForStats.filter(p => p.status === 'Active').length;
    // Note: User interface doesn't have status, so activeEmployees is set to 0 for employee dashboard
    const activeEmployees = 0;

    setStats({
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      inProgressTasks,
      totalProjects,
      activeProjects,
      activeEmployees
    });
    
    // Calculate employee priority task counts
    if (isEmployee && user?.id) {
      const employeeTasks = tasks.filter(task => task.assignedToId === user.id);
      const urgentTasks = employeeTasks.filter(t => t.priority === 'Urgent').length;
      const lessUrgentTasks = employeeTasks.filter(t => t.priority === 'Less Urgent').length;
      const freeTimeTasks = employeeTasks.filter(t => t.priority === 'Free Time').length;
      const totalCompletedTasks = employeeTasks.filter(t => t.status === 'Completed').length;
      
      setEmployeePriorityStats({
        urgentTasks,
        lessUrgentTasks,
        freeTimeTasks,
        totalCompletedTasks
      });
    }
  }, [tasks, projects, user, isEmployee, isProjectHead]);

  // Function to fetch latest task data
  const fetchLatestTask = async (taskId: string): Promise<Task | null> => {
    try {
      // Fetch all tasks and find the one with matching ID
      let fetchedTasks: Task[] = [];
      
      if (user) {
        if (isEmployee) {
          fetchedTasks = await taskApi.getTasksByUser(user.id, 'Employee');
        } else if (isProjectHead) {
          fetchedTasks = await taskApi.getTasksByUser(user.id, 'Project Head');
        } else {
          fetchedTasks = await taskApi.getAllTasks();
        }
      } else {
        fetchedTasks = await taskApi.getAllTasks();
      }
      
      // Find the task with matching ID
      const latestTask = fetchedTasks.find(t => 
        (t.id || t._id) === taskId || 
        String(t.id || t._id) === String(taskId)
      );
      
      return latestTask || null;
    } catch (error: any) {
      console.error('Error fetching latest task:', error);
      return null;
    }
  };

  const handleTaskCreate = async (newTask: Task) => {
    try {
      // Add current user info for new tasks created by employee
      const taskWithUserInfo = {
        ...newTask,
        assignedById: user?.id || '',
        assignedByName: user?.name || user?.email || 'Employee',
        // Ensure task is assigned to the employee creating it
        assignedToId: user?.id || newTask.assignedToId,
        assignedToName: user?.name || user?.email || newTask.assignedToName,
        extensionRequestStatus: 'Pending' as const,
        isEmployeeCreated: true, // Flag to identify this task was created by employee from employee dashboard
        createdAt: new Date().toISOString(),
        comments: []
      };
      
      // Remove id and _id for new tasks to let MongoDB auto-generate them
      delete taskWithUserInfo.id;
      delete taskWithUserInfo._id;
      
      console.log('Employee creating task with data:', JSON.stringify(taskWithUserInfo, null, 2));
      
      await taskApi.createTask(taskWithUserInfo);
      await loadTasks(); // Reload tasks from database
      
      setNotificationMessage('Task created successfully!');
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      
      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (error: any) {
      console.error('Error creating task:', error);
      alert(`Error creating task: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    try {
      const taskId = updatedTask.id || updatedTask._id;
      if (!taskId) {
        console.error('No task ID available for update:', updatedTask);
        return;
      }
      await taskApi.updateTask(taskId, updatedTask);
      await loadTasks(); // Reload tasks from database
      
      // Update selectedTask with latest data if modal is still open
      if (isTaskModalOpen) {
        const latestTask = await fetchLatestTask(taskId);
        if (latestTask) {
          setSelectedTask(latestTask);
        }
      }
    } catch (error: any) {
      console.error('Error updating task:', error);
    }
  };

  const handleWorkDoneEdit = (task: Task) => {
    const taskId = task.id || task._id || '';
    setEditingWorkDone(taskId);
    setWorkDoneValue(task.workDone || 0);
  };

  const handleWorkDoneSave = async (task: Task) => {
    const taskId = task.id || task._id;
    if (!taskId) return;
    
    // Clamp value between 0 and 100
    const clampedValue = Math.max(0, Math.min(100, workDoneValue));
    
    const updatedTask = {
      ...task,
      workDone: clampedValue
    };
    
    await handleTaskUpdate(updatedTask);
    setEditingWorkDone(null);
  };

  const handleWorkDoneCancel = () => {
    setEditingWorkDone(null);
    setWorkDoneValue(0);
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      if (window.confirm('Are you sure you want to delete this task?')) {
        await taskApi.deleteTask(taskId);
        await loadTasks(); // Reload tasks from database
        
        setNotificationMessage('Task deleted successfully!');
        setShowNotification(true);
        setTimeout(() => {
          setShowNotification(false);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error deleting task:', error);
      alert(`Error deleting task: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleProjectCreate = async (newProject: Project) => {
    try {
      // Ensure project is assigned to the employee creating it
      const projectWithUserInfo = {
        ...newProject,
        assignedEmployeeId: user?.id || newProject.assignedEmployeeId,
        assignedEmployeeName: user?.name || user?.email || newProject.assignedEmployeeName,
        progress: newProject.progress || 0,
        status: newProject.status || 'Active',
        isEmployeeCreated: true // Flag to identify this project was created by employee from employee dashboard
      };
      
      // Remove id and _id for new projects to let MongoDB auto-generate them
      delete projectWithUserInfo.id;
      delete projectWithUserInfo._id;
      
      console.log('Employee creating project with data:', JSON.stringify(projectWithUserInfo, null, 2));
      
      const createdProject = await createProject(projectWithUserInfo);
      await loadProjects(); // Reload projects from database
      
      setNotificationMessage('Project created successfully!');
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      
      setIsProjectModalOpen(false);
      setSelectedProject(null);
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert(`Error creating project: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleProjectUpdate = async (updatedProject: Project) => {
    try {
      const projectId = updatedProject.id || updatedProject._id;
      if (!projectId) {
        console.error('No project ID available for update:', updatedProject);
        return;
      }
      await updateProject(String(projectId), updatedProject);
      await loadProjects(); // Reload projects from database
      
      setNotificationMessage('Project updated successfully!');
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating project:', error);
      alert(`Error updating project: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleProjectDelete = async (projectId: string) => {
    try {
      if (window.confirm('Are you sure you want to delete this project?')) {
        await deleteProject(projectId);
        await loadProjects(); // Reload projects from database
        
        setNotificationMessage('Project deleted successfully!');
        setShowNotification(true);
        setTimeout(() => {
          setShowNotification(false);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert(`Error deleting project: ${error.response?.data?.message || error.message}`);
    }
  };

  // Function to request task completion
  const handleTaskCompleted = async (task: Task) => {
    // Show modal for completion request
    setTaskToComplete(task);
    setShowCompletionModal(true);
  };

  const confirmCompletionRequest = async () => {
    if (!taskToComplete || !user?.id) return;

    try {
      const taskId = taskToComplete.id || taskToComplete._id;
      if (!taskId) {
        console.error('No task ID available for completion:', taskToComplete);
        return;
      }

      // Request completion approval
      await taskApi.requestTaskCompletion(taskId, user.id);
      
      // Show success notification
      setNotificationMessage('Completion request submitted. Waiting for director approval.');
      setShowNotification(true);
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      
      // Close modal and reload tasks
      setShowCompletionModal(false);
      setTaskToComplete(null);
      await loadTasks();
    } catch (error: any) {
      console.error('Error requesting task completion:', error);
      alert('Error submitting completion request. Please try again.');
    }
  };

  // Filter tasks based on user role
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  // Update filtered tasks when tasks, user, or filter changes
  useEffect(() => {
    let filtered = tasks.filter(task => {
      if (isEmployee) {
        return task.assignedToId === user?.id;
      }
      return true; // Directors and Project Heads see all tasks
    });

    // Apply task filter
    if (taskFilter !== 'all') {
      filtered = filtered.filter(task => {
        switch (taskFilter) {
          case 'completed':
            return task.status === 'Completed';
          case 'pending':
            return task.status === 'Pending' || task.status === 'In Progress';
          case 'overdue':
            return task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date();
          default:
            return true;
        }
      });
    }

    // Apply priority filter
    if (taskPriorityFilter !== 'all') {
      filtered = filtered.filter(task => {
        if (taskPriorityFilter === 'Custom') {
          // Custom priority: tasks that don't match standard priorities
          return task.priority !== 'Urgent' && task.priority !== 'Less Urgent' && task.priority !== 'Free Time';
        }
        return task.priority === taskPriorityFilter;
      });
    }

    // Apply task source filter (for employees only)
    if (isEmployee && taskSourceFilter !== 'all') {
      filtered = filtered.filter(task => {
        if (taskSourceFilter === 'director') {
          // Tasks assigned by Director - check if assignedById belongs to a director
          const assignedByUser = users.find(u => u.id === task.assignedById);
          return assignedByUser?.role === 'Director';
        } else if (taskSourceFilter === 'self') {
          // Tasks added by staff themselves - check if assignedById equals current employee's ID
          return task.assignedById === user?.id;
        }
        return true;
      });
    }

    setFilteredTasks(filtered);
  }, [tasks, user, isEmployee, taskFilter, taskPriorityFilter, taskSourceFilter, users]);

  const filteredProjects = projects.filter(project => {
    let filtered = true;

    if (isEmployee) {
      // Employees see projects they're assigned to
      filtered = project.assignedEmployeeId === user?.id;
    }

    // Apply project filter
    if (filtered && projectFilter !== 'all') {
      switch (projectFilter) {
        case 'employee':
          // Show projects assigned to employees (not directors/project heads)
          filtered = project.assignedEmployeeId !== user?.id;
          break;
        case 'completed':
          filtered = project.status === 'Completed';
          break;
        case 'pending':
          filtered = project.status === 'Active' || project.status === 'On Hold';
          break;
        default:
          filtered = true;
      }
    }

    // Apply project source filter (for employees only)
    if (isEmployee && filtered && projectSourceFilter !== 'all') {
      // Check if project was self-created by comparing assignedEmployeeName with current user's name/email
      const isSelfCreated = project.assignedEmployeeId === user?.id && 
                            (project.assignedEmployeeName === user?.name || 
                             project.assignedEmployeeName === user?.email ||
                             project.assignedEmployeeName === `${user?.name || ''}`.trim());
      
      if (projectSourceFilter === 'director') {
        // Projects assigned by Director - exclude self-created projects
        if (isSelfCreated) return false;
      } else if (projectSourceFilter === 'self') {
        // Projects added by staff themselves - only show self-created projects
        if (!isSelfCreated) return false;
      }
    }

    return filtered;
  });

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#f9fafb',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          fontSize: '20px',
          color: '#4b5563'
        }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100%'
    }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isEmployee={true} />
      
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        marginLeft: '256px',
        width: 'calc(100% - 256px)',
        height: '100vh'
      }}>
        <Header user={user} />
        
        <main style={{
          flex: 1,
          overflowX: 'hidden',
          overflowY: 'visible',
          padding: '32px',
          backgroundColor: '#f8fafc',
          minHeight: 'auto',
          width: '100%'
        }}>
          {/* Success Notification */}
          {showNotification && (
            <div style={{
              position: 'fixed',
              top: '80px',
              right: '24px',
              zIndex: 50,
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transform: 'translateY(0)',
              transition: 'all 0.3s ease-out',
              animation: 'bounce 1s infinite'
            }}>
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{notificationMessage}</span>
              <button
                onClick={() => setShowNotification(false)}
                style={{
                  marginLeft: '16px',
                  color: '#ffffff',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#d1fae5';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {activeTab === 'overview' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '32px',
              maxWidth: '100%',
              width: '100%'
            }}>
              {/* Header Section */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%'
              }}>
                <h1 style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#111827',
                  margin: 0
                }}>Dashboard</h1>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}>
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    This week
                  </button>
                    </div>
                    </div>
              
              {/* Stats Cards Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                width: '100%'
              }}>
                {/* Urgent Tasks Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px -5px rgba(255, 107, 107, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 35px -5px rgba(255, 107, 107, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(255, 107, 107, 0.3)';
                }}
                onClick={() => {
                  setSelectedPriorityCard(selectedPriorityCard === 'urgent' ? null : 'urgent');
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h3 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        margin: 0,
                        opacity: 0.95,
                        letterSpacing: '0.5px'
                      }}>
                        Urgent Tasks
                      </h3>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                  }}>
                        <AlertCircle size={20} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: '700',
                      margin: '0 0 8px 0',
                      letterSpacing: '-1px'
                    }}>
                      {employeePriorityStats.urgentTasks}
                  </div>
                  <div style={{
                    fontSize: '12px',
                      opacity: 0.8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <AlertCircle size={12} />
                      <span>High priority tasks</span>
                    </div>
                  </div>
                </div>

                {/* Less Urgent Tasks Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px -5px rgba(245, 87, 108, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 35px -5px rgba(245, 87, 108, 0.4)';
                  }}
                  onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(245, 87, 108, 0.3)';
                }}
                onClick={() => {
                  setSelectedPriorityCard(selectedPriorityCard === 'lessUrgent' ? null : 'lessUrgent');
                }}>
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h3 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        margin: 0,
                        opacity: 0.95,
                        letterSpacing: '0.5px'
                }}>
                        Less Urgent Tasks
                      </h3>
                  <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                  }}>
                        <Clock size={20} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: '700',
                      margin: '0 0 8px 0',
                      letterSpacing: '-1px'
                    }}>
                      {employeePriorityStats.lessUrgentTasks}
                  </div>
                  <div style={{
                    fontSize: '12px',
                      opacity: 0.8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} />
                      <span>Medium priority tasks</span>
                    </div>
                  </div>
                </div>

                {/* Free Time Tasks Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #48cae4 0%, #023e8a 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px -5px rgba(72, 202, 228, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 35px -5px rgba(72, 202, 228, 0.4)';
                  }}
                  onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(72, 202, 228, 0.3)';
                }}
                onClick={() => {
                  setSelectedPriorityCard(selectedPriorityCard === 'freeTime' ? null : 'freeTime');
                }}>
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h3 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        margin: 0,
                        opacity: 0.95,
                        letterSpacing: '0.5px'
                }}>
                        Free Time Tasks
                      </h3>
                  <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                  }}>
                        <CheckCircle size={20} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: '700',
                      margin: '0 0 8px 0',
                      letterSpacing: '-1px'
                    }}>
                      {employeePriorityStats.freeTimeTasks}
                            </div>
                  <div style={{
                    fontSize: '12px',
                      opacity: 0.8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle size={12} />
                      <span>Low priority tasks</span>
                    </div>
                  </div>
                </div>

                {/* Completed Tasks Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #06ffa5 0%, #00d4aa 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px -5px rgba(6, 255, 165, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 35px -5px rgba(6, 255, 165, 0.4)';
                  }}
                  onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(6, 255, 165, 0.3)';
                }}
                onClick={() => {
                  setSelectedPriorityCard(selectedPriorityCard === 'completed' ? null : 'completed');
                }}>
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h3 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        margin: 0,
                        opacity: 0.95,
                        letterSpacing: '0.5px'
                }}>
                        Completed Tasks
                      </h3>
                  <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                  }}>
                        <CheckCircle2 size={20} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: '700',
                      margin: '0 0 8px 0',
                      letterSpacing: '-1px'
                    }}>
                      {employeePriorityStats.totalCompletedTasks}
                            </div>
                  <div style={{
                    fontSize: '12px',
                      opacity: 0.8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle2 size={12} />
                      <span>Tasks finished</span>
                    </div>
                        </div>
                      </div>
                        </div>

              {/* Priority Tasks Table - Show when priority card is clicked */}
              {selectedPriorityCard && (() => {
                // Filter tasks based on selected card
                let filteredPriorityTasks: Task[] = [];
                let cardTitle = '';
                
                const employeeTasks = filteredTasks.filter(task => {
                  const taskAssignedId = task.assignedToId || '';
                  const userId = user?.id || '';
                  return taskAssignedId === userId || String(taskAssignedId) === String(userId);
                });
                
                switch (selectedPriorityCard) {
                  case 'urgent':
                    filteredPriorityTasks = employeeTasks.filter(t => t.priority === 'Urgent');
                    cardTitle = 'Urgent Tasks';
                    break;
                  case 'lessUrgent':
                    filteredPriorityTasks = employeeTasks.filter(t => t.priority === 'Less Urgent');
                    cardTitle = 'Less Urgent Tasks';
                    break;
                  case 'freeTime':
                    filteredPriorityTasks = employeeTasks.filter(t => t.priority === 'Free Time');
                    cardTitle = 'Free Time Tasks';
                    break;
                  case 'completed':
                    filteredPriorityTasks = employeeTasks.filter(t => t.status === 'Completed');
                    cardTitle = 'Completed Tasks';
                    break;
                }
                
                const priorityColors: Record<string, { bg: string; text: string }> = {
                  'Urgent': { bg: '#fee2e2', text: '#dc2626' },
                  'Less Urgent': { bg: '#fef3c7', text: '#d97706' },
                  'Free Time': { bg: '#d1fae5', text: '#059669' },
                  'Custom': { bg: '#e0e7ff', text: '#6366f1' }
                };
                const statusColors: Record<string, { bg: string; text: string }> = {
                  'Pending': { bg: '#fef3c7', text: '#d97706' },
                  'In Progress': { bg: '#dbeafe', text: '#2563eb' },
                  'Completed': { bg: '#d1fae5', text: '#059669' }
                };
                
                return (
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                    marginTop: '24px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '24px',
                      paddingBottom: '16px',
                      borderBottom: '2px solid #f3f4f6'
                    }}>
                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#111827',
                        margin: 0,
                        letterSpacing: '-0.5px'
                      }}>
                        {cardTitle}
                      </h3>
                      <button
                        onClick={() => setSelectedPriorityCard(null)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <X size={20} color="#6b7280" />
                      </button>
                    </div>
                    
                    {filteredPriorityTasks.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'separate',
                          borderSpacing: 0
                        }}>
                          <thead style={{ 
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                            borderBottom: '2px solid #e5e7eb'
                          }}>
                            <tr>
                              <th style={{
                                padding: '16px 20px',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#374151',
                                letterSpacing: '-0.3px',
                                borderBottom: '2px solid #e5e7eb'
                              }}>
                                Priority
                              </th>
                              <th style={{
                                padding: '16px 20px',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#374151',
                                letterSpacing: '-0.3px',
                                borderBottom: '2px solid #e5e7eb'
                              }}>
                                Status
                              </th>
                              <th style={{
                                padding: '16px 20px',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#374151',
                                letterSpacing: '-0.3px',
                                borderBottom: '2px solid #e5e7eb'
                              }}>
                                Project Name
                              </th>
                              <th style={{
                                padding: '16px 20px',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#374151',
                                letterSpacing: '-0.3px',
                                borderBottom: '2px solid #e5e7eb'
                              }}>
                                Task Title
                              </th>
                              <th style={{
                                padding: '16px 20px',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#374151',
                                letterSpacing: '-0.3px',
                                borderBottom: '2px solid #e5e7eb'
                              }}>
                                Description / Remarks
                              </th>
                              <th style={{
                                padding: '16px 20px',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#374151',
                                letterSpacing: '-0.3px',
                                borderBottom: '2px solid #e5e7eb'
                              }}>
                                Work Done (%)
                              </th>
                              <th style={{
                                padding: '16px 20px',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#374151',
                                letterSpacing: '-0.3px',
                                borderBottom: '2px solid #e5e7eb'
                              }}>
                                Flag (Director Input Required)
                              </th>
                              <th style={{
                                padding: '16px 20px',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#374151',
                                letterSpacing: '-0.3px',
                                borderBottom: '2px solid #e5e7eb'
                              }}>
                                Date
                              </th>
                              <th style={{
                                padding: '16px 20px',
                                textAlign: 'left',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#374151',
                                letterSpacing: '-0.3px',
                                borderBottom: '2px solid #e5e7eb'
                              }}>
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPriorityTasks.map((task, index) => {
                              const priorityColor = priorityColors[task.priority || 'Less Urgent'] || priorityColors['Less Urgent'];
                              const statusColor = statusColors[task.status || 'Pending'] || statusColors['Pending'];
                              
                              return (
                                <tr
                                  key={task.id || task._id}
                                  style={{
                                    borderBottom: index < filteredPriorityTasks.length - 1 ? '1px solid #f3f4f6' : 'none',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: task.flagDirectorInputRequired ? '#fef2f2' : 'transparent',
                                    cursor: 'pointer'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = task.flagDirectorInputRequired ? '#fee2e2' : '#f8fafc';
                                    e.currentTarget.style.transform = 'scale(1.002)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = task.flagDirectorInputRequired ? '#fef2f2' : 'transparent';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                >
                                  {/* Priority */}
                                  <td style={{
                                    padding: '20px',
                                    borderTopLeftRadius: index === 0 ? '12px' : '0',
                                    borderBottomLeftRadius: index === filteredPriorityTasks.length - 1 ? '12px' : '0'
                                  }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '8px 16px',
                                      borderRadius: '10px',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      letterSpacing: '0.3px',
                                      textTransform: 'uppercase',
                                      backgroundColor: priorityColor.bg,
                                      color: priorityColor.text,
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}>
                                      {task.priority || 'Less Urgent'}
                                    </span>
                                  </td>
                                  {/* Status */}
                                  <td style={{ padding: '20px' }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '8px 16px',
                                      borderRadius: '10px',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      letterSpacing: '0.3px',
                                      textTransform: 'uppercase',
                                      backgroundColor: statusColor.bg,
                                      color: statusColor.text,
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}>
                                      {task.status || 'Pending'}
                                    </span>
                                  </td>
                                  {/* Project Name */}
                                  <td style={{ padding: '20px' }}>
                                    <span style={{ 
                                      fontSize: '14px', 
                                      color: '#111827',
                                      fontWeight: '500'
                                    }}>
                                      {task.projectName || 'N/A'}
                                    </span>
                                  </td>
                                  {/* Task Title */}
                                  <td style={{ padding: '20px' }}>
                                    <p style={{
                                      fontSize: '15px',
                                      fontWeight: '700',
                                      color: '#111827',
                                      margin: 0,
                                      letterSpacing: '-0.3px'
                                    }}>
                                      {task.title}
                                    </p>
                                  </td>
                                  {/* Description / Remarks */}
                                  <td style={{ padding: '20px' }}>
                                    <p style={{
                                      fontSize: '13px',
                                      color: '#6b7280',
                                      margin: 0,
                                      lineHeight: '1.5',
                                      maxWidth: '300px',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden'
                                    }}>
                                      {task.description || 'No description'}
                                    </p>
                                  </td>
                                  {/* Work Done (%) */}
                                  <td style={{ padding: '20px' }}>
                                    {editingWorkDone === (task.id || task._id) ? (
                                      <select
                                        value={workDoneValue}
                                        onChange={(e) => {
                                          setWorkDoneValue(Number(e.target.value));
                                          handleWorkDoneSave({ ...task, workDone: Number(e.target.value) });
                                        }}
                                        onBlur={() => {
                                          handleWorkDoneSave(task);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Escape') {
                                            handleWorkDoneCancel();
                                          }
                                        }}
                                        autoFocus
                                        style={{
                                          padding: '6px 12px',
                                          border: '2px solid #3b82f6',
                                          borderRadius: '8px',
                                          fontSize: '13px',
                                          fontWeight: '600',
                                          backgroundColor: '#ffffff',
                                          color: '#4f46e5',
                                          outline: 'none',
                                          cursor: 'pointer',
                                          minWidth: '100px'
                                        }}
                                      >
                                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(percent => (
                                          <option key={percent} value={percent}>
                                            {percent}%
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span
                                        onClick={() => handleWorkDoneEdit(task)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '6px 12px',
                                          borderRadius: '8px',
                                          fontSize: '13px',
                                          fontWeight: '600',
                                          backgroundColor: '#e0e7ff',
                                          color: '#4f46e5',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.backgroundColor = '#c7d2fe';
                                          e.currentTarget.style.transform = 'scale(1.05)';
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.backgroundColor = '#e0e7ff';
                                          e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                        title="Click to edit Work Done (%)"
                                      >
                                        {task.workDone || 0}%
                                      </span>
                                    )}
                                  </td>
                                  {/* Flag (Director Input Required) */}
                                  <td style={{ padding: '20px' }}>
                                    {task.flagDirectorInputRequired ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        backgroundColor: '#fee2e2',
                                        color: '#dc2626'
                                      }}>
                                        Yes
                                      </span>
                                    ) : (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        backgroundColor: '#f3f4f6',
                                        color: '#6b7280'
                                      }}>
                                        No
                                      </span>
                                    )}
                                  </td>
                                  {/* Date */}
                                  <td style={{ padding: '20px' }}>
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '6px'
                                    }}>
                                      {/* Created Date */}
                                      <div style={{
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        fontWeight: '500'
                                      }}>
                                        <span style={{ fontWeight: '600', color: '#374151' }}>Created: </span>
                                        {task.startDate 
                                          ? new Date(task.startDate).toLocaleDateString() 
                                          : 'N/A'}
                                      </div>
                                      {/* Reminder Date */}
                                      {task.reminderDate && (
                                        <div style={{
                                          fontSize: '12px',
                                          color: '#dc2626',
                                          fontWeight: '500',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          <span style={{ fontWeight: '600' }}>Reminder: </span>
                                          {new Date(task.reminderDate).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  {/* Actions */}
                                  <td style={{
                                    padding: '20px',
                                    borderTopRightRadius: index === 0 ? '12px' : '0',
                                    borderBottomRightRadius: index === filteredPriorityTasks.length - 1 ? '12px' : '0'
                                  }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTask(task);
                                        setIsTaskModalOpen(true);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        backgroundColor: '#dbeafe',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#1e40af',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#bfdbfe';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = '#dbeafe';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(59, 130, 246, 0.2)';
                                      }}
                                    >
                                      <Eye size={14} />
                                      View
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#6b7280'
                      }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          marginBottom: '8px'
                        }}>
                          No {cardTitle.toLowerCase()} found
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#9ca3af'
                        }}>
                          There are no tasks matching this category at the moment.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Assigned Tasks Table */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb',
                marginTop: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                  paddingBottom: '16px',
                  borderBottom: '2px solid #f3f4f6'
                }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#111827',
                    margin: 0,
                    letterSpacing: '-0.5px'
                  }}>
                    My Assigned Tasks
                  </h3>
                </div>
                
                {(() => {
                  const employeeTasks = filteredTasks.filter(task => {
                    const taskAssignedId = task.assignedToId || '';
                    const userId = user?.id || '';
                    return taskAssignedId === userId || String(taskAssignedId) === String(userId);
                  });

                  const priorityColors: Record<string, { bg: string; text: string }> = {
                    'Urgent': { bg: '#fee2e2', text: '#dc2626' },
                    'Less Urgent': { bg: '#fef3c7', text: '#d97706' },
                    'Free Time': { bg: '#d1fae5', text: '#059669' },
                    'Custom': { bg: '#e0e7ff', text: '#6366f1' }
                  };
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    'Pending': { bg: '#fef3c7', text: '#d97706' },
                    'In Progress': { bg: '#dbeafe', text: '#2563eb' },
                    'Completed': { bg: '#d1fae5', text: '#059669' }
                  };

                  return employeeTasks.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'separate',
                        borderSpacing: 0
                      }}>
                        <thead style={{ 
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          <tr>
                            <th style={{
                              padding: '16px 20px',
                              textAlign: 'left',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#374151',
                              letterSpacing: '-0.3px',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              Priority
                            </th>
                            <th style={{
                              padding: '16px 20px',
                              textAlign: 'left',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#374151',
                              letterSpacing: '-0.3px',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              Status
                            </th>
                            <th style={{
                              padding: '16px 20px',
                              textAlign: 'left',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#374151',
                              letterSpacing: '-0.3px',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              Project Name
                            </th>
                            <th style={{
                              padding: '16px 20px',
                              textAlign: 'left',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#374151',
                              letterSpacing: '-0.3px',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              Task Title
                            </th>
                            <th style={{
                              padding: '16px 20px',
                              textAlign: 'left',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#374151',
                              letterSpacing: '-0.3px',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              Description / Remarks
                            </th>
                            <th style={{
                              padding: '16px 20px',
                              textAlign: 'left',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#374151',
                              letterSpacing: '-0.3px',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              Work Done (%)
                            </th>
                            <th style={{
                              padding: '16px 20px',
                              textAlign: 'left',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#374151',
                              letterSpacing: '-0.3px',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              Flag (Director Input Required)
                            </th>
                            <th style={{
                              padding: '16px 20px',
                              textAlign: 'left',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#374151',
                              letterSpacing: '-0.3px',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              Date
                            </th>
                            <th style={{
                              padding: '16px 20px',
                              textAlign: 'left',
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#374151',
                              letterSpacing: '-0.3px',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeTasks.map((task, index) => {
                            const priorityColor = priorityColors[task.priority || 'Less Urgent'] || priorityColors['Less Urgent'];
                            const statusColor = statusColors[task.status || 'Pending'] || statusColors['Pending'];
                            
                            return (
                              <tr
                                key={task.id || task._id}
                                style={{
                                  borderBottom: index < employeeTasks.length - 1 ? '1px solid #f3f4f6' : 'none',
                                  transition: 'all 0.2s ease',
                                  backgroundColor: task.flagDirectorInputRequired ? '#fef2f2' : 'transparent',
                                  cursor: 'pointer'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = task.flagDirectorInputRequired ? '#fee2e2' : '#f8fafc';
                                  e.currentTarget.style.transform = 'scale(1.002)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = task.flagDirectorInputRequired ? '#fef2f2' : 'transparent';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                {/* Priority */}
                                <td style={{
                                  padding: '20px',
                                  borderTopLeftRadius: index === 0 ? '12px' : '0',
                                  borderBottomLeftRadius: index === employeeTasks.length - 1 ? '12px' : '0'
                                }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    textTransform: 'uppercase',
                                    backgroundColor: priorityColor.bg,
                                    color: priorityColor.text,
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                  }}>
                                    {task.priority || 'Less Urgent'}
                                  </span>
                                </td>
                                {/* Status */}
                                <td style={{ padding: '20px' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    letterSpacing: '0.3px',
                                    textTransform: 'uppercase',
                                    backgroundColor: statusColor.bg,
                                    color: statusColor.text,
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                  }}>
                                    {task.status || 'Pending'}
                                  </span>
                                </td>
                                {/* Project Name */}
                                <td style={{ padding: '20px' }}>
                                  <span style={{ 
                                    fontSize: '14px', 
                                    color: '#111827',
                                    fontWeight: '500'
                                  }}>
                                    {task.projectName || 'N/A'}
                                  </span>
                                </td>
                                {/* Task Title */}
                                <td style={{ padding: '20px' }}>
                                  <p style={{
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    color: '#111827',
                                    margin: 0,
                                    letterSpacing: '-0.3px'
                                  }}>
                                    {task.title}
                                  </p>
                                </td>
                                {/* Description / Remarks */}
                                <td style={{ padding: '20px' }}>
                                  <p style={{
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    margin: 0,
                                    lineHeight: '1.5',
                                    maxWidth: '300px',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                  }}>
                                    {task.description || 'No description'}
                                  </p>
                                </td>
                                {/* Work Done (%) */}
                                <td style={{ padding: '20px' }}>
                                  {editingWorkDone === (task.id || task._id) ? (
                                    <select
                                      value={workDoneValue}
                                      onChange={(e) => {
                                        setWorkDoneValue(Number(e.target.value));
                                        handleWorkDoneSave({ ...task, workDone: Number(e.target.value) });
                                      }}
                                      onBlur={() => {
                                        handleWorkDoneSave(task);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                          handleWorkDoneCancel();
                                        }
                                      }}
                                      autoFocus
                                      style={{
                                        padding: '6px 12px',
                                        border: '2px solid #3b82f6',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        backgroundColor: '#ffffff',
                                        color: '#4f46e5',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        minWidth: '100px'
                                      }}
                                    >
                                      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(percent => (
                                        <option key={percent} value={percent}>
                                          {percent}%
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span
                                      onClick={() => handleWorkDoneEdit(task)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        backgroundColor: '#e0e7ff',
                                        color: '#4f46e5',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#c7d2fe';
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = '#e0e7ff';
                                        e.currentTarget.style.transform = 'scale(1)';
                                      }}
                                      title="Click to edit Work Done (%)"
                                    >
                                      {task.workDone || 0}%
                                    </span>
                                  )}
                                </td>
                                {/* Flag (Director Input Required) */}
                                <td style={{ padding: '20px' }}>
                                  {task.flagDirectorInputRequired ? (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      backgroundColor: '#fee2e2',
                                      color: '#dc2626'
                                    }}>
                                      Yes
                                    </span>
                                  ) : (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      backgroundColor: '#f3f4f6',
                                      color: '#6b7280'
                                    }}>
                                      No
                                    </span>
                                  )}
                                </td>
                                {/* Date */}
                                <td style={{ padding: '20px' }}>
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                  }}>
                                    {/* Created Date */}
                                    <div style={{
                                      fontSize: '12px',
                                      color: '#6b7280',
                                      fontWeight: '500'
                                    }}>
                                      <span style={{ fontWeight: '600', color: '#374151' }}>Created: </span>
                                      {task.startDate 
                                        ? new Date(task.startDate).toLocaleDateString() 
                                        : 'N/A'}
                                    </div>
                                    {/* Reminder Date */}
                                    {task.reminderDate && (
                                      <div style={{
                                        fontSize: '12px',
                                        color: '#dc2626',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}>
                                        <span style={{ fontWeight: '600' }}>Reminder: </span>
                                        {new Date(task.reminderDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {/* Actions */}
                                <td style={{
                                  padding: '20px',
                                  borderTopRightRadius: index === 0 ? '12px' : '0',
                                  borderBottomRightRadius: index === employeeTasks.length - 1 ? '12px' : '0'
                                }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTask(task);
                                      setIsTaskModalOpen(true);
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '8px 14px',
                                      backgroundColor: '#dbeafe',
                                      border: 'none',
                                      borderRadius: '8px',
                                      color: '#1e40af',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = '#bfdbfe';
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = '#dbeafe';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(59, 130, 246, 0.2)';
                                    }}
                                  >
                                    <Eye size={14} />
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      color: '#6b7280'
                    }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '8px'
                      }}>
                        No tasks assigned
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#9ca3af'
                      }}>
                        You don't have any assigned tasks at the moment.
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {activeTab === 'tasks' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '32px',
              width: '100%',
              maxWidth: '100%'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                width: '100%'
              }}>
                  <div>
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#111827',
                    margin: 0
                  }}>Tasks</h1>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '16px',
                    margin: 0,
                    marginTop: '8px'
                  }}>My Access</p>
                  </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px'
                }}>
                  {/* Create Task Button */}
                  <button
                    onClick={() => {
                      setSelectedTask(null);
                      setIsTaskModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                    }}
                  >
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Task
                  </button>
                  {/* Search Bar */}
                  <div style={{ position: 'relative', minWidth: '280px' }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      paddingLeft: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}>
                      <svg style={{ height: '20px', width: '20px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search my tasks..."
                      style={{
                        display: 'block',
                        width: '100%',
                        minWidth: '280px',
                        paddingLeft: '40px',
                        paddingRight: '12px',
                        paddingTop: '12px',
                        paddingBottom: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '10px',
                        lineHeight: '1.25',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#10b981';
                        e.target.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                      onChange={(e) => {
                        const searchTerm = e.target.value.toLowerCase();
                        let filtered = tasks.filter(task => {
                          if (isEmployee) {
                            if (task.assignedToId !== user?.id) return false;
                          }
                          
                          // Apply search filter
                          if (searchTerm !== '') {
                            const matchesSearch = 
                              (task.title && task.title.toLowerCase().includes(searchTerm)) ||
                              (task.description && task.description.toLowerCase().includes(searchTerm)) ||
                              (task.projectName && task.projectName.toLowerCase().includes(searchTerm)) ||
                              (task.assignedByName && task.assignedByName.toLowerCase().includes(searchTerm));
                            if (!matchesSearch) return false;
                          }
                          
                          // Apply status filter
                          if (taskFilter !== 'all') {
                            switch (taskFilter) {
                              case 'completed':
                                if (task.status !== 'Completed') return false;
                                break;
                              case 'pending':
                                if (task.status !== 'Pending' && task.status !== 'In Progress') return false;
                                break;
                              case 'overdue':
                                if (task.status === 'Completed' || !task.dueDate || new Date(task.dueDate) >= new Date()) return false;
                                break;
                            }
                          }
                          
                          // Apply priority filter
                          if (taskPriorityFilter !== 'all') {
                            if (taskPriorityFilter === 'Custom') {
                              if (task.priority === 'Urgent' || task.priority === 'Less Urgent' || task.priority === 'Free Time') return false;
                            } else {
                              if (task.priority !== taskPriorityFilter) return false;
                            }
                          }
                          
                          // Apply task source filter (for employees only)
                          if (isEmployee && taskSourceFilter !== 'all') {
                            if (taskSourceFilter === 'director') {
                              // Tasks assigned by Director
                              const assignedByUser = users.find(u => u.id === task.assignedById);
                              if (assignedByUser?.role !== 'Director') return false;
                            } else if (taskSourceFilter === 'self') {
                              // Tasks added by staff themselves
                              if (task.assignedById !== user?.id) return false;
                            }
                          }
                          
                          return true;
                        });
                        setFilteredTasks(filtered);
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Filters Row */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '24px',
                flexWrap: 'wrap'
              }}>
                {/* Task Status Filter Dropdown */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Task Status:
                  </label>
                  <select
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value as 'all' | 'completed' | 'pending' | 'overdue')}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      cursor: 'pointer',
                      outline: 'none',
                      width: '200px',
                      transition: 'all 0.2s ease'
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
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                {/* Priority Filter Dropdown */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Categorized by Priority:
                  </label>
                  <select
                    value={taskPriorityFilter}
                    onChange={(e) => setTaskPriorityFilter(e.target.value as 'all' | 'Urgent' | 'Less Urgent' | 'Free Time' | 'Custom')}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      cursor: 'pointer',
                      outline: 'none',
                      width: '200px',
                      transition: 'all 0.2s ease'
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
                    <option value="all">All Priorities</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Less Urgent">Less Urgent</option>
                    <option value="Free Time">Free Time</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                {/* Task Source Filter - Only for Employees */}
                {isEmployee && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Tasks visible:
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => setTaskSourceFilter('all')}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: taskSourceFilter === 'all' ? '#3b82f6' : '#ffffff',
                          color: taskSourceFilter === 'all' ? '#ffffff' : '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          if (taskSourceFilter !== 'all') {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#9ca3af';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (taskSourceFilter !== 'all') {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#d1d5db';
                          }
                        }}
                      >
                        All Tasks
                      </button>
                      <button
                        onClick={() => setTaskSourceFilter('director')}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: taskSourceFilter === 'director' ? '#2563eb' : '#ffffff',
                          color: taskSourceFilter === 'director' ? '#ffffff' : '#1e40af',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          if (taskSourceFilter !== 'director') {
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                            e.currentTarget.style.borderColor = '#1e40af';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (taskSourceFilter !== 'director') {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#d1d5db';
                          }
                        }}
                      >
                        Assigned by Director
                      </button>
                      <button
                        onClick={() => setTaskSourceFilter('self')}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: taskSourceFilter === 'self' ? '#10b981' : '#ffffff',
                          color: taskSourceFilter === 'self' ? '#ffffff' : '#059669',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          if (taskSourceFilter !== 'self') {
                            e.currentTarget.style.backgroundColor = '#ecfdf5';
                            e.currentTarget.style.borderColor = '#059669';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (taskSourceFilter !== 'self') {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#d1d5db';
                          }
                        }}
                      >
                        Tasks added by staff themselves
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Tasks Table View */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                width: '100%',
                maxWidth: '100%'
              }}>
                <div style={{ 
                  overflowX: 'auto',
                  width: '100%'
                }}>
                  <table style={{
                    width: '100%',
                    minWidth: '800px',
                    borderCollapse: 'separate',
                    borderSpacing: 0
                  }}>
                    <thead style={{ 
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      <tr>
                        <th style={{
                          padding: '16px 20px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#374151',
                          letterSpacing: '-0.3px',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          Priority
                        </th>
                        <th style={{
                          padding: '16px 20px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#374151',
                          letterSpacing: '-0.3px',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          Status
                        </th>
                        <th style={{
                          padding: '16px 20px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#374151',
                          letterSpacing: '-0.3px',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          Project Name
                        </th>
                        <th style={{
                          padding: '16px 20px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#374151',
                          letterSpacing: '-0.3px',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          Task Title
                        </th>
                        <th style={{
                          padding: '16px 20px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#374151',
                          letterSpacing: '-0.3px',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          Description / Remarks
                        </th>
                        <th style={{
                          padding: '16px 20px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#374151',
                          letterSpacing: '-0.3px',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          Work Done (%)
                        </th>
                        <th style={{
                          padding: '16px 20px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#374151',
                          letterSpacing: '-0.3px',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          Flag (Director Input Required)
                        </th>
                        <th style={{
                          padding: '16px 20px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#374151',
                          letterSpacing: '-0.3px',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          Date
                        </th>
                        <th style={{
                          padding: '16px 20px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#374151',
                          letterSpacing: '-0.3px',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task, index) => {
                        const priorityColors: Record<string, { bg: string; text: string }> = {
                          'Urgent': { bg: '#fee2e2', text: '#dc2626' },
                          'Less Urgent': { bg: '#fef3c7', text: '#d97706' },
                          'Free Time': { bg: '#d1fae5', text: '#059669' },
                          'Custom': { bg: '#e0e7ff', text: '#6366f1' }
                        };
                        const statusColors: Record<string, { bg: string; text: string }> = {
                          'Pending': { bg: '#fef3c7', text: '#d97706' },
                          'In Progress': { bg: '#dbeafe', text: '#2563eb' },
                          'Completed': { bg: '#d1fae5', text: '#059669' }
                        };
                        const priorityColor = priorityColors[task.priority || 'Less Urgent'] || priorityColors['Less Urgent'];
                        const statusColor = statusColors[task.status || 'Pending'] || statusColors['Pending'];
                        
                        return (
                          <tr
                            key={task.id || task._id}
                            style={{
                              borderBottom: index < filteredTasks.length - 1 ? '1px solid #f3f4f6' : 'none',
                              transition: 'all 0.2s ease',
                              backgroundColor: task.flagDirectorInputRequired ? '#fef2f2' : 'transparent',
                              cursor: 'pointer'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = task.flagDirectorInputRequired ? '#fee2e2' : '#f8fafc';
                              e.currentTarget.style.transform = 'scale(1.002)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = task.flagDirectorInputRequired ? '#fef2f2' : 'transparent';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            {/* Priority */}
                            <td style={{
                              padding: '20px',
                              borderTopLeftRadius: index === 0 ? '12px' : '0',
                              borderBottomLeftRadius: index === filteredTasks.length - 1 ? '12px' : '0'
                            }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '700',
                                letterSpacing: '0.3px',
                                textTransform: 'uppercase',
                                backgroundColor: priorityColor.bg,
                                color: priorityColor.text,
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                              }}>
                                {task.priority || 'Less Urgent'}
                              </span>
                            </td>
                            {/* Status */}
                            <td style={{ padding: '20px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '700',
                                letterSpacing: '0.3px',
                                textTransform: 'uppercase',
                                backgroundColor: statusColor.bg,
                                color: statusColor.text,
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                              }}>
                                {task.status || 'Pending'}
                              </span>
                            </td>
                            {/* Project Name */}
                            <td style={{ padding: '20px' }}>
                              <span style={{ 
                                fontSize: '14px', 
                                color: '#111827',
                                fontWeight: '500'
                              }}>
                                {task.projectName || 'N/A'}
                              </span>
                            </td>
                            {/* Task Title */}
                            <td style={{ padding: '20px' }}>
                              <p style={{
                                fontSize: '15px',
                                fontWeight: '700',
                                color: '#111827',
                                margin: 0,
                                letterSpacing: '-0.3px'
                              }}>
                                {task.title}
                              </p>
                            </td>
                            {/* Description / Remarks */}
                            <td style={{ padding: '20px' }}>
                              <p style={{
                                fontSize: '13px',
                                color: '#6b7280',
                                margin: 0,
                                lineHeight: '1.5',
                                maxWidth: '300px',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {task.description || 'No description'}
                              </p>
                            </td>
                            {/* Work Done (%) */}
                            <td style={{ padding: '20px' }}>
                              {editingWorkDone === (task.id || task._id) ? (
                                <select
                                  value={workDoneValue}
                                  onChange={(e) => {
                                    setWorkDoneValue(Number(e.target.value));
                                    handleWorkDoneSave({ ...task, workDone: Number(e.target.value) });
                                  }}
                                  onBlur={() => {
                                    handleWorkDoneSave(task);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      handleWorkDoneCancel();
                                    }
                                  }}
                                  autoFocus
                                  style={{
                                    padding: '6px 12px',
                                    border: '2px solid #3b82f6',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    backgroundColor: '#ffffff',
                                    color: '#4f46e5',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    minWidth: '100px'
                                  }}
                                >
                                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(percent => (
                                    <option key={percent} value={percent}>
                                      {percent}%
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  onClick={() => handleWorkDoneEdit(task)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    backgroundColor: '#e0e7ff',
                                    color: '#4f46e5',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#c7d2fe';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#e0e7ff';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                  title="Click to edit Work Done (%)"
                                >
                                  {task.workDone || 0}%
                                </span>
                              )}
                            </td>
                            {/* Flag (Director Input Required) */}
                            <td style={{ padding: '20px' }}>
                              {task.flagDirectorInputRequired ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626'
                                }}>
                                  Yes
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#f3f4f6',
                                  color: '#6b7280'
                                }}>
                                  No
                                </span>
                              )}
                            </td>
                            {/* Date */}
                            <td style={{ padding: '20px' }}>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}>
                                {/* Created Date */}
                                <div style={{
                                  fontSize: '12px',
                                  color: '#6b7280',
                                  fontWeight: '500'
                                }}>
                                  <span style={{ fontWeight: '600', color: '#374151' }}>Created: </span>
                                  {task.startDate 
                                    ? new Date(task.startDate).toLocaleDateString() 
                                    : 'N/A'}
                                </div>
                                {/* Reminder Date */}
                                {task.reminderDate && (
                                  <div style={{
                                    fontSize: '12px',
                                    color: '#dc2626',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <span style={{ fontWeight: '600' }}>Reminder: </span>
                                    {new Date(task.reminderDate).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </td>
                            {/* Actions */}
                            <td style={{
                              padding: '20px',
                              borderTopRightRadius: index === 0 ? '12px' : '0',
                              borderBottomRightRadius: index === filteredTasks.length - 1 ? '12px' : '0'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flexWrap: 'wrap'
                              }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTask(task);
                                    setIsTaskModalOpen(true);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    backgroundColor: '#dbeafe',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#1e40af',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#bfdbfe';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#dbeafe';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(59, 130, 246, 0.2)';
                                  }}
                                >
                                  <Eye size={14} />
                                  View
                                </button>
                                {/* Show Edit, Delete buttons only for employee-created tasks */}
                                {task.isEmployeeCreated && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTask(task);
                                        setIsTaskModalOpen(true);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        backgroundColor: '#dcfce7',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#15803d',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 2px rgba(21, 128, 61, 0.2)'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#bbf7d0';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(21, 128, 61, 0.3)';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = '#dcfce7';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(21, 128, 61, 0.2)';
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const taskId = task.id || task._id;
                                        if (taskId) {
                                          handleTaskDelete(String(taskId));
                                        }
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        backgroundColor: '#fee2e2',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#dc2626',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#fecaca';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(220, 38, 38, 0.3)';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = '#fee2e2';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(220, 38, 38, 0.2)';
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                                {/* Show Complete button for non-employee-created tasks */}
                                {!task.isEmployeeCreated && task.status !== 'Completed' && task.completionRequestStatus !== 'Pending' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskCompleted(task);
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '8px 14px',
                                      backgroundColor: '#dcfce7',
                                      border: 'none',
                                      borderRadius: '8px',
                                      color: '#15803d',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      boxShadow: '0 1px 2px rgba(21, 128, 61, 0.2)'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = '#bbf7d0';
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(21, 128, 61, 0.3)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = '#dcfce7';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(21, 128, 61, 0.2)';
                                    }}
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredTasks.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '48px 0'
                  }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <svg style={{ width: '32px', height: '32px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '500',
                      color: '#111827',
                      marginBottom: '8px',
                      margin: 0
                    }}>No tasks assigned</h3>
                    <p style={{
                      color: '#6b7280',
                      margin: 0
                    }}>You don't have any tasks assigned yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '32px',
              width: '100%',
              maxWidth: '100%'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%'
              }}>
                <div>
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#111827',
                    margin: 0
                  }}>Employee Directory</h1>
                  <p style={{
                    fontSize: '16px',
                    color: '#4b5563',
                    marginTop: '8px',
                    margin: 0
                  }}>
                    View only access - You can see employee information but cannot create, edit, or delete them
                  </p>
                </div>
              </div>
              
              <EmployeeList
                employees={[]} // Employees don't have access to employee data in this view
                onEmployeeSave={() => {
                  // Employees cannot save employee data
                }}
                onEmployeeDelete={() => {
                  // Employees cannot delete employee data
                }}
              />
            </div>
          )}

        </main>
      </div>

      {isTaskModalOpen && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          users={users}
          tasks={tasks}
          onClose={async () => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
            // Refresh tasks list when modal closes to show any updates
            await loadTasks();
          }}
          onSave={selectedTask ? handleTaskUpdate : handleTaskCreate}
          isDirector={isDirector}
          isProjectHead={isProjectHead}
          isEmployee={isEmployee}
          onProjectsChange={loadProjects}
        />
      )}

      {isProjectModalOpen && (
        <ProjectModal
          project={selectedProject}
          isOpen={isProjectModalOpen}
          onClose={() => {
            setIsProjectModalOpen(false);
            setSelectedProject(null);
          }}
          onSave={async (project: Project) => {
            try {
              const projectId = project.id || project._id || '';
              if (projectId) {
                // Update existing project
                await updateProject(projectId, project);
                await loadProjects();
              } else {
                // Create new project
                await handleProjectCreate(project);
              }
            } catch (error: any) {
              console.error('Error saving project:', error);
              throw error;
            }
          }}
          onDelete={selectedProject ? async (projectId: string) => {
            try {
              await deleteProject(projectId);
              await loadProjects();
              setIsProjectModalOpen(false);
              setSelectedProject(null);
            } catch (error: any) {
              console.error('Error deleting project:', error);
              throw error;
            }
          } : undefined}
          users={users}
        />
      )}

      {/* Completion Request Modal */}
      {showCompletionModal && taskToComplete && (
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
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => {
          setShowCompletionModal(false);
          setTaskToComplete(null);
        }}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '16px'
            }}>
              Request Completion Approval
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#374151',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              You are requesting approval to mark <strong>"{taskToComplete.title}"</strong> as completed. 
              The director will review your request and approve or reject it.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  setTaskToComplete(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmCompletionRequest}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
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
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
