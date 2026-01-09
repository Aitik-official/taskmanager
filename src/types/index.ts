export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Director' | 'Project Head' | 'Employee';
  avatar?: string;
}

export interface ProjectRemark {
  date: string;
  remark: string;
}

export interface Project {
  id?: string; // Optional for frontend compatibility
  _id?: string; // MongoDB ID field
  name: string;
  projectNumber?: string; // e.g., 2025-001 / 2025-002 / 2025-003
  location?: string;
  description: string;
  contactDetails?: string;
  projectRemarks?: ProjectRemark[]; // Date-wise remarks
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status: 'Current' | 'Upcoming' | 'Sleeping (On Hold)' | 'Completed';
  startDate?: string;
  progress?: number;
  comments?: ProjectComment[];
  createdAt?: string;
  updatedAt?: string;
  isEmployeeCreated?: boolean; // Flag to identify projects created by employees from employee dashboard
  flagDirectorInputRequired?: boolean; // Flag when staff needs clarification, approval, or input
}

export interface ProjectComment {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  timestamp: string;
  isVisibleToEmployee: boolean;
}

export interface Employee {
  id?: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  joiningDate: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  username: string;
  password: string;
  role: 'Director' | 'Project Head' | 'Employee';
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id?: string; // Optional for frontend compatibility
  _id?: string; // MongoDB ID field (Auto-generated)
  title: string;
  description: string;
  projectId?: string; // Optional - not required in new spec
  projectName?: string; // Optional - not required in new spec
  assignedToId: string; // Keep for backward compatibility - will use first employee if multiple assigned
  assignedToName: string; // Keep for backward compatibility - will use first employee if multiple assigned
  assignedEmployeeIds?: string[]; // Array of assigned employee IDs
  assignedEmployeeNames?: string[]; // Array of assigned employee names
  assignedById: string;
  assignedByName: string;
  projectHeadId?: string; // Optional - Project Head assigned to the task
  projectHeadName?: string; // Optional - Project Head name
  priority: 'Urgent' | 'Less Urgent' | 'Free Time' | 'Custom';
  status: 'Pending' | 'In Progress' | 'Completed';
  estimatedHours?: number; // Optional - not required in new spec
  actualHours?: number;
  startDate?: string; // Keep for backward compatibility
  dueDate: string;
  completedDate?: string;
  isLocked: boolean;
  comments: Comment[];
  rating?: number;
  ratingComment?: string;
  directorRating?: boolean | number | 'Yes' | 'No'; // Boolean / Star / Yes-No, visible only to Director
  newDeadlineProposal?: string;
  reasonForExtension?: string;
  extensionRequestStatus?: 'Pending' | 'Approved' | 'Rejected';
  extensionRequestDate?: string;
  extensionResponseDate?: string;
  extensionResponseBy?: string;
  extensionResponseComment?: string;
  completionRequestStatus?: 'Pending' | 'Approved' | 'Rejected';
  completionRequestDate?: string;
  completionRequestedBy?: string;
  completionResponseDate?: string;
  completionResponseBy?: string;
  completionResponseComment?: string;
  isEmployeeCreated?: boolean; // Flag to identify tasks created by employees from employee dashboard
  workDone?: number; // Percentage of work done (0-100)
  flagDirectorInputRequired?: boolean; // Flag when staff needs clarification, approval, or input
  reminderDate?: string; // Date when the assigned employee should receive a reminder for this task
  reminderDates?: string[]; // Multiple dates for reminders
  weeklyReminders?: string[]; // Array of days for weekly reminders (e.g., ["Monday", "Friday"])
}

export interface Comment {
  id?: string; // Optional for frontend compatibility
  _id?: string; // MongoDB ID field
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  isVisibleToEmployee: boolean;
}

export interface IndependentWorkComment {
  id?: string;
  _id?: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

export interface TaskFilter {
  projectId?: string;
  employeeId?: string;
  priority?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  totalProjects: number;
  activeProjects: number;
  activeEmployees: number;
}

export interface IndependentWorkAttachment {
  id?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string; // base64 encoded file data
  uploadedAt: string;
}

export interface IndependentWork {
  id?: string;
  _id?: string; // MongoDB ID field
  employeeId: string;
  employeeName: string;
  date: string;
  workDescription: string;
  category: 'Design' | 'Site' | 'Office' | 'Other';
  timeSpent: number; // in hours
  comments?: IndependentWorkComment[];
  attachments?: IndependentWorkAttachment[];
  createdAt?: string;
  updatedAt?: string;
}
