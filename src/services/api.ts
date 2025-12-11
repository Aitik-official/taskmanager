import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const taskApi = {
  // Get all tasks
  getAllTasks: async () => {
    const response = await api.get('/tasks');
    return response.data;
  },

  // Get tasks by user role
  getTasksByUser: async (userId: string, role: string) => {
    const response = await api.get(`/tasks/user/${userId}?role=${role}`);
    return response.data;
  },

  // Create a new task
  createTask: async (taskData: any) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  // Update a task
  updateTask: async (taskId: string, taskData: any) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },

  // Delete a task
  deleteTask: async (taskId: string) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },

  // Get extension requests
  getExtensionRequests: async () => {
    const response = await api.get('/extension-requests');
    return response.data;
  },

  // Update extension request status
  updateExtensionStatus: async (taskId: string, status: string, responseComment: string, respondedBy: string) => {
    const response = await api.put(`/tasks/${taskId}/extension-status`, {
      status,
      responseComment,
      respondedBy
    });
    return response.data;
  },

  // Add comment to task
  addComment: async (taskId: string, content: string, userId: string, userName: string) => {
    const response = await api.post(`/tasks/${taskId}/comments`, {
      content,
      userId,
      userName
    });
    return response.data;
  },

  // Request task completion
  requestTaskCompletion: async (taskId: string, requestedBy: string) => {
    const response = await api.post(`/tasks/${taskId}/completion-request`, {
      requestedBy
    });
    return response.data;
  },

  // Get all completion requests
  getCompletionRequests: async (status?: 'all' | 'Pending' | 'Approved' | 'Rejected') => {
    const url = status && status !== 'all' 
      ? `/tasks/completion-requests?status=${status}`
      : '/tasks/completion-requests?status=all';
    const response = await api.get(url);
    return response.data;
  },

  // Approve or reject completion request
  handleCompletionApproval: async (taskId: string, action: 'approve' | 'reject', approvedBy: string, comment?: string) => {
    const response = await api.post(`/tasks/${taskId}/completion-approval`, {
      action,
      approvedBy,
      comment
    });
    return response.data;
  },
};

export default api;
