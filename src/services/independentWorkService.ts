import axios from 'axios';
import { IndependentWork } from '../types';

const API_BASE_URL = '/api';

// Get all independent work entries
export const getAllIndependentWork = async (): Promise<IndependentWork[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/independent-work`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching independent work:', error);
    throw error;
  }
};

// Get independent work by employee ID
export const getIndependentWorkByEmployee = async (employeeId: string): Promise<IndependentWork[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/independent-work/employee/${employeeId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching employee independent work:', error);
    throw error;
  }
};

// Create new independent work entry
export const createIndependentWork = async (work: Omit<IndependentWork, 'id' | '_id' | 'createdAt' | 'updatedAt'>): Promise<IndependentWork> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/independent-work`, work);
    return response.data;
  } catch (error: any) {
    console.error('Error creating independent work:', error);
    throw error;
  }
};

// Update independent work entry
export const updateIndependentWork = async (id: string, work: Partial<IndependentWork>): Promise<IndependentWork> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/independent-work/${id}`, work);
    return response.data;
  } catch (error: any) {
    console.error('Error updating independent work:', error);
    throw error;
  }
};

// Delete independent work entry
export const deleteIndependentWork = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/independent-work/${id}`);
  } catch (error: any) {
    console.error('Error deleting independent work:', error);
    throw error;
  }
};

// Get single independent work entry by ID
export const getIndependentWorkById = async (id: string): Promise<IndependentWork> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/independent-work/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching independent work by id:', error);
    throw error;
  }
};

// Add comment to independent work entry
export const addComment = async (id: string, comment: { userId: string; userName: string; content: string }): Promise<IndependentWork> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/independent-work/${id}/comments`, comment);
    return response.data;
  } catch (error: any) {
    console.error('Error adding comment to independent work:', error);
    throw error;
  }
};

