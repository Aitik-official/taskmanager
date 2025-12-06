export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Director' | 'Project Head' | 'Employee';
  avatar?: string;
}

export interface Project {
  id?: string; // Optional for frontend compatibility
  _id?: string; // MongoDB ID field
  name: string;
  description: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  status: 'Active' | 'Completed' | 'On Hold';
  startDate: string;
  progress: number;
  comments?: ProjectComment[];
  createdAt?: string;
  updatedAt?: string;
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
  _id?: string; // MongoDB ID field
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  assignedToId: string;
  assignedToName: string;
  assignedById: string;
  assignedByName: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  estimatedHours: number;
  actualHours?: number;
  startDate: string;
  completedDate?: string;
  isLocked: boolean;
  comments: Comment[];
  rating?: number;
  ratingComment?: string;
  newDeadlineProposal?: string;
  reasonForExtension?: string;
  extensionRequestStatus?: 'Pending' | 'Approved' | 'Rejected';
  extensionRequestDate?: string;
  extensionResponseDate?: string;
  extensionResponseBy?: string;
  extensionResponseComment?: string;
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
