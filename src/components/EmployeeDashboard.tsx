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
import EmployeeList from './EmployeeList';
import EmployeeProfile from './EmployeeProfile';
import { getProjects } from '../services/projectService';
import { taskApi } from '../services/api';
import { AlertTriangle } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'projects' | 'employees' | 'profile'>('overview');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'completed' | 'pending' | 'overdue'>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | 'employee' | 'completed' | 'pending'>('all');

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
  }, [user]);

  const fetchUsers = async () => {
    try {
      const usersData = await getUsersFromEmployees();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Refresh projects every 30 seconds to get latest comments
  useEffect(() => {
    if (activeTab === 'projects') {
      const interval = setInterval(() => {
        console.log('Auto-refreshing projects for latest comments...');
        loadProjects();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    // Calculate dashboard stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'Active').length;
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
  }, [tasks, projects]);

    const handleTaskUpdate = async (updatedTask: Task) => {
    try {
      const taskId = updatedTask.id || updatedTask._id;
      if (!taskId) {
        console.error('No task ID available for update:', updatedTask);
        return;
      }
      await taskApi.updateTask(taskId, updatedTask);
      await loadTasks(); // Reload tasks from database   
      setSelectedTask(null);
      setIsTaskModalOpen(false);
    } catch (error: any) {
      console.error('Error updating task:', error);
    }
  };

  // Function to mark task as completed
  const handleTaskCompleted = async (task: Task) => {
    try {
      const taskId = task.id || task._id;
      if (!taskId) {
        console.error('No task ID available for completion:', task);
        return;
      }

      // Confirm with user
      if (!window.confirm(`Are you sure you want to mark "${task.title}" as completed?`)) {
        return;
      }

      // Update task status to completed
      const updatedTask = {
        ...task,
        status: 'Completed',
        completedDate: new Date().toISOString()
      };

      // Update the task in the backend
      await taskApi.updateTask(taskId, updatedTask);
      
      // Show success notification
      setNotificationMessage('Task marked as completed successfully!');
      setShowNotification(true);
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      
      // Reload tasks to reflect the change
      await loadTasks();
      
    } catch (error: any) {
      console.error('Error marking task as completed:', error);
      alert('Error marking task as completed. Please try again.');
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
            return task.status === 'Overdue';
          default:
            return true;
        }
      });
    }

    setFilteredTasks(filtered);
  }, [tasks, user, isEmployee, taskFilter]);

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
        overflow: 'hidden',
        marginLeft: '256px',
        width: 'calc(100% - 256px)'
      }}>
        <Header user={user} />
        
        <main style={{
          flex: 1,
          overflowX: 'hidden',
          overflowY: 'auto',
          padding: '32px',
          backgroundColor: '#f8fafc',
          minHeight: '100vh'
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                width: '100%'
              }}>
                {/* Active Projects Card */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6b7280',
                      margin: 0
                    }}>Active Projects</h3>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '50%'
                    }}></div>
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#111827',
                    marginBottom: '16px'
                  }}>{stats.activeProjects}</div>
                  <button style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}>
                    View All
                  </button>
              </div>
              
                {/* Completed Tasks Card */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6b7280',
                      margin: 0
                    }}>Completed Tasks</h3>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#10b981',
                      borderRadius: '50%'
                    }}></div>
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#111827',
                    marginBottom: '16px'
                  }}>{stats.completedTasks}</div>
                  <button style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}>
                    View All
                  </button>
              </div>
              
                {/* Pending Tasks Card */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6b7280',
                      margin: 0
                    }}>Pending Tasks</h3>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#f59e0b',
                      borderRadius: '50%'
                    }}></div>
                            </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#111827',
                    marginBottom: '16px'
                  }}>{stats.inProgressTasks}</div>
                  <button style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}>
                    View All
                  </button>
                          </div>

                {/* Overdue Tasks Card */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6b7280',
                      margin: 0
                    }}>Overdue Tasks</h3>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#ef4444',
                      borderRadius: '50%'
                    }}></div>
                            </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#111827',
                    marginBottom: '16px'
                  }}>{stats.overdueTasks}</div>
                  <button style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}>
                    View All
                              </button>
                          </div>
                        </div>

              {/* Main Content Panels */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                width: '100%'
              }}>
                {/* Project Progress Panel */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0
                    }}>Project Progress</h3>
                    <button style={{
                      color: '#3b82f6',
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}>
                      Edit
                    </button>
                      </div>
                  <div style={{
                    marginBottom: '16px'
                  }}>
                    <p style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#111827',
                      margin: 0,
                      marginBottom: '12px'
                    }}>Active Project</p>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        width: '3%',
                        height: '100%',
                        backgroundColor: '#10b981',
                        borderRadius: '4px'
                      }}></div>
                  </div>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0
                    }}>3% completed</p>
                </div>
                </div>
                
                {/* Recent Tasks Panel */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0
                    }}>Recent Tasks</h3>
                    <button style={{
                      color: '#3b82f6',
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}>
                      Edit
                    </button>
                          </div>
                  {filteredTasks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filteredTasks.slice(0, 3).map((task) => (
                        <div 
                          key={task.id || task._id}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => {
                            setSelectedTask(task);
                            setIsTaskModalOpen(true);
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#111827',
                            margin: 0,
                            marginBottom: '8px'
                          }}>{task.title}</h4>
                          <p style={{
                            fontSize: '14px',
                            color: '#6b7280',
                            margin: 0,
                            marginBottom: '8px'
                          }}>{task.description || 'No description available'}</p>
                          <p style={{
                            fontSize: '14px',
                            color: '#6b7280',
                            margin: 0,
                            marginBottom: '8px'
                          }}>Assigned to: {task.assignedToName || 'Unknown'}</p>
                          <p style={{
                            fontSize: '14px',
                            color: task.status === 'Overdue' ? '#ef4444' : task.status === 'Completed' ? '#10b981' : '#6b7280',
                            margin: 0,
                            marginBottom: '12px'
                          }}>
                            Start: {task.startDate ? new Date(task.startDate).toLocaleDateString() : 'No start date'}
                          </p>
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginBottom: '12px'
                          }}>
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: task.priority === 'High' ? '#fee2e2' : task.priority === 'Medium' ? '#fef3c7' : '#f0f9ff',
                              color: task.priority === 'High' ? '#dc2626' : task.priority === 'Medium' ? '#d97706' : '#0369a1',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>{task.priority} Priority</span>
                            <span style={{
                              padding: '4px 8px',
                              backgroundColor: task.status === 'Completed' ? '#f0fdf4' : task.status === 'In Progress' ? '#fef3c7' : task.status === 'Overdue' ? '#fef2f2' : '#f3f4f6',
                              color: task.status === 'Completed' ? '#16a34a' : task.status === 'In Progress' ? '#d97706' : task.status === 'Overdue' ? '#dc2626' : '#6b7280',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>{task.status}</span>
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            fontStyle: 'italic'
                          }}>
                            Click to view details
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{
                      color: '#6b7280',
                      fontSize: '14px',
                      margin: 0
                    }}>No tasks assigned yet.</p>
                    )}
                  </div>
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
                        if (searchTerm === '') {
                          // Reset to original filtered tasks
                          const filtered = tasks.filter(task => {
                            if (isEmployee) {
                              return task.assignedToId === user?.id;
                            }
                            return true;
                          });
                          setFilteredTasks(filtered);
                        } else {
                          // Apply search filter
                          const filtered = tasks.filter(task => 
                            (task.title && task.title.toLowerCase().includes(searchTerm)) ||
                            (task.description && task.description.toLowerCase().includes(searchTerm)) ||
                            (task.projectName && task.projectName.toLowerCase().includes(searchTerm)) ||
                            (task.assignedByName && task.assignedByName.toLowerCase().includes(searchTerm))
                          );
                          setFilteredTasks(filtered);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Task Filter Tabs */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                width: 'fit-content'
              }}>
                <button
                  onClick={() => setTaskFilter('all')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: taskFilter === 'all' ? '#374151' : 'transparent',
                    color: taskFilter === 'all' ? '#ffffff' : '#6b7280',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (taskFilter !== 'all') {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (taskFilter !== 'all') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setTaskFilter('completed')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: taskFilter === 'completed' ? '#374151' : 'transparent',
                    color: taskFilter === 'completed' ? '#ffffff' : '#6b7280',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (taskFilter !== 'completed') {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (taskFilter !== 'completed') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }
                  }}
                >
                  Completed
                </button>
                <button
                  onClick={() => setTaskFilter('pending')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: taskFilter === 'pending' ? '#374151' : 'transparent',
                    color: taskFilter === 'pending' ? '#ffffff' : '#6b7280',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (taskFilter !== 'pending') {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (taskFilter !== 'pending') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }
                  }}
                >
                  Pending
                </button>
                <button
                  onClick={() => setTaskFilter('overdue')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: taskFilter === 'overdue' ? '#374151' : 'transparent',
                    color: taskFilter === 'overdue' ? '#ffffff' : '#6b7280',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (taskFilter !== 'overdue') {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (taskFilter !== 'overdue') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }
                  }}
                >
                  Overdue
                </button>
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
                      background: 'linear-gradient(to right, #f9fafb, #f3f4f6)'
                    }}>
                      <tr>
                        <th style={{
                          padding: '16px 24px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          PROJECT
                        </th>
                        <th style={{
                          padding: '16px 24px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          ASSIGNED BY
                        </th>
                        <th style={{
                          padding: '16px 24px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          STATUS
                        </th>
                        <th style={{
                          padding: '16px 24px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          PRIORITY
                        </th>
                        <th style={{
                          padding: '16px 24px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{
                      backgroundColor: '#ffffff'
                    }}>
                      {filteredTasks.map((task) => (
                        <tr key={task.id || task._id} style={{
                          borderBottom: '1px solid #e5e7eb',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }}>
                          <td style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <div style={{
                                width: '24px',
                                height: '24px',
                                background: 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%)',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '8px'
                              }}>
                                <svg style={{ width: '12px', height: '12px', color: '#7c3aed' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                              <span style={{
                                fontSize: '14px',
                                color: '#111827',
                                fontWeight: '500'
                              }}>{task.projectName || 'N/A'}</span>
                            </div>
                          </td>
                          <td style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <div style={{
                                width: '24px',
                                height: '24px',
                                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '8px'
                              }}>
                                <svg style={{ width: '12px', height: '12px', color: '#4f46e5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <span style={{
                                fontSize: '14px',
                                color: '#111827',
                                fontWeight: '500'
                              }}>{task.assignedByName || 'N/A'}</span>
                            </div>
                          </td>
                          <td style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap'
                          }}>
                            <div style={{
                              fontSize: '14px',
                              color: '#111827',
                              fontWeight: '500'
                            }}>
                              {task.estimatedHours && `Est: ${task.estimatedHours}h`}
                            </div>
                          </td>
                          <td style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap'
                          }}>
                            <span style={{
                              display: 'inline-flex',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              borderRadius: '6px',
                              backgroundColor: task.status === 'Completed' ? '#dcfce7' :
                                            task.status === 'In Progress' ? '#dbeafe' :
                                            task.status === 'Pending' ? '#fef3c7' :
                                            task.status === 'Overdue' ? '#fee2e2' :
                                            '#f3f4f6',
                              color: task.status === 'Completed' ? '#166534' :
                                     task.status === 'In Progress' ? '#1e40af' :
                                     task.status === 'Pending' ? '#92400e' :
                                     task.status === 'Overdue' ? '#991b1b' :
                                     '#374151'
                            }}>
                              {task.status || 'Unknown'}
                            </span>
                          </td>
                          <td style={{
                            padding: '16px 24px',
                            whiteSpace: 'nowrap'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span style={{
                                display: 'inline-flex',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                borderRadius: '6px',
                                backgroundColor: task.priority === 'High' ? '#fee2e2' :
                                            task.priority === 'Medium' ? '#fef3c7' :
                                            task.priority === 'Low' ? '#dcfce7' :
                                            '#f3f4f6',
                                color: task.priority === 'High' ? '#991b1b' :
                                       task.priority === 'Medium' ? '#92400e' :
                                       task.priority === 'Low' ? '#166534' :
                                       '#374151'
                              }}>
                              {task.priority || 'Medium'}
                            </span>
                              <button
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsTaskModalOpen(true);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '6px 12px',
                                  border: 'none',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  borderRadius: '6px',
                                  color: '#1d4ed8',
                                  backgroundColor: '#dbeafe',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = '#bfdbfe';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = '#dbeafe';
                                }}
                                title="View Task Details"
                              >
                                <svg style={{ width: '14px', height: '14px', marginRight: '4px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                              {task.status !== 'Completed' && (
                                <button
                                  onClick={() => handleTaskCompleted(task)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '6px 12px',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    borderRadius: '6px',
                                    color: '#15803d',
                                    backgroundColor: '#dcfce7',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#bbf7d0';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#dcfce7';
                                  }}
                                  title="Mark Task as Completed"
                                >
                                  <svg style={{ width: '14px', height: '14px', marginRight: '4px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Complete
                                </button>
                              )}
                              {task.status === 'Completed' && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '6px 12px',
                                  border: 'none',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  borderRadius: '6px',
                                  color: '#15803d',
                                  backgroundColor: '#dcfce7'
                                }}>
                                  <svg style={{ width: '14px', height: '14px', marginRight: '4px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Completed
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
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

          {activeTab === 'projects' && (
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
                  }}>My Project Assignments</h1>
                  <p style={{
                    fontSize: '16px',
                    color: '#4b5563',
                    marginTop: '8px',
                    margin: 0
                  }}>
                    View only access - You can see projects but cannot create, edit, or delete them
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <button
                    onClick={async () => {
                      try {
                        // Get all tasks for the current user's projects
                        const userProjectTasks = filteredTasks.filter(task => 
                          filteredProjects.some(project => 
                            (project.id === task.projectId || project._id === task.projectId) && 
                            task.status !== 'Completed'
                          )
                        );
                        
                        if (userProjectTasks.length === 0) {
                          alert('No incomplete tasks found in your projects.');
                          return;
                        }
                        
                        if (window.confirm(`Mark all ${userProjectTasks.length} incomplete project tasks as completed?`)) {
                          // Mark all tasks as completed
                          for (const task of userProjectTasks) {
                            await handleTaskCompleted(task);
                          }
                          setNotificationMessage('All project tasks marked as completed!');
                          setShowNotification(true);
                          
                          // Hide notification after 3 seconds
                          setTimeout(() => {
                            setShowNotification(false);
                          }, 3000);
                        }
                      } catch (error: any) {
                        console.error('Error completing project tasks:', error);
                        alert('Error completing project tasks. Please try again.');
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#047857';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }}
                    title="Mark all incomplete project tasks as completed"
                  >
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Complete All Project Tasks</span>
                  </button>
                  <button
                    onClick={loadProjects}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4b5563',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#4b5563';
                    }}
                    title="Refresh projects to see latest comments"
                  >
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
              
              {/* Project Filter Tabs */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                width: 'fit-content'
              }}>
                <button
                  onClick={() => setProjectFilter('all')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: projectFilter === 'all' ? '#374151' : 'transparent',
                    color: projectFilter === 'all' ? '#ffffff' : '#6b7280',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (projectFilter !== 'all') {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (projectFilter !== 'all') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setProjectFilter('employee')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: projectFilter === 'employee' ? '#374151' : 'transparent',
                    color: projectFilter === 'employee' ? '#ffffff' : '#6b7280',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (projectFilter !== 'employee') {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (projectFilter !== 'employee') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }
                  }}
                >
                  Employee
                </button>
                <button
                  onClick={() => setProjectFilter('completed')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: projectFilter === 'completed' ? '#374151' : 'transparent',
                    color: projectFilter === 'completed' ? '#ffffff' : '#6b7280',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (projectFilter !== 'completed') {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (projectFilter !== 'completed') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }
                  }}
                >
                  Completed
                </button>
                <button
                  onClick={() => setProjectFilter('pending')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: projectFilter === 'pending' ? '#374151' : 'transparent',
                    color: projectFilter === 'pending' ? '#ffffff' : '#6b7280',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (projectFilter !== 'pending') {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (projectFilter !== 'pending') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }
                  }}
                >
                  Pending
                </button>
              </div>
              
              <ProjectList
                projects={filteredProjects}
                users={users}
                onCommentAdded={async (projectId: string, comment: any) => {
                  try {
                    console.log('Comment added to project:', projectId, comment);
                    // Update the project in the local state to show the comment immediately
                    setProjects(prev => prev.map(p => {
                      if (p.id === projectId || p._id === projectId) {
                        return {
                          ...p,
                          comments: [...(p.comments || []), comment]
                        };
                      }
                      return p;
                    }));
                    
                    // Also reload projects from backend to ensure all users see the updated data
                    console.log('Reloading projects to sync comment with backend...');
                    await loadProjects();
                  } catch (error) {
                    console.error('Error handling comment addition:', error);
                  }
                }}
                onProjectSave={() => {
                  // Employees cannot save projects - this function won't be called due to permissions
                }}
                onProjectDelete={(projectId) => {
                  // Employees cannot delete projects - this function won't be called due to permissions
                  console.log('Employee attempted to delete project:', projectId);
                }}
              />
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

          {/* Profile Tab - Only for Employees */}
          {activeTab === 'profile' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '32px',
              width: '100%',
              maxWidth: '100%'
            }}>
              <EmployeeProfile />
            </div>
          )}
        </main>
      </div>

      {isTaskModalOpen && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          users={users}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
          }}
          onSave={selectedTask ? handleTaskUpdate : handleTaskUpdate}
          isDirector={isDirector}
          isProjectHead={isProjectHead}
          isEmployee={isEmployee}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
