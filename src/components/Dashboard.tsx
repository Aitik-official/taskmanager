'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Project, Task, DashboardStats, User, Employee } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import StatsCards from './StatsCards';
import TaskList from './TaskList';
import ProjectOverview from './ProjectOverview';
import ProjectList from './ProjectList';
import TaskModal from './TaskModal';
import EmployeeList from './EmployeeList';
import EmployeeProfile from './EmployeeProfile';
import DirectorProfile from './DirectorProfile';
import { getProjects, createProject, updateProject, deleteProject } from '../services/projectService';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../services/employeeService';
import { taskApi } from '../services/api';
import { Download, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
// Helper function to download files without external dependencies
const downloadFile = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

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

const Dashboard: React.FC = () => {
  const { user, isDirector, isProjectHead, isEmployee } = useAuth();
  

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
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
  const [taskFilter, setTaskFilter] = useState<'all' | 'completed' | 'pending' | 'overdue'>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | 'employee' | 'completed' | 'pending'>('all');

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
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
      

      
      setTasks(fetchedTasks);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      // Fallback to empty array if API fails
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user, isEmployee, isProjectHead]);

  const loadProjects = useCallback(async () => {
    try {
      console.log('🔄 Loading projects...');
      const fetchedProjects = await getProjects();
      console.log('📥 Fetched projects from API:', fetchedProjects);
      
      // Transform the projects to match the expected type
      const transformedProjects = fetchedProjects.map(project => ({
        ...project,
        id: project.id || project._id || ''
      }));
      
      console.log('🔄 Transformed projects:', transformedProjects);
      
      // Check if projects have comments
      const projectsWithComments = transformedProjects.filter(p => p.comments && p.comments.length > 0);
      if (projectsWithComments.length > 0) {
        console.log('💬 Projects with comments found:', projectsWithComments.map(p => ({
          name: p.name,
          commentCount: p.comments?.length || 0
        })));
      }
      
      setProjects(transformedProjects);
    } catch (error: any) {
      console.error('❌ Error loading projects:', error);
      // Fallback to empty array if API fails
      setProjects([]);
    }
  }, []);

    const loadEmployees = useCallback(async () => {
    try {
      console.log('🔄 Loading employees from database...');
      const fetchedEmployees = await getEmployees();
      console.log('📥 Fetched employees from API:', fetchedEmployees);
      console.log('📊 Number of employees fetched:', fetchedEmployees.length);

      // Transform the employees to match the expected type
      const transformedEmployees = fetchedEmployees.map(employee => ({
        ...employee,
        id: employee.id || employee._id || ''
      }));

      console.log('🔄 Transformed employees:', transformedEmployees);
      console.log('📊 Number of transformed employees:', transformedEmployees.length);

      setEmployees(transformedEmployees);
      console.log('✅ Employees state updated successfully');

      // Log employee details for debugging
      if (transformedEmployees.length > 0) {
        console.log('👥 Employee details:');
        transformedEmployees.forEach((emp, index) => {
          console.log(`  ${index + 1}. ${emp.firstName} ${emp.lastName} (${emp.role}) - ${emp.department}`);
        });
      } else {
        console.log('⚠️ No employees found in database');
      }
    } catch (error: any) {
      console.error('❌ Error loading employees:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Fallback to empty array if API fails
      setEmployees([]);
    }
  }, []);

  const handleEmployeeAssignments = async (employeeId: string, assignmentData: any) => {
    try {
      console.log('🔄 Processing employee assignments...');
      console.log('👤 Employee ID:', employeeId);
      console.log('📋 Assignment data:', assignmentData);

      const { assignedProjects, assignedTasks } = assignmentData;

      // Handle project assignments
      if (assignedProjects && assignedProjects.length > 0) {
        console.log('📁 Assigning employee to projects:', assignedProjects);
        for (const projectId of assignedProjects) {
          try {
            // Update project to assign employee
            const projectToUpdate = projects.find(p => p.id === projectId || p._id === projectId);
            if (projectToUpdate) {
              const updatedProject = {
                ...projectToUpdate,
                assignedEmployeeId: employeeId,
                assignedEmployeeName: employees.find(e => e.id === employeeId)?.firstName + ' ' + 
                                   employees.find(e => e.id === employeeId)?.lastName || 'Unknown Employee'
              };
              
              await updateProject(projectId, updatedProject);
              console.log('✅ Project assigned successfully:', projectId);
            }
          } catch (error: any) {
            console.error('❌ Error assigning project:', projectId, error);
          }
        }
      }

      // Handle task assignments
      if (assignedTasks && assignedTasks.length > 0) {
        console.log('✅ Assigning employee to tasks:', assignedTasks);
        for (const taskId of assignedTasks) {
          try {
            // Update task to assign employee
            const taskToUpdate = tasks.find(t => t.id === taskId || t._id === taskId);
            if (taskToUpdate) {
              const updatedTask = {
                ...taskToUpdate,
                assignedTo: employeeId,
                assignedToName: employees.find(e => e.id === employeeId)?.firstName + ' ' + 
                              employees.find(e => e.id === employeeId)?.lastName || 'Unknown Employee'
              };
              
              // Use the task API to update the task
              await taskApi.updateTask(taskId, updatedTask);
              console.log('✅ Task assigned successfully:', taskId);
            }
          } catch (error: any) {
            console.error('❌ Error assigning task:', taskId, error);
          }
        }
      }

      console.log('✅ Employee assignments completed successfully');
      
      // Reload projects and tasks to reflect changes
      await loadProjects();
      await loadTasks();
      
    } catch (error: any) {
      console.error('❌ Error processing employee assignments:', error);
      throw error;
    }
  };

  // Backup/Export functionality
  const handleBackupData = async () => {
    // Get backup button reference
    const backupButton = document.querySelector('[data-backup-button]') as HTMLButtonElement;
    
    try {
      console.log('🔄 Starting data backup...');
      
      // Show loading state
      if (backupButton) {
        backupButton.disabled = true;
        backupButton.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Refreshing Data...';
      }
      
      // Refresh all data from database before creating backup
      console.log('🔄 Refreshing data from database...');
      await Promise.all([
        loadEmployees(),
        loadProjects(),
        loadTasks()
      ]);
      
      console.log('✅ Data refreshed from database');
      console.log(`📊 Backup data summary: ${employees.length} employees, ${projects.length} projects, ${tasks.length} tasks`);
      
      // Create metadata for backup summary
      const metadata = [
        { 'Backup Information': 'Project Management System Data Export' },
        { 'Generated On': new Date().toLocaleString() },
        { 'Generated By': user?.name || 'System' },
        { 'Total Employees': employees.length },
        { 'Total Projects': projects.length },
        { 'Total Tasks': tasks.length },
        { 'Active Projects': projects.filter(p => p.status === 'Active').length },
        { 'Completed Tasks': tasks.filter(t => t.status === 'Completed').length },
        { 'Pending Tasks': tasks.filter(t => t.status === 'Pending').length },
        { 'In Progress Tasks': tasks.filter(t => t.status === 'In Progress').length },
        { 'Overdue Tasks': tasks.filter(t => t.status === 'Overdue').length }
      ];
      
      // Prepare comprehensive data for export
      const exportData = {
        employees: employees.map(emp => ({
          'Employee ID': emp.id || emp._id,
          'First Name': emp.firstName,
          'Last Name': emp.lastName,
          'Full Name': `${emp.firstName} ${emp.lastName}`,
          'Email': emp.email,
          'Phone': emp.phone,
          'Position': emp.position,
          'Department': emp.department,
          'Joining Date': emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A',
          'Status': emp.status,
          'Username': emp.username,
          'Role': emp.role,
          'Created At': emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A',
          'Updated At': emp.updatedAt ? new Date(emp.updatedAt).toLocaleDateString() : 'N/A',
          'Assigned Projects Count': projects.filter(p => p.assignedEmployeeId === (emp.id || emp._id)).length,
          'Assigned Tasks Count': tasks.filter(t => t.assignedToId === (emp.id || emp._id)).length,
          'Completed Tasks Count': tasks.filter(t => t.assignedToId === (emp.id || emp._id) && t.status === 'Completed').length,
          'Active Tasks Count': tasks.filter(t => t.assignedToId === (emp.id || emp._id) && t.status === 'In Progress').length
        })),
        projects: projects.map(proj => ({
          'Project ID': proj.id || proj._id,
          'Name': proj.name,
          'Description': proj.description,
          'Assigned Employee ID': proj.assignedEmployeeId || 'N/A',
          'Assigned Employee Name': proj.assignedEmployeeName || 'N/A',
          'Status': proj.status,
          'Start Date': proj.startDate ? new Date(proj.startDate).toLocaleDateString() : 'N/A',
          'Progress': `${proj.progress || 0}%`,
          'Progress Value': proj.progress || 0,
          'Comments Count': proj.comments ? proj.comments.length : 0,
          'Created At': proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : 'N/A',
          'Updated At': proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : 'N/A',
          'Assigned Tasks Count': tasks.filter(t => t.projectId === (proj.id || proj._id)).length,
          'Completed Tasks Count': tasks.filter(t => t.projectId === (proj.id || proj._id) && t.status === 'Completed').length,
          'Pending Tasks Count': tasks.filter(t => t.projectId === (proj.id || proj._id) && t.status === 'Pending').length,
          'In Progress Tasks Count': tasks.filter(t => t.projectId === (proj.id || proj._id) && t.status === 'In Progress').length,
          'Overdue Tasks Count': tasks.filter(t => t.projectId === (proj.id || proj._id) && t.status === 'Overdue').length,
          'Total Estimated Hours': tasks.filter(t => t.projectId === (proj.id || proj._id)).reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
          'Total Actual Hours': tasks.filter(t => t.projectId === (proj.id || proj._id)).reduce((sum, t) => sum + (t.actualHours || 0), 0)
        })),
        tasks: tasks.map(task => ({
          'Task ID': task.id || task._id,
          'Title': task.title,
          'Description': task.description,
          'Project ID': task.projectId || 'N/A',
          'Project Name': task.projectName || 'N/A',
          'Assigned To ID': task.assignedToId || 'N/A',
          'Assigned To Name': task.assignedToName || 'N/A',
          'Assigned By ID': task.assignedById || 'N/A',
          'Assigned By Name': task.assignedByName || 'N/A',
          'Priority': task.priority || 'Medium',
          'Status': task.status || 'Pending',
          'Estimated Hours': task.estimatedHours || 0,
          'Actual Hours': task.actualHours || 0,
          'Start Date': task.startDate ? new Date(task.startDate).toLocaleDateString() : 'N/A',
          'Completed Date': task.completedDate ? new Date(task.completedDate).toLocaleDateString() : 'N/A',
          'Is Locked': task.isLocked ? 'Yes' : 'No',
          'Comments Count': task.comments ? task.comments.length : 0,
          'Rating': task.rating || 'N/A',
          'Rating Comment': task.ratingComment || 'N/A',
          'Extension Request Status': task.extensionRequestStatus || 'N/A',
          'New Deadline Proposal': task.newDeadlineProposal ? new Date(task.newDeadlineProposal).toLocaleDateString() : 'N/A',
          'Reason For Extension': task.reasonForExtension || 'N/A',
          'Extension Request Date': task.extensionRequestDate ? new Date(task.extensionRequestDate).toLocaleDateString() : 'N/A',
          'Extension Response Date': task.extensionResponseDate ? new Date(task.extensionResponseDate).toLocaleDateString() : 'N/A',
          'Extension Response By': task.extensionResponseBy || 'N/A',
          'Extension Response Comment': task.extensionResponseComment || 'N/A',
          'Days Since Start': task.startDate ? Math.ceil((new Date().getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 'N/A',
          'Days Since Completion': task.completedDate ? Math.ceil((new Date().getTime() - new Date(task.completedDate).getTime()) / (1000 * 60 * 60 * 24)) : 'N/A'
        })),
        // Detailed comments for tasks
        taskComments: tasks.flatMap(task => 
          (task.comments || []).map(comment => ({
            'Task ID': task.id || task._id,
            'Task Title': task.title,
            'Project Name': task.projectName,
            'Comment ID': comment.id || comment._id,
            'User ID': comment.userId,
            'User Name': comment.userName,
            'Comment Content': comment.content,
            'Timestamp': comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'N/A',
            'Visible To Employee': comment.isVisibleToEmployee ? 'Yes' : 'No'
          }))
        ),
        // Detailed comments for projects
        projectComments: projects.flatMap(project => 
          (project.comments || []).map(comment => ({
            'Project ID': project.id || project._id,
            'Project Name': project.name,
            'Comment ID': comment.id,
            'User ID': comment.userId,
            'User Name': comment.userName,
            'User Role': comment.userRole,
            'Comment Content': comment.content,
            'Timestamp': comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'N/A',
            'Visible To Employee': comment.isVisibleToEmployee ? 'Yes' : 'No'
          }))
        )
      };

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Add sheets for each data type
      const metadataSheet = XLSX.utils.json_to_sheet(metadata);
      const employeesSheet = XLSX.utils.json_to_sheet(exportData.employees);
      const projectsSheet = XLSX.utils.json_to_sheet(exportData.projects);
      const tasksSheet = XLSX.utils.json_to_sheet(exportData.tasks);
      const taskCommentsSheet = XLSX.utils.json_to_sheet(exportData.taskComments);
      const projectCommentsSheet = XLSX.utils.json_to_sheet(exportData.projectComments);

      // Set column widths for better readability
      const setColumnWidths = (sheet: XLSX.WorkSheet, widths: number[]) => {
        sheet['!cols'] = widths.map(width => ({ width }));
      };

      setColumnWidths(metadataSheet, [30, 30]);
      setColumnWidths(employeesSheet, [15, 15, 15, 25, 25, 15, 15, 15, 15, 10, 15, 10, 15, 15, 15, 15, 15]);
      setColumnWidths(projectsSheet, [15, 25, 30, 20, 20, 10, 15, 15, 10, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
      setColumnWidths(tasksSheet, [15, 25, 30, 15, 20, 20, 20, 20, 10, 10, 15, 15, 15, 15, 15, 10, 15, 10, 20, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
      setColumnWidths(taskCommentsSheet, [15, 25, 20, 15, 15, 20, 40, 20, 15]);
      setColumnWidths(projectCommentsSheet, [15, 25, 15, 15, 20, 15, 40, 20, 15]);

      // Add sheets to workbook
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Backup Summary');
      XLSX.utils.book_append_sheet(workbook, employeesSheet, 'Employees');
      XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projects');
      XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');
      XLSX.utils.book_append_sheet(workbook, taskCommentsSheet, 'Task Comments');
      XLSX.utils.book_append_sheet(workbook, projectCommentsSheet, 'Project Comments');

      // Generate filename with timestamp and data summary
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const dataSummary = `${employees.length}E_${projects.length}P_${tasks.length}T`;
      const filename = `Project_Management_Backup_${dataSummary}_${timestamp}.xlsx`;

      // Save the file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      downloadFile(data, filename);

      console.log('✅ Data backup completed successfully:', filename);
      
      // Show detailed success message
      const totalComments = (exportData.taskComments?.length || 0) + (exportData.projectComments?.length || 0);
      const successMessage = `✅ Backup completed successfully!\n\n📊 Data Summary:\n• ${employees.length} Employees\n• ${projects.length} Projects\n• ${tasks.length} Tasks\n• ${totalComments} Total Comments\n\n📋 Excel Sheets:\n• Backup Summary\n• Employees\n• Projects\n• Tasks\n• Task Comments\n• Project Comments\n\n📁 File saved as: ${filename}`;
      alert(successMessage);
      
      // Reset button state
      if (backupButton) {
        backupButton.disabled = false;
        backupButton.innerHTML = '<Database className="h-5 w-5 mr-2" />Backup Data';
      }
      
    } catch (error: any) {
      console.error('❌ Error during data backup:', error);
      
      // Show detailed error message
      const errorMessage = `❌ Error creating backup!\n\n🔍 Details: ${error.message || 'Unknown error occurred'}\n\n💡 Please check:\n• Database connection\n• Data availability\n• Try again later`;
      alert(errorMessage);
      
      // Reset button state
      if (backupButton) {
        backupButton.disabled = false;
        backupButton.innerHTML = '<Database className="h-5 w-5 mr-2" />Backup Data';
      }
    }
  };

  useEffect(() => {
    // Load projects, tasks, and employees
    loadProjects();
    loadTasks();
    loadEmployees();
  }, [user]);

  // Debug logging for employees
  useEffect(() => {
    console.log('🔄 Dashboard: Employees state updated:', {
      totalEmployees: employees.length,
      employeeDetails: employees.map(emp => ({
        id: emp.id || emp._id,
        name: `${emp.firstName} ${emp.lastName}`,
        role: emp.role,
        department: emp.department
      }))
    });
  }, [employees]);

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
    const activeEmployees = employees.filter(e => e.status === 'Active').length;

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
  }, [tasks, projects, employees]);

  const handleTaskUpdate = async (updatedTask: Task) => {
    console.log('handleTaskUpdate called with:', updatedTask);
    console.log('Task comments:', updatedTask.comments);
    
    try {
      // If this is a comment update, we don't need to call updateTask
      // since the comment was already added via the comment API
      if (updatedTask.comments && updatedTask.comments.length > 0) {
        console.log('Detected comment update, reloading tasks...');
        // Just reload tasks to get the latest data including comments
        await loadTasks();
      } else {
        console.log('Regular task update, calling updateTask API...');
        // For other task updates, call the update API
        const taskId = updatedTask.id || updatedTask._id;
        if (!taskId) {
          console.error('No task ID available for update:', updatedTask);
          return;
        }
        await taskApi.updateTask(taskId, updatedTask);
        await loadTasks();
      }
      
    setSelectedTask(null);
    setIsTaskModalOpen(false);
    } catch (error: any) {
      console.error('Error updating task:', error);
    }
  };

  const handleTaskCreate = async (newTask: Task) => {
    try {
      // Add current user info for new tasks
      const taskWithUserInfo = {
        ...newTask,
        assignedById: user?.id || '1',
        assignedByName: user?.name || 'Admin',
        extensionRequestStatus: 'Pending', // Ensure this field is set
        createdAt: new Date().toISOString()
      };
      
      // Remove id and _id for new tasks to let MongoDB auto-generate them
      delete taskWithUserInfo.id;
      delete taskWithUserInfo._id;
      
      console.log('Creating task with data:', JSON.stringify(taskWithUserInfo, null, 2));
      
      await taskApi.createTask(taskWithUserInfo);
      await loadTasks(); // Reload tasks from database
    setIsTaskModalOpen(false);
    } catch (error: any) {
      console.error('Error creating task:', error);
      alert(`Error creating task: ${error.response?.data?.message || error.message}`);
    }
  };

  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  // Update filtered tasks when tasks, user, or filter changes
  useEffect(() => {
    if (!tasks.length) {
      setFilteredTasks([]);
      return;
    }

    let filtered: Task[] = [];

    if (isEmployee) {
      // For employees, show only their assigned tasks
      filtered = tasks.filter(task => task.assignedToId === user?.id);
    } else if (isProjectHead) {
      // For project heads, show tasks from their projects
      const userProjects = projects.filter(project => project.assignedEmployeeId === user?.id);
      const projectIds = userProjects.map(project => project.id);
      filtered = tasks.filter(task => projectIds.includes(task.projectId));
    } else if (isDirector) {
      // For directors, show all tasks
      filtered = tasks;
    }

    // Apply status filter
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
  }, [tasks, user, isEmployee, isProjectHead, isDirector, projects, taskFilter]);

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

  // Debug logging for projects
  console.log('Projects state:', projects);
  console.log('Filtered projects:', filteredProjects);
  console.log('User role:', user?.role);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        background: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(to bottom right, #3b82f6, #9333ea)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '50%'
            }}></div>
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>Loading Dashboard</div>
          <div style={{
            color: '#6b7280',
            marginBottom: '16px'
          }}>Please wait while we fetch your data...</div>
          <div style={{
            marginTop: '16px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'bounce 1s infinite'
            }}></div>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#9333ea',
              borderRadius: '50%',
              animation: 'bounce 1s infinite',
              animationDelay: '0.1s'
            }}></div>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'bounce 1s infinite',
              animationDelay: '0.2s'
            }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isEmployee={isEmployee} />
      
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        marginLeft: '256px'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
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
            }}>
              Dashboard
                </h1>
                  </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '14px',
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
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              Share
            </button>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '14px',
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
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '14px',
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
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              This week
            </button>
                {isDirector && (
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                New Task
                  </button>
                )}
              </div>
              </div>
              
        <main style={{
          flex: 1,
          overflowX: 'hidden',
          overflowY: 'auto',
          padding: '24px',
          backgroundColor: '#ffffff'
        }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Key Metrics Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {/* Active Projects Card */}
                <div style={{
                  backgroundColor: '#3b82f6',
                  borderRadius: '8px',
                  padding: '20px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    width: '60px',
                    height: '60px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    margin: '0 0 8px 0',
                    opacity: 0.9
                  }}>
                    Active Projects
                  </h3>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: '0 0 12px 0'
                  }}>
                    {stats.activeProjects}
                  </div>
                  <button 
                    onClick={() => {
                      setActiveTab('projects');
                      setProjectFilter('all');
                    }}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}>
                    View All
                  </button>
                </div>

                {/* Completed Tasks Card */}
                <div style={{
                  backgroundColor: '#10b981',
                  borderRadius: '8px',
                  padding: '20px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    width: '60px',
                    height: '60px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    margin: '0 0 8px 0',
                    opacity: 0.9
                  }}>
                    Completed Tasks
                  </h3>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: '0 0 12px 0'
                  }}>
                    {stats.completedTasks}
                    </div>
                  <button 
                    onClick={() => {
                      setActiveTab('projects');
                      setProjectFilter('completed');
                    }}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}>
                    View All
                  </button>
                  </div>

                {/* Pending Tasks Card */}
                <div style={{
                  backgroundColor: '#f59e0b',
                  borderRadius: '8px',
                  padding: '20px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    width: '60px',
                    height: '60px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    margin: '0 0 8px 0',
                    opacity: 0.9
                  }}>
                    Pending Tasks
                  </h3>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: '0 0 12px 0'
                  }}>
                    {stats.pendingTasks}
                  </div>
                  <button 
                    onClick={() => {
                      setActiveTab('tasks');
                      setTaskFilter('pending');
                    }}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}>
                    View All
                  </button>
                </div>
                
                {/* Overdue Tasks Card */}
                <div style={{
                  backgroundColor: '#ef4444',
                  borderRadius: '8px',
                  padding: '20px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    width: '60px',
                    height: '60px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    margin: '0 0 8px 0',
                    opacity: 0.9
                  }}>
                    Overdue Tasks
                  </h3>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: '0 0 12px 0'
                  }}>
                    {stats.overdueTasks}
                    </div>
                  <button 
                    onClick={() => {
                      setActiveTab('tasks');
                      setTaskFilter('overdue');
                    }}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}>
                    View All
                  </button>
                  </div>

                {/* Active Employees Card */}
                <div style={{
                  backgroundColor: '#06b6d4',
                  borderRadius: '8px',
                  padding: '20px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    width: '60px',
                    height: '60px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                  }} />
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    margin: '0 0 8px 0',
                    opacity: 0.9
                  }}>
                    Active Employees
                  </h3>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    margin: '0 0 12px 0'
                  }}>
                    {stats.activeEmployees}
                  </div>
                  <button 
                    onClick={() => {
                      setActiveTab('employees');
                    }}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}>
                    View All
                  </button>
                </div>
              </div>
              
              {/* Bottom Sections */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px'
              }}>
                {/* Project Progress Section */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0
                    }}>
                      Project Progress
                    </h3>
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
                    color: '#111827',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '12px'
                  }}>
                    Active Project
                  </div>
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
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    3% completed
                  </div>
                </div>

                {/* Recent Tasks Section */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0
                    }}>
                      Recent Tasks
                    </h3>
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
                  
                  {/* Task Items */}
                  {filteredTasks.slice(0, 3).map((task) => (
                    <div 
                      key={task.id || task._id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '16px',
                        marginBottom: '12px',
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
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '8px'
                      }}>
                        {task.title}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '8px'
                      }}>
                        {task.description || 'No description available'}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '12px'
                      }}>
                        Assigned to: {task.assignedToName || 'Unknown'}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: task.status === 'Overdue' ? '#ef4444' : task.status === 'Completed' ? '#10b981' : '#6b7280',
                        fontWeight: '500',
                        marginBottom: '12px'
                      }}>
                        Start: {task.startDate ? new Date(task.startDate).toLocaleDateString() : 'No start date'}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        <span style={{
                          backgroundColor: task.priority === 'High' ? '#fef2f2' : task.priority === 'Medium' ? '#fef3c7' : '#f0f9ff',
                          color: task.priority === 'High' ? '#dc2626' : task.priority === 'Medium' ? '#d97706' : '#0369a1',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {task.priority} Priority
                        </span>
                        <span style={{
                          backgroundColor: task.status === 'Completed' ? '#f0fdf4' : task.status === 'In Progress' ? '#fef3c7' : task.status === 'Overdue' ? '#fef2f2' : '#f3f4f6',
                          color: task.status === 'Completed' ? '#16a34a' : task.status === 'In Progress' ? '#d97706' : task.status === 'Overdue' ? '#dc2626' : '#6b7280',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {task.status}
                        </span>
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
                  
                  {filteredTasks.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: '#6b7280',
                      fontSize: '14px'
                    }}>
                      No recent tasks available
                    </div>
                  )}
                </div>
                
                {/* Extension Requests Section for Directors/Project Heads */}
                {(isDirector || isProjectHead) && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 35px 60px -12px rgba(0, 0, 0, 0.35)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px'
                    }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#ffffff',
                        margin: 0
                      }}>
                        Pending Extension Requests
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {tasks
                        .filter(task => task.newDeadlineProposal && task.extensionRequestStatus === 'Pending')
                        .slice(0, 3)
                        .map(task => (
                          <div key={task.id} style={{
                            border: '1px solid #fed7aa',
                            borderRadius: '8px',
                            padding: '12px',
                            background: 'linear-gradient(to right, #fed7aa, #fecaca)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(to right, #fdba74, #fca5a5)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(to right, #fed7aa, #fecaca)';
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '8px'
                            }}>
                              <h4 style={{
                                fontWeight: '500',
                                color: '#9a3412',
                                margin: 0
                              }}>{task.title}</h4>
                              <span style={{
                                fontSize: '12px',
                                color: '#9a3412',
                                backgroundColor: '#fed7aa',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontWeight: '500'
                              }}>
                                Extension Requested
                              </span>
                            </div>
                            <p style={{
                              fontSize: '14px',
                              color: '#9a3412',
                              marginBottom: '8px',
                              margin: 0
                            }}>
                              <strong>Employee:</strong> {task.assignedToName}
                            </p>
                            <p style={{
                              fontSize: '14px',
                              color: '#9a3412',
                              marginBottom: '8px',
                              margin: 0
                            }}>
                              <strong>Proposed Deadline:</strong> {new Date(task.newDeadlineProposal!).toLocaleDateString()}
                            </p>
                            <p style={{
                              fontSize: '14px',
                              color: '#9a3412',
                              margin: 0
                            }}>
                              <strong>Reason:</strong> {task.reasonForExtension}
                            </p>
                          </div>
                        ))}
                      {tasks.filter(task => task.newDeadlineProposal && task.extensionRequestStatus === 'Pending').length === 0 && (
                        <div style={{
                          textAlign: 'center',
                          padding: '16px 0'
                        }}>
                          <p style={{
                            color: '#10b981',
                            fontWeight: '500',
                            margin: 0,
                            marginBottom: '4px'
                          }}>All caught up!</p>
                          <p style={{
                            color: '#059669',
                            fontSize: '14px',
                            margin: 0
                          }}>No pending extension requests</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h1 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#111827',
                  margin: 0
                }}>
                  Tasks
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    color: '#374151',
                    fontSize: '14px',
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
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
                  </button>
                {isDirector && (
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        backgroundColor: '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
                      }}
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      New Task
                  </button>
                )}
                  </div>
                  </div>
              
              {/* Filter Tabs */}
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
              
              {/* Tasks Table */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
              }}>
                {filteredTasks.length === 0 ? (
                  /* Empty state */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                    color: '#6b7280'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto'
                      }}>
                        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        No tasks yet
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginBottom: '16px'
                      }}>
                        Create your first task to get started
                      </p>
                {isDirector && (
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#2563eb';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#3b82f6';
                          }}
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                          Create Task
                  </button>
                )}
                </div>
              </div>
                ) : (
                  /* Tasks Table */
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f9fafb' }}>
                        <tr>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                          Task Details
                        </th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                          Project
                        </th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                          Assigned To
                        </th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                          Status
                        </th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                          Priority
                        </th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                      <tbody>
                      {filteredTasks.map((task) => (
                          <tr key={task.id || task._id} style={{
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}>
                            <td style={{ padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  backgroundColor: '#dbeafe',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <svg width="20" height="20" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#111827',
                                    margin: '0 0 4px 0',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {task.title}
                                  </p>
                                  <p style={{
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    margin: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '200px'
                                  }}>
                                    {task.description}
                                  </p>
                                {task.comments && task.comments.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                                      <svg width="12" height="12" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                      <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '4px' }}>
                                        {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
                                      </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                            <td style={{ padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  backgroundColor: '#f3e8ff',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <svg width="16" height="16" fill="none" stroke="#8b5cf6" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                                <span style={{ fontSize: '14px', color: '#111827' }}>
                                  {task.projectName || 'N/A'}
                                </span>
                            </div>
                          </td>
                            <td style={{ padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  backgroundColor: '#dcfce7',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <svg width="16" height="16" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                                <span style={{ fontSize: '14px', color: '#111827' }}>
                                  {task.assignedToName || 'Unassigned'}
                                </span>
                            </div>
                          </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 12px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                fontWeight: '600',
                                backgroundColor: task.status === 'Completed' ? '#dcfce7' :
                                                task.status === 'In Progress' ? '#dbeafe' :
                                                task.status === 'Pending' ? '#fef3c7' :
                                                '#fecaca',
                                color: task.status === 'Completed' ? '#166534' :
                                       task.status === 'In Progress' ? '#1e40af' :
                                       task.status === 'Pending' ? '#92400e' :
                                       '#dc2626'
                              }}>
                              {task.status || 'Unknown'}
                            </span>
                          </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 12px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                fontWeight: '600',
                                backgroundColor: task.priority === 'High' || task.priority === 'Critical' ? '#fecaca' :
                                                task.priority === 'Medium' ? '#fef3c7' :
                                                '#dcfce7',
                                color: task.priority === 'High' || task.priority === 'Critical' ? '#dc2626' :
                                       task.priority === 'Medium' ? '#92400e' :
                                       '#166534'
                              }}>
                              {task.priority || 'Medium'}
                            </span>
                          </td>
                            <td style={{ padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsTaskModalOpen(true);
                                }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 12px',
                                    backgroundColor: '#dbeafe',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#1e40af',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#bfdbfe';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#dbeafe';
                                  }}
                                >
                                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                                {isDirector && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
                                    try {
                                      const taskId = task.id || task._id;
                                      if (taskId) {
                                        await taskApi.deleteTask(taskId);
                                        await loadTasks();
                                      }
                                    } catch (error: any) {
                                      console.error('Error deleting task:', error);
                                      alert('Error deleting task. Please try again.');
                                    }
                                  }
                                }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '6px 12px',
                                      backgroundColor: '#fecaca',
                                      border: 'none',
                                      borderRadius: '6px',
                                      color: '#dc2626',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = '#fca5a5';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = '#fecaca';
                                    }}
                                  >
                                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#ffffff' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h1 style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#111827',
                      margin: 0
                    }}>
                      Project Management
                    </h1>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginTop: '4px',
                      margin: 0
                    }}>
                      {isDirector ? 'Full access - Create, Edit, Delete projects' : 
                       isProjectHead ? 'View only - No editing permissions' : 
                       'View only - Limited access'}
                    </p>
                      </div>
                      </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    data-backup-button
                    onClick={handleBackupData}
                    style={{
                      background: 'linear-gradient(to right, #d97706, #ea580c)',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #b45309, #c2410c)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #d97706, #ea580c)';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                    }}
                    title="Download all data as Excel backup"
                  >
                    <Download size={16} />
                    <span>Backup</span>
                  </button>
                  <button
                    onClick={loadProjects}
                    style={{
                      background: 'linear-gradient(to right, #9333ea, #7c3aed)',
                      color: '#ffffff',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #7c2d12, #6d28d9)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #9333ea, #7c3aed)';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                    }}
                    title="Refresh projects to see latest comments"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                users={employees}
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
                onProjectSave={async (project) => {
                  try {
                    console.log('Saving project:', project);
                    if (project.id) {
                      // Update existing project
                      console.log('Updating existing project...');
                      const updatedProject = await updateProject(project.id, project);
                      const transformedProject = {
                        ...updatedProject,
                        id: updatedProject.id || updatedProject._id || ''
                      };
                      setProjects(prev => prev.map(p => p.id === project.id ? transformedProject : p));
                      console.log('Project updated successfully:', transformedProject);
                    } else {
                      // Create new project
                      console.log('Creating new project...');
                      const newProject = await createProject(project);
                      const transformedProject = {
                        ...newProject,
                        id: newProject.id || newProject._id || ''
                      };
                      setProjects(prev => [transformedProject, ...prev]);
                      console.log('Project created successfully:', transformedProject);
                      console.log('Updated projects state:', [transformedProject, ...projects]);
                    }
                      } catch (error: any) {
      console.error('Error saving project:', error);
      // Reload projects to ensure consistency
      loadProjects();
    }
                }}
                onProjectDelete={async (projectId) => {
                  try {
                    if (projectId) {
                      await deleteProject(projectId);
                      setProjects(prev => prev.filter(p => p.id !== projectId));
                    }
                      } catch (error: any) {
      console.error('Error deleting project:', error);
      // Reload projects to ensure consistency
      loadProjects();
    }
                }}
              />
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                  }}>
                    <svg style={{ width: '20px', height: '20px', color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h1 style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#111827',
                      margin: 0
                    }}>
                      Employee Management
                    </h1>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      Create, manage, and assign employees to projects and tasks
                    </p>
                  </div>
                </div>
                {isDirector && (
                  <button
                    data-backup-button
                    onClick={handleBackupData}
                    style={{
                      background: 'linear-gradient(to right, #d97706, #ea580c)',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #b45309, #c2410c)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #d97706, #ea580c)';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                    }}
                    title="Download all data as Excel backup"
                  >
                    <Download size={16} />
                    <span>Backup</span>
                  </button>
                )}
              </div>
              <EmployeeList
                employees={employees}
                projects={projects}
                tasks={tasks}
                onEmployeeSave={async (employee: any, assignmentData?: any) => {
                  try {
                    console.log('🔄 Starting employee save process...');
                    console.log('📤 Employee data to save:', employee);
                    console.log('📋 Assignment data:', assignmentData);
                    
                    if (employee.id) {
                      // Update existing employee
                      console.log('🔄 Updating existing employee with ID:', employee.id);
                      const updatedEmployee = await updateEmployee(employee.id, employee);
                      console.log('✅ Employee updated successfully:', updatedEmployee);
                    } else {
                      // Create new employee
                      console.log('🆕 Creating new employee...');
                      const newEmployee = await createEmployee(employee);
                      console.log('✅ Employee created successfully:', newEmployee);
                      
                      // Handle assignments if provided
                      if (assignmentData && newEmployee.id) {
                        console.log('🔄 Processing assignments for new employee...');
                        console.log('📋 Assignment data received:', assignmentData);
                        console.log('👤 New employee ID:', newEmployee.id);
                        await handleEmployeeAssignments(newEmployee.id, assignmentData);
                      } else {
                        console.log('⚠️ No assignment data or employee ID:', {
                          hasAssignmentData: !!assignmentData,
                          employeeId: newEmployee.id,
                          assignmentData
                        });
                      }
                    }
                    
                    console.log('🔄 Reloading employees from database...');
                    await loadEmployees();
                    console.log('✅ Employees reloaded successfully');
                  } catch (error: any) {
                    console.error('❌ Error saving employee:', error);
                    throw error; // Re-throw to let the modal handle the error
                  }
                }}
                onEmployeeDelete={async (employeeId) => {
                  try {
                    await deleteEmployee(employeeId);
                    await loadEmployees();
                    console.log('✅ Employee deleted successfully');
                  } catch (error: any) {
                    console.error('Error deleting employee:', error);
                    window.alert('Error deleting employee. Please try again.');
                  }
                }}
              />
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '32px',
              width: '100%',
              maxWidth: '100%'
            }}>
              {isEmployee ? (
                <EmployeeProfile />
              ) : (
                <DirectorProfile />
              )}
            </div>
          )}
        </main>
      </div>

      {isTaskModalOpen && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          users={employees}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
          }}
          onSave={selectedTask ? handleTaskUpdate : handleTaskCreate}
          isDirector={isDirector}
          isProjectHead={isProjectHead}
          isEmployee={isEmployee}
        />
      )}
    </div>
  );
};

export default Dashboard;

