'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Project, Task, DashboardStats, User, Employee, IndependentWork } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import StatsCards from './StatsCards';
import TaskList from './TaskList';
import ProjectOverview from './ProjectOverview';
import ProjectList from './ProjectList';
import TaskModal from './TaskModal';
import ProjectModal from './ProjectModal';
import EmployeeList from './EmployeeList';
import EmployeeProfile from './EmployeeProfile';
import DirectorProfile from './DirectorProfile';
import { getProjects, createProject, updateProject, deleteProject } from '../services/projectService';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../services/employeeService';
import { taskApi } from '../services/api';
import { getAllIndependentWork, updateIndependentWork, deleteIndependentWork, addComment } from '../services/independentWorkService';
import { Download, Database, FolderKanban, CheckCircle2, Clock, AlertCircle, Users, TrendingUp, ArrowRight, Search, Filter, Eye, CheckCircle, Trash2, FileText, Calendar, User as UserIcon, X, Edit, ChevronLeft, ChevronRight, CheckSquare, FileCheck } from 'lucide-react';
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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'projects' | 'employees' | 'profile' | 'independent-work' | 'approvals'>('overview');
  const [taskFilter, setTaskFilter] = useState<'all' | 'completed' | 'pending' | 'overdue'>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | 'employee' | 'completed' | 'pending'>('all');
  const [projectSourceFilter, setProjectSourceFilter] = useState<'all' | 'director' | 'employee'>('all');
  const [independentWork, setIndependentWork] = useState<IndependentWork[]>([]);
  const [independentWorkFilter, setIndependentWorkFilter] = useState<'all' | 'Design' | 'Site' | 'Office' | 'Other'>('all');
  const [completionRequests, setCompletionRequests] = useState<Task[]>([]);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');
  
  // Task filters
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [taskStaffFilter, setTaskStaffFilter] = useState<string>('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'all' | 'Urgent' | 'Less Urgent' | 'Free Time' | 'Red Flag'>('all');
  const [taskSourceFilter, setTaskSourceFilter] = useState<'all' | 'director' | 'projectHead' | 'employee'>('all');
  const [taskDateRangeStart, setTaskDateRangeStart] = useState('');
  const [taskDateRangeEnd, setTaskDateRangeEnd] = useState('');
  const [taskCurrentPage, setTaskCurrentPage] = useState(1);
  const tasksPerPage = 5;
 
  // Employee priority task counts
  const [employeePriorityStats, setEmployeePriorityStats] = useState({
    urgentTasks: 0,
    lessUrgentTasks: 0,
    freeTimeTasks: 0,
    totalCompletedTasks: 0
  });
  
  // Director priority task counts
  const [directorPriorityStats, setDirectorPriorityStats] = useState({
    urgentTasks: 0,
    lessUrgentTasks: 0,
    freeTimeTasks: 0,
    totalCompletedTasks: 0
  });
  
  // Track selected priority card in director dashboard
  const [selectedPriorityCard, setSelectedPriorityCard] = useState<'urgent' | 'lessUrgent' | 'freeTime' | 'completed' | null>(null);
  
  // Track selected Active Employees card
  const [showActiveEmployees, setShowActiveEmployees] = useState(false);
 
  // Project filters
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectNameFilter, setProjectNameFilter] = useState('');
  const [projectNumberFilter, setProjectNumberFilter] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'Current' | 'Upcoming' | 'Sleeping (On Hold)' | 'Completed'>('all');
  const [projectStaffFilter, setProjectStaffFilter] = useState<string>('all');
  const [projectDateRangeStart, setProjectDateRangeStart] = useState('');
  const [projectDateRangeEnd, setProjectDateRangeEnd] = useState('');
  
  // Employee filters
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'Active' | 'Inactive' | 'On Leave'>('all');
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState<'all' | 'Director' | 'Project Head' | 'Employee'>('all');
  const [viewingEntry, setViewingEntry] = useState<IndependentWork | null>(null);
  const [editingEntry, setEditingEntry] = useState<IndependentWork | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    workDescription: '',
    category: 'Office' as 'Design' | 'Site' | 'Office' | 'Other',
    timeSpent: 0
  });
  const [independentWorkComment, setIndependentWorkComment] = useState('');

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
        { 'Current Projects': projects.filter(p => p.status === 'Current').length },
        { 'Completed Tasks': tasks.filter(t => t.status === 'Completed').length },
        { 'Pending Tasks': tasks.filter(t => t.status === 'Pending').length },
        { 'In Progress Tasks': tasks.filter(t => t.status === 'In Progress').length },
        { 'Overdue Tasks': tasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date()).length }
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
          'Overdue Tasks Count': tasks.filter(t => 
            t.projectId === (proj.id || proj._id) && 
            t.status !== 'Completed' && 
            t.dueDate && new Date(t.dueDate) < new Date()
          ).length,
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

  const loadIndependentWork = useCallback(async () => {
    try {
      if (isDirector) {
        const work = await getAllIndependentWork();
        setIndependentWork(work);
      }
    } catch (error: any) {
      console.error('Error loading independent work:', error);
      setIndependentWork([]);
    }
  }, [isDirector]);

  const loadCompletionRequests = useCallback(async () => {
    try {
      if (isDirector) {
        const requests = await taskApi.getCompletionRequests(approvalStatusFilter);
        setCompletionRequests(requests);
      }
    } catch (error: any) {
      console.error('Error loading completion requests:', error);
      setCompletionRequests([]);
    }
  }, [isDirector, approvalStatusFilter]);

  const handleViewEntry = (entry: IndependentWork) => {
    setViewingEntry(entry);
  };

  const handleEditEntry = (entry: IndependentWork) => {
    setEditingEntry(entry);
    setEditForm({
      date: entry.date,
      workDescription: entry.workDescription,
      category: entry.category,
      timeSpent: entry.timeSpent
    });
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      await deleteIndependentWork(entryId);
      await loadIndependentWork();
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry. Please try again.');
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    try {
      const entryId = editingEntry.id || editingEntry._id;
      if (!entryId) return;

      await updateIndependentWork(entryId, {
        date: editForm.date,
        workDescription: editForm.workDescription,
        category: editForm.category,
        timeSpent: editForm.timeSpent
      });

      await loadIndependentWork();
      setEditingEntry(null);
      setEditForm({
        date: '',
        workDescription: '',
        category: 'Office',
        timeSpent: 0
      });
    } catch (error: any) {
      console.error('Error updating entry:', error);
      alert('Error updating entry. Please try again.');
    }
  };

  const handleAddIndependentWorkComment = async () => {
    if (!viewingEntry || !user?.id || !independentWorkComment.trim()) return;

    try {
      const entryId = viewingEntry.id || viewingEntry._id;
      if (!entryId) return;

      const newComment = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name || user.email || 'Director',
        content: independentWorkComment.trim(),
        timestamp: new Date().toISOString()
      };

      // Optimistically update UI
      setViewingEntry({
        ...viewingEntry,
        comments: [...(viewingEntry.comments || []), newComment]
      });

      // Add comment to database and get updated entry
      const updated = await addComment(entryId, {
        userId: user.id,
        userName: user.name || user.email || 'Director',
        content: independentWorkComment.trim()
      });

      // Update with the real data from server (ensures consistency)
      if (updated && updated.comments) {
        setViewingEntry(updated);
      }

      // Clear the input
      setIndependentWorkComment('');

      // Refresh the list in the background (non-blocking)
      loadIndependentWork().catch(err => {
        console.error('Error refreshing independent work list:', err);
      });
    } catch (error: any) {
      console.error('Error adding comment to independent work:', error);
      alert('Error adding comment. Please try again.');
    }
  };

  useEffect(() => {
    // Load projects, tasks, and employees
    loadProjects();
    loadTasks();
    loadEmployees();
    if (isDirector) {
      loadIndependentWork();
      loadCompletionRequests();
    }
  }, [user, isDirector, loadIndependentWork, loadCompletionRequests]);

  useEffect(() => {
    if (activeTab === 'approvals' && isDirector) {
      loadCompletionRequests();
    }
  }, [activeTab, isDirector, loadCompletionRequests]);

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


  useEffect(() => {
    // Calculate dashboard stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'Current').length;
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
    
    // Calculate director priority task counts (all tasks)
    if (isDirector || isProjectHead) {
      const urgentTasks = tasks.filter(t => t.priority === 'Urgent').length;
      const lessUrgentTasks = tasks.filter(t => t.priority === 'Less Urgent').length;
      const freeTimeTasks = tasks.filter(t => t.priority === 'Free Time').length;
      const totalCompletedTasks = tasks.filter(t => t.status === 'Completed').length;
      
      setDirectorPriorityStats({
        urgentTasks,
        lessUrgentTasks,
        freeTimeTasks,
        totalCompletedTasks
      });
    }
  }, [tasks, projects, employees, isEmployee, isDirector, isProjectHead, user?.id]);

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
  }, [isTaskModalOpen, selectedTask?.id, selectedTask?._id, user, isEmployee, isProjectHead]);

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
        status: 'Completed' as const,
        completedDate: new Date().toISOString(),
        workDone: 100
      };

      // Update the task in the backend
      await taskApi.updateTask(taskId as string, updatedTask);
      
      // Reload tasks to reflect the change
      await loadTasks();
      
    } catch (error: any) {
      console.error('Error marking task as completed:', error);
      alert('Error marking task as completed. Please try again.');
    }
  };

  const handleProjectCompleted = async (project: Project) => {
    try {
      const projectId = project.id || project._id;
      if (!projectId) {
        console.error('No project ID available for completion:', project);
        return;
      }

      // Confirm with user
      if (!window.confirm(`Are you sure you want to mark "${project.name}" as completed?`)) {
        return;
      }

      // Update project status to completed
      const updatedProject = {
        ...project,
        status: 'Completed' as const,
        progress: 100
      };

      // Update the project in the backend
      await updateProject(projectId, updatedProject);
      
      // Reload projects to reflect the change
      await loadProjects();
      
    } catch (error: any) {
      console.error('Error marking project as completed:', error);
      alert('Error marking project as completed. Please try again.');
    }
  };

  const handleProjectSave = async (project: Project) => {
    try {
      const projectId = project.id || project._id;
      
      if (!projectId) {
        // New project - create it
        const projectToCreate = { ...project };
        delete projectToCreate.id;
        delete projectToCreate._id;
        
        console.log('Creating project with data:', JSON.stringify(projectToCreate, null, 2));
        
        await createProject(projectToCreate);
      } else {
        // Existing project - update it
        console.log('Updating project with data:', JSON.stringify(project, null, 2));
        
        await updateProject(projectId, project);
      }
      
      await loadProjects(); // Reload projects from database
    } catch (error: any) {
      console.error('Error saving project:', error);
      alert(`Error saving project: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };

  const handleProjectDelete = async (projectId: string) => {
    try {
      // Confirm with user
      if (!window.confirm(`Are you sure you want to delete this project? This action cannot be undone.`)) {
        return;
      }
      
      await deleteProject(projectId);
      await loadProjects(); // Reload projects from database
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert(`Error deleting project: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    console.log('handleTaskUpdate called with:', updatedTask);
    console.log('Task comments:', updatedTask.comments);
    
    try {
      const taskId = updatedTask.id || updatedTask._id;
      
      if (!taskId) {
        console.error('No task ID available for update:', updatedTask);
        return;
      }
      
      // Always call the update API to save task changes (title, description, etc.)
      console.log('Calling updateTask API...');
      await taskApi.updateTask(taskId, updatedTask);
      await loadTasks();
      
      // Update selectedTask with latest data if modal is still open
      if (isTaskModalOpen) {
        const latestTask = await fetchLatestTask(taskId);
        if (latestTask) {
          setSelectedTask(latestTask);
        }
      }
    } catch (error: any) {
      console.error('Error updating task:', error);
      alert(`Error updating task: ${error?.response?.data?.message || error?.message || 'Unknown error occurred'}`);
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

  // Reset to first page when filters change
  useEffect(() => {
    setTaskCurrentPage(1);
  }, [taskSearchTerm, taskStaffFilter, taskPriorityFilter, taskSourceFilter, taskDateRangeStart, taskDateRangeEnd, taskFilter]);

  // Update filtered tasks when tasks, user, or filter changes
  useEffect(() => {
    if (!tasks.length) {
      setFilteredTasks([]);
      return;
    }

    let filtered: Task[] = [];

    if (isEmployee) {
      // For employees, show only their assigned tasks
      const userId = user?.id || '';
      filtered = tasks.filter(task => {
        const taskAssignedId = task.assignedToId || '';
        return taskAssignedId === userId || 
               String(taskAssignedId) === String(userId);
      });
    } else if (isProjectHead) {
      // For project heads, show all tasks (same as director) so they can see tasks they created
      filtered = tasks;
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
            return task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date();
          default:
            return true;
        }
      });
    }

    // Apply search filter (task name)
    if (taskSearchTerm.trim()) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(taskSearchTerm.toLowerCase())
      );
    }

    // Apply staff name filter
    if (taskStaffFilter !== 'all') {
      filtered = filtered.filter(task => task.assignedToId === taskStaffFilter);
    }

    // Apply priority filter
    if (taskPriorityFilter !== 'all') {
      if (taskPriorityFilter === 'Red Flag') {
        filtered = filtered.filter(task => task.flagDirectorInputRequired === true);
      } else {
      filtered = filtered.filter(task => task.priority === taskPriorityFilter);
      }
    }

    // Apply task source filter (for directors only)
    if (isDirector && taskSourceFilter !== 'all') {
      filtered = filtered.filter(task => {
        if (taskSourceFilter === 'director') {
          // Tasks created by Director - exclude tasks created by employees from employee dashboard
          // Also exclude tasks created by Project Heads
          if (task.isEmployeeCreated === true) return false;
          
          // Check if assignedById belongs to a Project Head
          const taskAssignedId = task.assignedById || '';
          const isProjectHeadTask = employees.some(emp => {
            const empId = emp.id || (emp as any)._id || '';
            return (empId === taskAssignedId || 
                    String(empId) === String(taskAssignedId) ||
                    String(empId) === taskAssignedId ||
                    empId === String(taskAssignedId)) && 
                   emp.role === 'Project Head';
          });
          
          return !isProjectHeadTask; // Director tasks are not Project Head tasks
        } else if (taskSourceFilter === 'projectHead') {
          // Tasks created by Project Head
          if (task.isEmployeeCreated === true) return false;
          
          const taskAssignedId = task.assignedById || '';
          const isProjectHeadTask = employees.some(emp => {
            const empId = emp.id || (emp as any)._id || '';
            return (empId === taskAssignedId || 
                    String(empId) === String(taskAssignedId) ||
                    String(empId) === taskAssignedId ||
                    empId === String(taskAssignedId)) && 
                   emp.role === 'Project Head';
          });
          
          return isProjectHeadTask;
        } else if (taskSourceFilter === 'employee') {
          // Tasks created by Employee - only show tasks created by employees from employee dashboard
          return task.isEmployeeCreated === true;
        }
        return true;
      });
    }

    // Apply date range filter
    if (taskDateRangeStart) {
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        return new Date(task.dueDate) >= new Date(taskDateRangeStart);
      });
    }
    if (taskDateRangeEnd) {
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        return new Date(task.dueDate) <= new Date(taskDateRangeEnd);
      });
    }

    setFilteredTasks(filtered);
  }, [tasks, user, isEmployee, isProjectHead, isDirector, projects, taskFilter, taskSearchTerm, taskStaffFilter, taskPriorityFilter, taskSourceFilter, taskDateRangeStart, taskDateRangeEnd, employees]);

  const filteredProjects = useMemo(() => {
    let filtered: Project[] = [];

    if (isEmployee) {
      // Employees see projects they're assigned to
      filtered = projects.filter(project => project.assignedEmployeeId === user?.id);
    } else {
      // Directors and project heads see all projects
      filtered = projects;
    }

    // Apply project filter
    if (projectFilter !== 'all') {
      switch (projectFilter) {
        case 'employee':
          // Show projects assigned to employees (not directors/project heads)
          filtered = filtered.filter(project => project.assignedEmployeeId !== user?.id);
          break;
        case 'completed':
          filtered = filtered.filter(project => project.status === 'Completed');
          break;
        case 'pending':
          filtered = filtered.filter(project => project.status === 'Current' || project.status === 'Upcoming' || project.status === 'Sleeping (On Hold)');
          break;
        default:
          break;
      }
    }

    // Apply search filter (general search)
    if (projectSearchTerm.trim()) {
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
        project.projectNumber?.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
        project.location?.toLowerCase().includes(projectSearchTerm.toLowerCase())
      );
    }

    // Apply project name filter
    if (projectNameFilter.trim()) {
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(projectNameFilter.toLowerCase())
      );
    }

    // Apply project number filter
    if (projectNumberFilter.trim()) {
      filtered = filtered.filter(project => 
        project.projectNumber?.toLowerCase().includes(projectNumberFilter.toLowerCase())
      );
    }

    // Apply status filter
    if (projectStatusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === projectStatusFilter);
    }

    // Apply staff name filter
    if (projectStaffFilter !== 'all') {
      filtered = filtered.filter(project => project.assignedEmployeeId === projectStaffFilter);
    }

    // Apply project source filter (for directors only)
    if (isDirector && projectSourceFilter !== 'all') {
      filtered = filtered.filter(project => {
        if (projectSourceFilter === 'director') {
          // Projects created by Director - exclude projects created by employees from employee dashboard
          return !project.isEmployeeCreated;
        } else if (projectSourceFilter === 'employee') {
          // Projects created by Employee - only show projects created by employees from employee dashboard
          return project.isEmployeeCreated === true;
        }
        return true;
      });
    }

    // Apply date range filter (start date)
    if (projectDateRangeStart) {
      filtered = filtered.filter(project => {
        if (!project.startDate) return false;
        return new Date(project.startDate) >= new Date(projectDateRangeStart);
      });
    }
    if (projectDateRangeEnd) {
      filtered = filtered.filter(project => {
        if (!project.startDate) return false;
        return new Date(project.startDate) <= new Date(projectDateRangeEnd);
      });
    }

    return filtered;
  }, [projects, user, isEmployee, isDirector, projectFilter, projectSearchTerm, projectNameFilter, projectNumberFilter, projectStatusFilter, projectStaffFilter, projectSourceFilter, projectDateRangeStart, projectDateRangeEnd, employees]);

  // Filter employees by status and role
  const filteredEmployees = useMemo(() => {
    let filtered: Employee[] = employees;

    // Apply status filter
    if (employeeStatusFilter !== 'all') {
      filtered = filtered.filter(employee => employee.status === employeeStatusFilter);
    }

    // Apply role filter
    if (employeeRoleFilter !== 'all') {
      filtered = filtered.filter(employee => employee.role === employeeRoleFilter);
    }

    return filtered;
  }, [employees, employeeStatusFilter, employeeRoleFilter]);

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
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} isEmployee={isEmployee} isDirector={isDirector} />
      
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
                {(isDirector || isProjectHead) && (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Key Metrics Cards - Modern Design */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px'
              }}>
                {isEmployee ? (
                  <>
                    {/* Urgent Tasks Card - Employee Only */}
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
                      setActiveTab('tasks');
                      setTaskPriorityFilter('Urgent');
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

                    {/* Less Urgent Tasks Card - Employee Only */}
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
                      setActiveTab('tasks');
                      setTaskPriorityFilter('Less Urgent');
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

                    {/* Free Time Tasks Card - Employee Only */}
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
                      setActiveTab('tasks');
                      setTaskPriorityFilter('Free Time');
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

                    {/* Completed Tasks Card - Employee Only */}
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
                      setActiveTab('tasks');
                      setTaskFilter('completed');
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
                  </>
                ) : (
                  <>
                    {/* Total Tasks Card - Director */}
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                      boxShadow: '0 10px 25px -5px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 20px 35px -5px rgba(102, 126, 234, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(102, 126, 234, 0.3)';
                }}
                    onClick={() => {
                      setActiveTab('tasks');
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
                            Total Tasks
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
                            <CheckSquare size={20} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: '700',
                      margin: '0 0 8px 0',
                      letterSpacing: '-1px'
                    }}>
                          {stats.totalTasks}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      opacity: 0.8,
                      display: 'flex',
                      alignItems: 'center',
                          gap: '4px'
                    }}>
                          <CheckSquare size={12} />
                          <span>All tasks</span>
                    </div>
                      </div>
                    </div>

                    {/* Total Projects Card - Director */}
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
                      setActiveTab('projects');
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
                            Total Projects
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
                            <FolderKanban size={20} />
                          </div>
                        </div>
                        <div style={{
                          fontSize: '36px',
                          fontWeight: '700',
                          margin: '0 0 8px 0',
                          letterSpacing: '-1px'
                        }}>
                          {stats.totalProjects}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          opacity: 0.8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <FolderKanban size={12} />
                          <span>All projects</span>
                        </div>
                  </div>
                </div>

                    {/* Total Employees Card - Director */}
                <div style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px -5px rgba(79, 172, 254, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 35px -5px rgba(79, 172, 254, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(79, 172, 254, 0.3)';
                }}
                    onClick={() => {
                      setActiveTab('employees');
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
                            Total Employees
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
                        <Users size={20} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: '700',
                      margin: '0 0 8px 0',
                      letterSpacing: '-1px'
                    }}>
                          {employees.length}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      opacity: 0.8,
                      display: 'flex',
                      alignItems: 'center',
                          gap: '4px'
                    }}>
                      <Users size={12} />
                      <span>Team members</span>
                    </div>
                      </div>
                    </div>

                    {/* Approvals Card - Director Only */}
                    {isDirector && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                        color: '#ffffff',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 10px 25px -5px rgba(250, 112, 154, 0.3)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                      }}
                      onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 20px 35px -5px rgba(250, 112, 154, 0.4)';
                      }}
                      onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(250, 112, 154, 0.3)';
                    }}
                    onClick={() => {
                      setActiveTab('approvals');
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
                            Approvals
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
                            <FileCheck size={20} />
                  </div>
                </div>
                        <div style={{
                          fontSize: '36px',
                          fontWeight: '700',
                          margin: '0 0 8px 0',
                          letterSpacing: '-1px'
                        }}>
                          {completionRequests.filter(task => task.completionRequestStatus === 'Pending').length}
              </div>
              <div style={{
                          fontSize: '12px',
                          opacity: 0.8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <FileCheck size={12} />
                          <span>Pending approvals</span>
                        </div>
                      </div>
                    </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Priority Tasks Table - Director Only */}
              {isDirector && selectedPriorityCard && (() => {
                // Filter tasks based on selected card
                let filteredPriorityTasks: Task[] = [];
                let cardTitle = '';
                
                switch (selectedPriorityCard) {
                  case 'urgent':
                    filteredPriorityTasks = tasks.filter(t => t.priority === 'Urgent');
                    cardTitle = 'Urgent Tasks';
                    break;
                  case 'lessUrgent':
                    filteredPriorityTasks = tasks.filter(t => t.priority === 'Less Urgent');
                    cardTitle = 'Less Urgent Tasks';
                    break;
                  case 'freeTime':
                    filteredPriorityTasks = tasks.filter(t => t.priority === 'Free Time');
                    cardTitle = 'Free Time Tasks';
                    break;
                  case 'completed':
                    filteredPriorityTasks = tasks.filter(t => t.status === 'Completed');
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
                        <div style={{
                        overflowX: 'auto'
                      }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'separate',
                          borderSpacing: '0 12px'
                        }}>
                          <thead>
                            <tr>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                          color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Priority</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Status</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Project Name</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                          color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Task Title</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Description / Remarks</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Work Done (%)</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Flag (Director Input Required)</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Date</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Created by</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPriorityTasks.map((task) => {
                              const priorityColor = priorityColors[task.priority || 'Less Urgent'] || priorityColors['Less Urgent'];
                              const statusColor = statusColors[task.status || 'Pending'] || statusColors['Pending'];
                    
                    return (
                                <tr
                                  key={task.id || task._id}
                        style={{
                                    backgroundColor: '#ffffff',
                          borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseOver={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                                  {/* Priority */}
                                  <td style={{
                                    padding: '16px',
                                    borderTopLeftRadius: '12px',
                                    borderBottomLeftRadius: '12px'
                        }}>
                          <span style={{
                                      backgroundColor: priorityColor.bg,
                                      color: priorityColor.text,
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      fontSize: '11px',
                            fontWeight: '600',
                                      letterSpacing: '0.3px',
                                      textTransform: 'uppercase',
                                      display: 'inline-block'
                          }}>
                                      {task.priority || 'Less Urgent'}
                          </span>
                                  </td>
                                  {/* Status */}
                                  <td style={{ padding: '16px' }}>
                          <span style={{
                                      backgroundColor: statusColor.bg,
                                      color: statusColor.text,
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      letterSpacing: '0.3px',
                                      textTransform: 'uppercase',
                                      display: 'inline-block'
                          }}>
                                      {task.status || 'Pending'}
                          </span>
                                  </td>
                                  {/* Project Name */}
                                  <td style={{ padding: '16px' }}>
                        <div style={{
                                      fontSize: '13px',
                          color: '#111827',
                                      fontWeight: '500'
                        }}>
                                      {task.projectName || 'N/A'}
                        </div>
                                  </td>
                                  {/* Task Title */}
                                  <td style={{ padding: '16px' }}>
                        <div style={{
                          fontSize: '14px',
                                      fontWeight: '600',
                                      color: '#111827'
                        }}>
                                      {task.title}
                        </div>
                                  </td>
                                  {/* Description / Remarks */}
                                  <td style={{ padding: '16px' }}>
                                    {task.description ? (
                        <div style={{
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        maxWidth: '300px'
                                      }}>
                                        {task.description}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>No description</span>
                                    )}
                                  </td>
                                  {/* Work Done (%) */}
                                  <td style={{ padding: '16px' }}>
                                    <span style={{
                                      display: 'inline-flex',
                          alignItems: 'center',
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      backgroundColor: '#e0e7ff',
                                      color: '#4f46e5'
                                    }}>
                                      {task.workDone || 0}%
                                    </span>
                                  </td>
                                  {/* Flag (Director Input Required) */}
                                  <td style={{ padding: '16px' }}>
                                    {task.flagDirectorInputRequired ? (
                          <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
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
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        backgroundColor: '#f3f4f6',
                                        color: '#6b7280'
                          }}>
                                        No
                          </span>
                                    )}
                                  </td>
                                  {/* Date */}
                                  <td style={{ padding: '16px' }}>
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
                                  {/* Created by */}
                                  <td style={{ padding: '16px' }}>
                                    <div style={{
                                      fontSize: '13px',
                                      fontWeight: '500',
                                      color: '#374151'
                                    }}>
                                      {task.assignedByName || 'N/A'}
                                    </div>
                                  </td>
                                  {/* Actions */}
                                  <td style={{
                                    padding: '16px',
                                    borderTopRightRadius: '12px',
                                    borderBottomRightRadius: '12px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                                      {(isDirector || isProjectHead) && (
                                        <>
                                          {task.status !== 'Completed' && (
                                            <button
                                              onClick={() => handleTaskCompleted(task)}
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
                                                boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)'
                                              }}
                                              onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor = '#bbf7d0';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(22, 163, 74, 0.3)';
                                              }}
                                              onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor = '#dcfce7';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(22, 163, 74, 0.2)';
                                              }}
                                              title="Mark as Completed"
                                            >
                                              <CheckCircle size={14} />
                                              Complete
                                            </button>
                                          )}
                                          {(isDirector || isProjectHead) && (
                                            <button
                                              onClick={async () => {
                                                if (window.confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
                                                  try {
                                                    const taskId = String(task.id || task._id || '').trim();
                                                    if (!taskId) {
                                                      alert('Error: Task ID is missing. Cannot delete task.');
                                                      return;
                                                    }
                                                    console.log('Deleting task with ID:', taskId, 'Type:', typeof taskId);
                                                    const response = await taskApi.deleteTask(taskId);
                                                    console.log('Delete response:', response);
                                                    await loadTasks();
                                                  } catch (error: any) {
                                                    console.error('Error deleting task:', error);
                                                    console.error('Error response:', error?.response);
                                                    const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error occurred';
                                                    alert(`Error deleting task: ${errorMessage}`);
                                                  }
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
                                              <Trash2 size={14} />
                                              Delete
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
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

              {/* Active Employees Table */}
              {showActiveEmployees && (
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
                      Active Employees
                      </h3>
                    <button
                      onClick={() => setShowActiveEmployees(false)}
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
                  
                  {(() => {
                    const activeEmployeesList = employees.filter(emp => emp.status === 'Active');
                    
                    return activeEmployeesList.length > 0 ? (
                      <div style={{
                        overflowX: 'auto'
                      }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'separate',
                          borderSpacing: '0 12px'
                        }}>
                          <thead>
                            <tr>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Name</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Email</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Position</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Department</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Role</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Joining Date</th>
                              <th style={{
                                textAlign: 'left',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeEmployeesList.map((employee) => {
                              const roleColors: Record<string, { bg: string; text: string }> = {
                                'Director': { bg: '#fee2e2', text: '#dc2626' },
                                'Project Head': { bg: '#dbeafe', text: '#2563eb' },
                                'Employee': { bg: '#d1fae5', text: '#059669' }
                    };
                              const roleColor = roleColors[employee.role || 'Employee'] || roleColors['Employee'];
                    
                    return (
                                <tr
                                  key={employee.id || employee._id}
                        style={{
                                    backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseOver={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                                  <td style={{
                                    padding: '16px',
                                    borderTopLeftRadius: '12px',
                                    borderBottomLeftRadius: '12px'
                                  }}>
                        <div style={{
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      color: '#111827'
                        }}>
                                      {employee.firstName} {employee.lastName}
                                    </div>
                                    {employee.phone && (
                          <div style={{
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '4px'
                                      }}>
                                        {employee.phone}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '16px' }}>
                                    <div style={{
                                      fontSize: '13px',
                            color: '#111827',
                                      fontWeight: '500'
                          }}>
                                      {employee.email}
                          </div>
                                  </td>
                                  <td style={{ padding: '16px' }}>
                        <div style={{
                          fontSize: '13px',
                                      color: '#111827',
                                      fontWeight: '500'
                        }}>
                                      {employee.position || 'N/A'}
                        </div>
                                  </td>
                                  <td style={{ padding: '16px' }}>
                        <div style={{
                                      fontSize: '13px',
                                      color: '#111827',
                                      fontWeight: '500'
                        }}>
                                      {employee.department || 'N/A'}
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px' }}>
                          <span style={{
                                      backgroundColor: roleColor.bg,
                                      color: roleColor.text,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            letterSpacing: '0.3px',
                                      textTransform: 'uppercase',
                                      display: 'inline-block'
                          }}>
                                      {employee.role || 'Employee'}
                          </span>
                                  </td>
                                  <td style={{ padding: '16px' }}>
                                    <div style={{
                                      fontSize: '13px',
                                      color: '#6b7280'
                          }}>
                                      {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A'}
                        </div>
                                  </td>
                                  <td style={{
                                    padding: '16px',
                                    borderTopRightRadius: '12px',
                                    borderBottomRightRadius: '12px'
                        }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab('employees');
                                      }}
                                      style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        color: '#ffffff',
                            fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(102, 126, 234, 0.4)';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
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
                          No active employees found
                        </div>
                    <div style={{
                          fontSize: '14px',
                          color: '#9ca3af'
                    }}>
                          There are no active employees at the moment.
                    </div>
                </div>
                    );
                  })()}
                </div>
              )}
                
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
                  cursor: 'pointer',
                  marginTop: '24px'
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
          )}

          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Header - Modern Design */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '20px',
                borderBottom: '2px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)'
                  }}>
                    <FileText size={24} color="#ffffff" />
                  </div>
                  <div>
                    <h1 style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: '0 0 4px 0',
                      letterSpacing: '-0.5px'
                    }}>
                      Tasks
                    </h1>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      Manage and track all your tasks
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#ffffff',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.color = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  }}>
                    <Download size={16} />
                    Export
                  </button>
                {(isDirector || isProjectHead) && (
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(102, 126, 234, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(102, 126, 234, 0.3)';
                      }}
                    >
                      <FileText size={16} />
                      New Task
                  </button>
                )}
                  </div>
                  </div>
              
              {/* Search and Filter Section - Ultra Modern Design */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative gradient background element */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '300px',
                  height: '300px',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                  pointerEvents: 'none'
                }} />
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '28px',
                  paddingBottom: '20px',
                  borderBottom: '2px solid #e5e7eb',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 6px -1px rgba(102, 126, 234, 0.3)'
                  }}>
                    <Filter size={24} color="#ffffff" />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: 0,
                      letterSpacing: '-0.5px'
                    }}>
                      Filters & Search
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      margin: '4px 0 0 0'
                    }}>
                      Refine your task list with powerful filters
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '24px',
                  marginBottom: '24px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {/* Search by Task Name */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '10px',
                      letterSpacing: '-0.2px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Search size={16} color="#3b82f6" />
                      </div>
                      Search Task Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search by task name..."
                        value={taskSearchTerm}
                        onChange={(e) => setTaskSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px 12px 48px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      />
                      <Search size={18} style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                        pointerEvents: 'none',
                        transition: 'color 0.2s ease'
                      }} />
                    </div>
                  </div>

                  {/* Filter by Staff Name */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '10px',
                      letterSpacing: '-0.2px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <UserIcon size={16} color="#16a34a" />
                      </div>
                      Filter by Staff
                    </label>
                    <select
                      value={taskStaffFilter}
                      onChange={(e) => setTaskStaffFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        appearance: 'none',
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 16px center',
                        paddingRight: '40px'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      onMouseOver={(e) => {
                        if (document.activeElement !== e.currentTarget) {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (document.activeElement !== e.currentTarget) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <option value="all">All Staff</option>
                      {employees.map(emp => (
                        <option key={emp.id || emp._id} value={emp.id || emp._id}>
                          {emp.firstName} {emp.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Priority */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '10px',
                      letterSpacing: '-0.2px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <AlertCircle size={16} color="#d97706" />
                      </div>
                      Filter by Priority
                    </label>
                    <select
                      value={taskPriorityFilter}
                      onChange={(e) => setTaskPriorityFilter(e.target.value as 'all' | 'Urgent' | 'Less Urgent' | 'Free Time' | 'Red Flag')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        appearance: 'none',
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 16px center',
                        paddingRight: '40px'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      onMouseOver={(e) => {
                        if (document.activeElement !== e.currentTarget) {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (document.activeElement !== e.currentTarget) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <option value="all">All Priorities</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Less Urgent">Less Urgent</option>
                      <option value="Free Time">Free Time</option>
                      <option value="Red Flag">🚩 Red Flag</option>
                    </select>
                  </div>

                  {/* Date Range Start */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '10px',
                      letterSpacing: '-0.2px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Calendar size={16} color="#db2777" />
                      </div>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={taskDateRangeStart}
                      onChange={(e) => setTaskDateRangeStart(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      onMouseOver={(e) => {
                        if (document.activeElement !== e.currentTarget) {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (document.activeElement !== e.currentTarget) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    />
                  </div>

                  {/* Date Range End */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '10px',
                      letterSpacing: '-0.2px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Calendar size={16} color="#db2777" />
                      </div>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={taskDateRangeEnd}
                      onChange={(e) => setTaskDateRangeEnd(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      onMouseOver={(e) => {
                        if (document.activeElement !== e.currentTarget) {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (document.activeElement !== e.currentTarget) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Clear Filters Button */}
                {(taskSearchTerm || taskStaffFilter !== 'all' || taskPriorityFilter !== 'all' || taskSourceFilter !== 'all' || taskDateRangeStart || taskDateRangeEnd) && (
                  <div style={{
                    paddingTop: '20px',
                    borderTop: '2px solid #e5e7eb',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <button
                      onClick={() => {
                        setTaskSearchTerm('');
                        setTaskStaffFilter('all');
                        setTaskPriorityFilter('all');
                        setTaskSourceFilter('all');
                        setTaskDateRangeStart('');
                        setTaskDateRangeEnd('');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                        color: '#dc2626',
                        border: '2px solid #fca5a5',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                        letterSpacing: '-0.2px'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)';
                        e.currentTarget.style.borderColor = '#f87171';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(220, 38, 38, 0.3)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
                        e.currentTarget.style.borderColor = '#fca5a5';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
                      }}
                    >
                      <X size={18} />
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Task Source Filter - Only for Directors */}
              {isDirector && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
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
                      Tasks created by Director
                    </button>
                    <button
                      onClick={() => setTaskSourceFilter('projectHead')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: taskSourceFilter === 'projectHead' ? '#9333ea' : '#ffffff',
                        color: taskSourceFilter === 'projectHead' ? '#ffffff' : '#7c3aed',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        if (taskSourceFilter !== 'projectHead') {
                          e.currentTarget.style.backgroundColor = '#faf5ff';
                          e.currentTarget.style.borderColor = '#7c3aed';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (taskSourceFilter !== 'projectHead') {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                    >
                      Assigned by Project Head
                    </button>
                    <button
                      onClick={() => setTaskSourceFilter('employee')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: taskSourceFilter === 'employee' ? '#10b981' : '#ffffff',
                        color: taskSourceFilter === 'employee' ? '#ffffff' : '#059669',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        if (taskSourceFilter !== 'employee') {
                          e.currentTarget.style.backgroundColor = '#ecfdf5';
                          e.currentTarget.style.borderColor = '#059669';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (taskSourceFilter !== 'employee') {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                    >
                      Tasks created by Employee
                    </button>
                  </div>
                </div>
              )}
              
              {/* Tasks Table - Modern Design */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
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
                {(isDirector || isProjectHead) && (
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
                  <>
                  {/* Tasks Table - Modern Design */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
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
                            Created by
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
                      {(() => {
                        // Calculate pagination
                        const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
                        const startIndex = (taskCurrentPage - 1) * tasksPerPage;
                        const endIndex = startIndex + tasksPerPage;
                        const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
                        
                        return paginatedTasks.map((task, index) => (
                          <tr key={task.id || task._id} style={{
                            borderBottom: index < paginatedTasks.length - 1 ? '1px solid #f3f4f6' : 'none',
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
                          }}>
                            {/* Priority */}
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
                                backgroundColor: task.priority === 'Urgent' ? '#fee2e2' :
                                                task.priority === 'Less Urgent' ? '#fef3c7' :
                                                task.priority === 'Free Time' ? '#d1fae5' :
                                                '#f3f4f6',
                                color: task.priority === 'Urgent' ? '#991b1b' :
                                       task.priority === 'Less Urgent' ? '#92400e' :
                                       task.priority === 'Free Time' ? '#065f46' :
                                       '#374151',
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
                                backgroundColor: task.status === 'Completed' ? '#d1fae5' :
                                                task.status === 'In Progress' ? '#dbeafe' :
                                                task.status === 'Pending' ? '#fef3c7' :
                                                '#f3f4f6',
                                color: task.status === 'Completed' ? '#065f46' :
                                       task.status === 'In Progress' ? '#1e3a8a' :
                                       task.status === 'Pending' ? '#92400e' :
                                       '#374151',
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
                                <span style={{ 
                                display: 'inline-flex',
                                  alignItems: 'center',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '600',
                                backgroundColor: '#e0e7ff',
                                color: '#4f46e5'
                                }}>
                                {task.workDone || 0}%
                                </span>
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
                            {/* Created by */}
                            <td style={{ padding: '20px' }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '500',
                                color: '#374151'
                              }}>
                                {task.assignedByName || 'N/A'}
                              </div>
                            </td>
                            <td style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <button
                                onClick={() => {
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
                                {(isDirector || isProjectHead) && (
                                  <>
                                    {task.status !== 'Completed' && (
                                      <button
                                        onClick={() => handleTaskCompleted(task)}
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
                                          boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)'
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.backgroundColor = '#bbf7d0';
                                          e.currentTarget.style.transform = 'translateY(-1px)';
                                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(22, 163, 74, 0.3)';
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.backgroundColor = '#dcfce7';
                                          e.currentTarget.style.transform = 'translateY(0)';
                                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(22, 163, 74, 0.2)';
                                        }}
                                        title="Mark as Completed"
                                      >
                                        <CheckCircle size={14} />
                                        Complete
                                      </button>
                                    )}
                                    {(isDirector || isProjectHead) && (
                                      <button
                                        onClick={async () => {
                                          if (window.confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
                                            try {
                                              const taskId = String(task.id || task._id || '').trim();
                                              if (!taskId) {
                                                alert('Error: Task ID is missing. Cannot delete task.');
                                                return;
                                              }
                                              console.log('Deleting task with ID:', taskId, 'Type:', typeof taskId);
                                              const response = await taskApi.deleteTask(taskId);
                                              console.log('Delete response:', response);
                                              await loadTasks();
                                            } catch (error: any) {
                                              console.error('Error deleting task:', error);
                                              console.error('Error response:', error?.response);
                                              const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error occurred';
                                              alert(`Error deleting task: ${errorMessage}`);
                                            }
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
                                        <Trash2 size={14} />
                                        Delete
                                      </button>
                                    )}
                                  </>
                                )}
                            </div>
                          </td>
                        </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {(() => {
                    const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
                    const startIndex = (taskCurrentPage - 1) * tasksPerPage;
                    const endIndex = Math.min(startIndex + tasksPerPage, filteredTasks.length);
                    const startEntry = filteredTasks.length > 0 ? startIndex + 1 : 0;
                    
                    if (totalPages <= 1) return null;
                    
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '24px 20px',
                        borderTop: '2px solid #f3f4f6',
                        backgroundColor: '#ffffff',
                        borderRadius: '0 0 16px 16px'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          fontWeight: '500'
                        }}>
                          Showing {startEntry}-{endIndex} of {filteredTasks.length} tasks
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <button
                            onClick={() => setTaskCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={taskCurrentPage === 1}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '36px',
                              height: '36px',
                              padding: '8px',
                              backgroundColor: taskCurrentPage === 1 ? '#f3f4f6' : '#ffffff',
                              color: taskCurrentPage === 1 ? '#9ca3af' : '#374151',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              cursor: taskCurrentPage === 1 ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              fontSize: '14px',
                              fontWeight: '600'
                            }}
                            onMouseOver={(e) => {
                              if (taskCurrentPage !== 1) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (taskCurrentPage !== 1) {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                                e.currentTarget.style.borderColor = '#e5e7eb';
                              }
                            }}
                          >
                            <ChevronLeft size={18} />
                          </button>
                          
                          {/* Page Numbers */}
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                            // Show first page, last page, current page, and pages around current
                            const showPage = pageNum === 1 || 
                                           pageNum === totalPages || 
                                           (pageNum >= taskCurrentPage - 1 && pageNum <= taskCurrentPage + 1);
                            
                            if (!showPage) {
                              // Show ellipsis only once
                              const prevPage = pageNum - 1;
                              const nextPage = pageNum + 1;
                              if (prevPage === 1 || nextPage === totalPages || 
                                  (prevPage >= taskCurrentPage - 1 && prevPage <= taskCurrentPage + 1) ||
                                  (nextPage >= taskCurrentPage - 1 && nextPage <= taskCurrentPage + 1)) {
                                return null;
                              }
                              // Check if we already showed ellipsis for this gap
                              const prevShown = Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || (p >= taskCurrentPage - 1 && p <= taskCurrentPage + 1))
                                .find(p => p > pageNum);
                              if (prevShown && prevShown - pageNum > 1) {
                                return (
                                  <span key={pageNum} style={{
                                    padding: '8px 12px',
                                    color: '#9ca3af',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                  }}>
                                    ...
                                  </span>
                                );
                              }
                              return null;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setTaskCurrentPage(pageNum)}
                                style={{
                                  minWidth: '36px',
                                  height: '36px',
                                  padding: '8px 12px',
                                  backgroundColor: taskCurrentPage === pageNum ? '#667eea' : '#ffffff',
                                  color: taskCurrentPage === pageNum ? '#ffffff' : '#374151',
                                  border: '2px solid',
                                  borderColor: taskCurrentPage === pageNum ? '#667eea' : '#e5e7eb',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  boxShadow: taskCurrentPage === pageNum ? '0 2px 4px rgba(102, 126, 234, 0.2)' : 'none'
                                }}
                                onMouseOver={(e) => {
                                  if (taskCurrentPage !== pageNum) {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (taskCurrentPage !== pageNum) {
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                  }
                                }}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => setTaskCurrentPage(prev => Math.min(Math.ceil(filteredTasks.length / tasksPerPage), prev + 1))}
                            disabled={taskCurrentPage >= totalPages}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '36px',
                              height: '36px',
                              padding: '8px',
                              backgroundColor: taskCurrentPage >= totalPages ? '#f3f4f6' : '#ffffff',
                              color: taskCurrentPage >= totalPages ? '#9ca3af' : '#374151',
                              border: '2px solid #e5e7eb',
                              borderRadius: '8px',
                              cursor: taskCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              fontSize: '14px',
                              fontWeight: '600'
                            }}
                            onMouseOver={(e) => {
                              if (taskCurrentPage < totalPages) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (taskCurrentPage < totalPages) {
                                e.currentTarget.style.backgroundColor = '#ffffff';
                                e.currentTarget.style.borderColor = '#e5e7eb';
                              }
                            }}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Projects Tab - Modern Design */}
          {activeTab === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Header - Modern Design */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '20px',
                borderBottom: '2px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                  }}>
                    <FolderKanban size={24} color="#ffffff" />
                  </div>
                  <div>
                    <h1 style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: '0 0 4px 0',
                      letterSpacing: '-0.5px'
                    }}>
                      Projects
                    </h1>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      Manage and track all your projects
                    </p>
                  </div>
                </div>
              </div>

              {/* Search and Filter Section - Modern Design */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative gradient background element */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '300px',
                  height: '300px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                  pointerEvents: 'none'
                }} />
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '28px',
                  paddingBottom: '20px',
                  borderBottom: '2px solid #e5e7eb',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                  }}>
                    <Filter size={24} color="#ffffff" />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: 0,
                      letterSpacing: '-0.5px'
                    }}>
                      Filters & Search
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      margin: '4px 0 0 0'
                    }}>
                      Refine your project list with powerful filters
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '24px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {/* Search Bar */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '10px',
                      letterSpacing: '-0.2px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Search size={16} color="#3b82f6" />
                      </div>
                      Search
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px 12px 48px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#10b981';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      />
                      <Search size={18} style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                        pointerEvents: 'none',
                        transition: 'color 0.2s ease'
                      }} />
                    </div>
                  </div>

                  {/* Filter by Project Name */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '10px',
                      letterSpacing: '-0.2px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FolderKanban size={16} color="#16a34a" />
                      </div>
                      Project Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Filter by project name..."
                        value={projectNameFilter}
                        onChange={(e) => setProjectNameFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px 12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#10b981';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      />
                    </div>
                  </div>

                  {/* Filter by Project Number */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '10px',
                      letterSpacing: '-0.2px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FileText size={16} color="#d97706" />
                      </div>
                      Project Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Filter by project number..."
                        value={projectNumberFilter}
                        onChange={(e) => setProjectNumberFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px 12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#10b981';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      />
                    </div>
                  </div>

                  {/* Filter by Status */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '10px',
                      letterSpacing: '-0.2px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Filter size={16} color="#6366f1" />
                      </div>
                      Status
                    </label>
                    <select
                      value={projectStatusFilter}
                      onChange={(e) => setProjectStatusFilter(e.target.value as 'all' | 'Current' | 'Upcoming' | 'Sleeping (On Hold)' | 'Completed')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        appearance: 'none',
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 16px center',
                        paddingRight: '40px'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#10b981';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <option value="all">All Status</option>
                      <option value="Current">Current</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Sleeping (On Hold)">Sleeping (On Hold)</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Project List Component */}
              <ProjectList
                projects={filteredProjects}
                users={employees.map(emp => ({
                  id: emp.id || emp._id || '',
                  name: `${emp.firstName} ${emp.lastName}`,
                  email: emp.email,
                  role: emp.role
                }))}
                onProjectSave={handleProjectSave}
                onProjectDelete={handleProjectDelete}
                onProjectComplete={handleProjectCompleted}
              />
            </div>
          )}

          {/* Employees Tab - Modern Design */}
          {activeTab === 'employees' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Header - Ultra Modern */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '24px',
                borderBottom: '2px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px -5px rgba(79, 172, 254, 0.4)'
                  }}>
                    <Users size={28} color="#ffffff" />
                  </div>
                  <div>
                    <h1 style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: '0 0 6px 0',
                      letterSpacing: '-0.5px'
                    }}>
                      Employee Management
                    </h1>
                    <p style={{
                      fontSize: '15px',
                      color: '#6b7280',
                      margin: 0,
                      lineHeight: '1.5'
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
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      color: '#ffffff',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 6px -1px rgba(245, 87, 108, 0.3)',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(245, 87, 108, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(245, 87, 108, 0.3)';
                    }}
                    title="Download all data as Excel backup"
                  >
                    <Download size={18} />
                    <span>Backup</span>
                  </button>
                )}
              </div>

              {/* Employee Status Filter */}
              {isDirector && (
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Filter size={20} color="#ffffff" />
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#111827',
                        margin: 0,
                        letterSpacing: '-0.3px'
                      }}>
                        Filter Employees
                      </h3>
                      <p style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        margin: '4px 0 0 0'
                      }}>
                        Filter by employee status and role
                      </p>
                    </div>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px'
                  }}>
                    <div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Users size={14} color="#6366f1" />
                        </div>
                        Status
                      </label>
                      <select
                        value={employeeStatusFilter}
                        onChange={(e) => setEmployeeStatusFilter(e.target.value as 'all' | 'Active' | 'Inactive' | 'On Leave')}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          appearance: 'none',
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 16px center',
                          paddingRight: '40px'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#4facfe';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79, 172, 254, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <option value="all">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                    <div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <UserIcon size={14} color="#d97706" />
                        </div>
                        Role
                      </label>
                      <select
                        value={employeeRoleFilter}
                        onChange={(e) => setEmployeeRoleFilter(e.target.value as 'all' | 'Director' | 'Project Head' | 'Employee')}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '14px',
                          outline: 'none',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          appearance: 'none',
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 16px center',
                          paddingRight: '40px'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#4facfe';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79, 172, 254, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <option value="all">All Roles</option>
                        <option value="Director">Director</option>
                        <option value="Project Head">Project Head</option>
                        <option value="Employee">Employee</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <EmployeeList
                employees={filteredEmployees}
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

          {/* Approvals Tab - Modern Design - Director Only */}
          {activeTab === 'approvals' && isDirector && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '32px',
              width: '100%',
              maxWidth: '100%',
              paddingTop: '32px'
            }}>
              {/* Header - Ultra Modern */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                paddingBottom: '24px',
                borderBottom: '2px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px -5px rgba(240, 147, 251, 0.4)'
                  }}>
                    <CheckCircle size={28} color="#ffffff" />
                  </div>
                  <div>
                    <h1 style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: '0 0 6px 0',
                      letterSpacing: '-0.5px'
                    }}>Task Completion Approvals</h1>
                    <p style={{
                      fontSize: '15px',
                      color: '#6b7280',
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      Review and approve task completion requests
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Section - Modern Design */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative gradient background element */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '200px',
                  height: '200px',
                  background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.05) 0%, rgba(245, 87, 108, 0.05) 100%)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                  pointerEvents: 'none'
                }} />
                
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)'
                  }}>
                    <Filter size={20} color="#7c3aed" />
                  </div>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#111827',
                    letterSpacing: '-0.2px'
                  }}>
                    Filter by Status:
                  </label>
                  <select
                    value={approvalStatusFilter}
                    onChange={(e) => {
                      setApprovalStatusFilter(e.target.value as 'all' | 'Pending' | 'Approved' | 'Rejected');
                    }}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '12px',
                      border: '2px solid #e5e7eb',
                      fontSize: '14px',
                      color: '#111827',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center',
                      paddingRight: '40px',
                      fontWeight: '600'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#f5576c';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(245, 87, 108, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onMouseOver={(e) => {
                      if (document.activeElement !== e.currentTarget) {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (document.activeElement !== e.currentTarget) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Tasks Table */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb',
                overflowX: 'auto'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '24px'
                }}>Completion Requests</h2>
                {completionRequests.filter(task => approvalStatusFilter === 'all' || task.completionRequestStatus === approvalStatusFilter).length > 0 ? (
                  <table style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: 0
                  }}>
                    <thead>
                      <tr style={{
                        background: 'linear-gradient(to right, #f9fafb, #f3f4f6)'
                      }}>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '2px solid #e5e7eb'
                        }}>Employee</th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '2px solid #e5e7eb'
                        }}>Date</th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '2px solid #e5e7eb'
                        }}>Category</th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '2px solid #e5e7eb'
                        }}>Work Description</th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '2px solid #e5e7eb'
                        }}>Time Spent</th>
                        <th style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '2px solid #e5e7eb'
                        }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {independentWork
                        .filter(entry => independentWorkFilter === 'all' || entry.category === independentWorkFilter)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((entry, index) => (
                        <tr
                          key={entry.id || entry._id}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            transition: 'background-color 0.2s ease',
                            backgroundColor: '#ffffff'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          <td style={{
                            padding: '16px',
                            fontSize: '14px',
                            color: '#111827',
                            fontWeight: '500'
                          }}>
                            {entry.employeeName}
                          </td>
                          <td style={{
                            padding: '16px',
                            fontSize: '14px',
                            color: '#111827',
                            fontWeight: '500'
                          }}>
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{
                            padding: '16px'
                          }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: entry.category === 'Design' ? '#ddd6fe' :
                                            entry.category === 'Site' ? '#fef3c7' :
                                            entry.category === 'Office' ? '#dbeafe' :
                                            '#e5e7eb',
                              color: entry.category === 'Design' ? '#7c3aed' :
                                     entry.category === 'Site' ? '#92400e' :
                                     entry.category === 'Office' ? '#1e40af' :
                                     '#374151'
                            }}>
                              {entry.category}
                            </span>
                          </td>
                          <td style={{
                            padding: '16px',
                            fontSize: '14px',
                            color: '#374151',
                            maxWidth: '400px',
                            wordWrap: 'break-word'
                          }}>
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {entry.workDescription}
                            </div>
                          </td>
                          <td style={{
                            padding: '16px',
                            fontSize: '14px',
                            color: '#111827',
                            fontWeight: '500'
                          }}>
                            {entry.timeSpent} hours
                          </td>
                          <td style={{
                            padding: '16px',
                            textAlign: 'center'
                          }}>
                            <div style={{
                              display: 'flex',
                              gap: '8px',
                              justifyContent: 'center'
                            }}>
                              <button
                                onClick={() => handleViewEntry(entry)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = '#bfdbfe';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = '#dbeafe';
                                }}
                                title="View Details"
                              >
                                <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                              <button
                                onClick={() => handleEditEntry(entry)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fde68a';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fef3c7';
                                }}
                                title="Edit Entry"
                              >
                                <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id || entry._id || '')}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#fee2e2',
                                  color: '#991b1b',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fecaca';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fee2e2';
                                }}
                                title="Delete Entry"
                              >
                                <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    textAlign: 'center',
                    padding: '40px 0'
                  }}>
                    No independent work entries found.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* View Independent Work Entry Modal */}
          {viewingEntry && (
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
            onClick={() => setViewingEntry(null)}
            >
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#111827',
                    margin: 0
                  }}>View Entry Details</h2>
                  <button
                    onClick={() => setViewingEntry(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      color: '#6b7280',
                      padding: '4px'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px'
                }}>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Employee Name</label>
                    <p style={{
                      fontSize: '16px',
                      color: '#111827',
                      marginTop: '4px',
                      margin: 0
                    }}>
                      {viewingEntry.employeeName}
                    </p>
                  </div>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Date</label>
                    <p style={{
                      fontSize: '16px',
                      color: '#111827',
                      marginTop: '4px',
                      margin: 0
                    }}>
                      {new Date(viewingEntry.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Category</label>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: viewingEntry.category === 'Design' ? '#ddd6fe' :
                                      viewingEntry.category === 'Site' ? '#fef3c7' :
                                      viewingEntry.category === 'Office' ? '#dbeafe' :
                                      '#e5e7eb',
                        color: viewingEntry.category === 'Design' ? '#7c3aed' :
                               viewingEntry.category === 'Site' ? '#92400e' :
                               viewingEntry.category === 'Office' ? '#1e40af' :
                               '#374151'
                      }}>
                        {viewingEntry.category}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Time Spent</label>
                    <p style={{
                      fontSize: '16px',
                      color: '#111827',
                      marginTop: '4px',
                      margin: 0
                    }}>
                      {viewingEntry.timeSpent} hours
                    </p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Work Description</label>
                    <p style={{
                      fontSize: '16px',
                      color: '#374151',
                      marginTop: '4px',
                      margin: 0,
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {viewingEntry.workDescription}
                    </p>
                  </div>
                </div>

                {/* Comments Section */}
                <div style={{
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '24px',
                  marginTop: '24px'
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
                      <svg style={{ width: '20px', height: '20px', marginRight: '8px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Comments
                    </div>
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      backgroundColor: '#f3f4f6',
                      padding: '4px 8px',
                      borderRadius: '9999px'
                    }}>
                      {(viewingEntry.comments || []).length} comment{(viewingEntry.comments || []).length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  
                  {/* Attachments Section */}
                  {(viewingEntry.attachments && viewingEntry.attachments.length > 0) && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '12px'
                      }}>Attachments</h4>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {viewingEntry.attachments.map((attachment) => {
                          const handleDownload = () => {
                            const link = document.createElement('a');
                            link.href = attachment.fileData;
                            link.download = attachment.fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          };

                          return (
                            <div key={attachment.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                {attachment.fileType.startsWith('image/') ? (
                                  <img
                                    src={attachment.fileData}
                                    alt={attachment.fileName}
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      objectFit: 'cover',
                                      borderRadius: '4px'
                                    }}
                                  />
                                ) : (
                                  <span style={{ fontSize: '24px' }}>📄</span>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{
                                    margin: 0,
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#111827',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {attachment.fileName}
                                  </p>
                                  <p style={{
                                    margin: '4px 0 0 0',
                                    fontSize: '12px',
                                    color: '#6b7280'
                                  }}>
                                    {(attachment.fileSize / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={handleDownload}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#2563eb',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = '#2563eb';
                                }}
                              >
                                Download
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '16px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {(viewingEntry.comments || []).length > 0 ? (
                      (viewingEntry.comments || []).map((comment) => (
                        <div key={comment.id || comment._id} style={{
                          backgroundColor: '#f9fafb',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px'
                          }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                              {comment.userName}
                            </span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                            </span>
                          </div>
                          <p style={{
                            fontSize: '14px',
                            color: '#374151',
                            margin: 0,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {comment.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0, textAlign: 'center', padding: '16px 0' }}>
                        No comments yet.
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      <strong>Commenting as:</strong> {user?.name || user?.email || 'Director'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <textarea
                        value={independentWorkComment}
                        onChange={(e) => setIndependentWorkComment(e.target.value)}
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
                        onClick={handleAddIndependentWorkComment}
                        disabled={!independentWorkComment.trim()}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: !independentWorkComment.trim() ? '#9ca3af' : '#2563eb',
                          color: '#ffffff',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: !independentWorkComment.trim() ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.2s ease',
                          alignSelf: 'flex-end',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                        onMouseOver={(e) => {
                          if (independentWorkComment.trim()) {
                            e.currentTarget.style.backgroundColor = '#1d4ed8';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (independentWorkComment.trim()) {
                            e.currentTarget.style.backgroundColor = '#2563eb';
                          }
                        }}
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{
                  marginTop: '24px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => {
                      setViewingEntry(null);
                      setIndependentWorkComment('');
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Independent Work Entry Modal */}
          {editingEntry && (
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
              setEditingEntry(null);
              setEditForm({
                date: '',
                workDescription: '',
                category: 'Office',
                timeSpent: 0
              });
            }}
            >
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#111827',
                    margin: 0
                  }}>Edit Entry</h2>
                  <button
                    onClick={() => {
                      setEditingEntry(null);
                      setEditForm({
                        date: '',
                        workDescription: '',
                        category: 'Office',
                        timeSpent: 0
                      });
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      color: '#6b7280',
                      padding: '4px'
                    }}
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateEntry();
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Date *
                      </label>
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          outline: 'none',
                          fontSize: '14px',
                          fontFamily: 'inherit'
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
                        Category *
                      </label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value as 'Design' | 'Site' | 'Office' | 'Other' })}
                        required
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
                      >
                        <option value="Design">Design</option>
                        <option value="Site">Site</option>
                        <option value="Office">Office</option>
                        <option value="Other">Other</option>
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
                        Time Spent (hours) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editForm.timeSpent}
                        onChange={(e) => setEditForm({ ...editForm, timeSpent: parseFloat(e.target.value) || 0 })}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          outline: 'none',
                          fontSize: '14px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Work Description *
                      </label>
                      <textarea
                        value={editForm.workDescription}
                        onChange={(e) => setEditForm({ ...editForm, workDescription: e.target.value })}
                        required
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
                      />
                    </div>
                  </div>
                  <div style={{
                    marginTop: '24px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEntry(null);
                        setEditForm({
                          date: '',
                          workDescription: '',
                          category: 'Office',
                          timeSpent: 0
                        });
                      }}
                      style={{
                        padding: '8px 16px',
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
                      type="submit"
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Update Entry
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Approvals Tab - Modern Design (Correct Section) - Director Only */}
          {activeTab === 'approvals' && isDirector && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '32px',
              width: '100%',
              maxWidth: '100%',
              paddingTop: '32px'
            }}>
              {/* Header - Ultra Modern */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                paddingBottom: '24px',
                borderBottom: '2px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px -5px rgba(240, 147, 251, 0.4)'
                  }}>
                    <CheckCircle size={28} color="#ffffff" />
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <h1 style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: '0 0 6px 0',
                      letterSpacing: '-0.5px'
                    }}>Task Completion Approvals</h1>
                    <p style={{
                      fontSize: '15px',
                      color: '#6b7280',
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      Review and manage task completion requests from employees, including approval history
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Section - Modern Design */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative gradient background element */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '200px',
                  height: '200px',
                  background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.05) 0%, rgba(245, 87, 108, 0.05) 100%)',
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                  pointerEvents: 'none'
                }} />
                
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)'
                  }}>
                    <Filter size={20} color="#7c3aed" />
                  </div>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#111827',
                    letterSpacing: '-0.2px'
                  }}>
                    Filter by Status:
                  </label>
                  <select
                    value={approvalStatusFilter}
                    onChange={(e) => {
                      setApprovalStatusFilter(e.target.value as 'all' | 'Pending' | 'Approved' | 'Rejected');
                    }}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '12px',
                      border: '2px solid #e5e7eb',
                      fontSize: '14px',
                      color: '#111827',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center',
                      paddingRight: '40px',
                      fontWeight: '600'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#f5576c';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(245, 87, 108, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onMouseOver={(e) => {
                      if (document.activeElement !== e.currentTarget) {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (document.activeElement !== e.currentTarget) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {completionRequests.filter(task => approvalStatusFilter === 'all' || task.completionRequestStatus === approvalStatusFilter).length > 0 ? (
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  padding: '32px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '32px',
                    paddingBottom: '24px',
                    borderBottom: '2px solid #f3f4f6'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                      }}>
                        <FileText size={24} color="#7c3aed" />
                      </div>
                      <div>
                      <h2 style={{
                          fontSize: '24px',
                        fontWeight: '700',
                        color: '#111827',
                          margin: '0 0 4px 0',
                        letterSpacing: '-0.5px'
                      }}>Completion Requests</h2>
                        <p style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          margin: 0
                        }}>
                          Manage and review task completion requests
                        </p>
                      </div>
                    </div>
                    <div style={{
                      padding: '8px 20px',
                      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#374151',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                    }}>
                      {completionRequests.filter(task => approvalStatusFilter === 'all' || task.completionRequestStatus === approvalStatusFilter).length} request{completionRequests.filter(task => approvalStatusFilter === 'all' || task.completionRequestStatus === approvalStatusFilter).length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'separate',
                      borderSpacing: '0 12px',
                      minWidth: '1000px'
                    }}>
                      <thead>
                        <tr style={{ 
                          background: 'transparent'
                        }}>
                          <th style={{
                            padding: '12px 20px',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                          }}>Task Title</th>
                          <th style={{
                            padding: '12px 20px',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                          }}>Employee</th>
                          <th style={{
                            padding: '12px 20px',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                          }}>Requested Date</th>
                          <th style={{
                            padding: '12px 20px',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                          }}>Priority</th>
                          <th style={{
                            padding: '12px 20px',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                          }}>Status</th>
                          <th style={{
                            padding: '12px 20px',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                          }}>Response Date</th>
                          <th style={{
                            padding: '12px 20px',
                            textAlign: 'center',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                          }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completionRequests
                          .filter(task => approvalStatusFilter === 'all' || task.completionRequestStatus === approvalStatusFilter)
                          .map((task) => (
                          <tr
                            key={task.id || task._id}
                            style={{
                              backgroundColor: '#ffffff',
                              borderRadius: '12px',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                              border: '1px solid #e5e7eb'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                          >
                            <td style={{
                              padding: '20px',
                              fontSize: '15px',
                              color: '#111827',
                              fontWeight: '600',
                              letterSpacing: '-0.2px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2)'
                                }}>
                                  <FileText size={18} color="#7c3aed" />
                                </div>
                                <span style={{ fontWeight: '600' }}>{task.title}</span>
                              </div>
                            </td>
                            <td style={{
                              padding: '20px',
                              fontSize: '14px',
                              color: '#111827',
                              fontWeight: '500'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <UserIcon size={16} color="#1e40af" />
                                </div>
                                <span>{task.assignedToName || 'N/A'}</span>
                              </div>
                            </td>
                            <td style={{
                              padding: '20px',
                              fontSize: '14px',
                              color: '#374151',
                              fontWeight: '500'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <Calendar size={16} color="#92400e" />
                                </div>
                                <span>{task.completionRequestDate ? new Date(task.completionRequestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                              </div>
                            </td>
                            <td style={{
                              padding: '20px'
                            }}>
                              <span style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: '700',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                backgroundColor: task.priority === 'Urgent' ? '#fee2e2' :
                                              task.priority === 'Less Urgent' ? '#fef3c7' :
                                              '#dbeafe',
                                color: task.priority === 'Urgent' ? '#991b1b' :
                                       task.priority === 'Less Urgent' ? '#92400e' :
                                       '#1e40af',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                                display: 'inline-block'
                              }}>
                                {task.priority}
                              </span>
                            </td>
                            <td style={{
                              padding: '20px'
                            }}>
                              <span style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: '700',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                backgroundColor: task.completionRequestStatus === 'Approved' ? '#d1fae5' :
                                              task.completionRequestStatus === 'Rejected' ? '#fee2e2' :
                                              '#fef3c7',
                                color: task.completionRequestStatus === 'Approved' ? '#065f46' :
                                       task.completionRequestStatus === 'Rejected' ? '#991b1b' :
                                       '#92400e',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                                display: 'inline-block'
                              }}>
                                {task.completionRequestStatus || 'Pending'}
                              </span>
                            </td>
                            <td style={{
                              padding: '20px',
                              fontSize: '14px',
                              color: '#374151',
                              fontWeight: '500'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <Calendar size={16} color="#4f46e5" />
                                </div>
                                <span>{task.completionResponseDate ? new Date(task.completionResponseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                              </div>
                            </td>
                            <td style={{
                              padding: '20px',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                display: 'flex',
                                gap: '8px',
                                justifyContent: 'center',
                                flexWrap: 'wrap'
                              }}>
                                <button
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setIsTaskModalOpen(true);
                                  }}
                                  style={{
                                    padding: '10px 16px',
                                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                                    color: '#1e40af',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.25)'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)';
                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.35)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.25)';
                                  }}
                                  title="View Task Details"
                                >
                                  <Eye size={16} />
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setIsTaskModalOpen(true);
                                  }}
                                  style={{
                                    padding: '10px 16px',
                                    background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                                    color: '#16a34a',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)';
                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(22, 163, 74, 0.35)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(22, 163, 74, 0.25)';
                                  }}
                                  title="Edit Task"
                                >
                                  <Edit size={16} />
                                  Edit
                                </button>
                                {task.completionRequestStatus === 'Pending' && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm(`Approve completion request for "${task.title}"?`)) return;
                                        try {
                                          const taskId = task.id || task._id;
                                          if (!taskId || !user?.id) return;
                                          await taskApi.handleCompletionApproval(taskId, 'approve', user.id);
                                          await loadCompletionRequests();
                                          await loadTasks();
                                        } catch (error: any) {
                                          console.error('Error approving completion:', error);
                                          alert('Error approving completion request. Please try again.');
                                        }
                                      }}
                                      style={{
                                        padding: '10px 18px',
                                        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                                        color: '#065f46',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)';
                                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(22, 163, 74, 0.35)';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(22, 163, 74, 0.25)';
                                      }}
                                      title="Approve"
                                    >
                                      <CheckCircle size={16} />
                                      Approve
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm(`Reject completion request for "${task.title}"?`)) return;
                                        try {
                                          const taskId = task.id || task._id;
                                          if (!taskId || !user?.id) return;
                                          await taskApi.handleCompletionApproval(taskId, 'reject', user.id);
                                          await loadCompletionRequests();
                                          await loadTasks();
                                        } catch (error: any) {
                                          console.error('Error rejecting completion:', error);
                                          alert('Error rejecting completion request. Please try again.');
                                        }
                                      }}
                                      style={{
                                        padding: '10px 18px',
                                        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                                        color: '#991b1b',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)';
                                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(220, 38, 38, 0.35)';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.25)';
                                      }}
                                      title="Reject"
                                    >
                                      <X size={16} />
                                      Reject
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Are you sure you want to delete the task "${task.title}"? This action cannot be undone.`)) return;
                                    try {
                                      const taskId = task.id || task._id;
                                      if (!taskId) return;
                                      await taskApi.deleteTask(taskId);
                                      // Close modal if the deleted task is currently open
                                      if (selectedTask && (selectedTask.id === taskId || selectedTask._id === taskId)) {
                                        setIsTaskModalOpen(false);
                                        setSelectedTask(null);
                                      }
                                      await loadCompletionRequests();
                                      await loadTasks();
                                    } catch (error: any) {
                                      console.error('Error deleting task:', error);
                                      alert('Error deleting task. Please try again.');
                                    }
                                  }}
                                  style={{
                                    padding: '8px 14px',
                                    backgroundColor: '#fee2e2',
                                    color: '#991b1b',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fecaca';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(220, 38, 38, 0.3)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fee2e2';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(220, 38, 38, 0.2)';
                                  }}
                                  title="Delete Task"
                                >
                                  <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '40px',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px'
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      margin: '0 auto 24px',
                      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                      <FileText size={40} color="#9ca3af" />
                    </div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: '0 0 8px 0'
                    }}>
                      No Completion Requests
                    </h3>
                  <p style={{
                      fontSize: '15px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                      {approvalStatusFilter !== 'all' 
                        ? `No requests found with status "${approvalStatusFilter}" at this time.`
                        : 'No completion requests have been submitted yet.'}
                  </p>
                  </div>
                </div>
              )}
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

      {isProjectModalOpen && selectedProject && (
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
                await updateProject(projectId, project);
                await loadProjects();
              }
            } catch (error: any) {
              console.error('Error updating project:', error);
              throw error;
            }
          }}
          onDelete={async (projectId: string) => {
            try {
              await deleteProject(projectId);
              await loadProjects();
              setIsProjectModalOpen(false);
              setSelectedProject(null);
            } catch (error: any) {
              console.error('Error deleting project:', error);
              throw error;
            }
          }}
          users={employees}
        />
      )}
    </div>
  );
};

export default Dashboard;

