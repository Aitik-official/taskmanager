import axios from 'axios';
import { Project } from '../types';

const API_BASE_URL = '/api';

// Get all projects
export const getProjects = async (): Promise<Project[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

// Get project by ID
export const getProjectById = async (id: string): Promise<Project> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching project:', error);
    throw error;
  }
};

// Create new project
export const createProject = async (project: Omit<Project, 'id' | '_id'>): Promise<Project> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/projects`, project);
    return response.data;
  } catch (error: any) {
    console.error('Error creating project:', error);
    throw error;
  }
};

// Update project
export const updateProject = async (id: string, project: Partial<Project>): Promise<Project> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/projects/${id}`, project);
    return response.data;
  } catch (error: any) {
    console.error('Error updating project:', error);
    throw error;
  }
};

// Delete project
export const deleteProject = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/projects/${id}`);
  } catch (error: any) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

// Add comment to project
export const addProjectComment = async (projectId: string, comment: {
  userId: string;
  userName: string;
  userRole: string;
  content: string;
}): Promise<Project> => {
  try {
    const url = `${API_BASE_URL}/projects/${projectId}/comments`;
    console.log('🌐 Sending comment request to:', url);
    console.log('📤 Comment data:', comment);
    console.log('🔑 Project ID type:', typeof projectId);
    console.log('🔑 Project ID value:', projectId);
    
    const response = await axios.post(url, comment);
    console.log('✅ Comment response received:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error adding comment to project:', error);
    if (error.response) {
      console.error('📊 Response error:', error.response.data);
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response headers:', error.response.headers);
    }
    throw error;
  }
};
