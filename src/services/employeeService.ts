import axios from 'axios';
import { Employee } from '../types';

const API_BASE_URL = '/api';

// Get all employees
export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/employees`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

// Get employee by ID
export const getEmployeeById = async (id: string, email?: string): Promise<Employee> => {
  try {
    // If email is provided, add it as a query parameter
    const url = email 
      ? `${API_BASE_URL}/employees/${id}?email=${encodeURIComponent(email)}`
      : `${API_BASE_URL}/employees/${id}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching employee:', error);
    throw error;
  }
};

// Create new employee
export const createEmployee = async (employee: Omit<Employee, 'id' | '_id'>): Promise<Employee> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/employees`, employee);
    return response.data;
  } catch (error: any) {
    console.error('Error creating employee:', error);
    throw error;
  }
};

// Update employee
export const updateEmployee = async (id: string, employee: Partial<Employee>, email?: string): Promise<Employee> => {
  try {
    // If email is provided, add it as a query parameter
    const url = email 
      ? `${API_BASE_URL}/employees/${id}?email=${encodeURIComponent(email)}`
      : `${API_BASE_URL}/employees/${id}`;
    const response = await axios.put(url, employee);
    return response.data;
  } catch (error: any) {
    console.error('Error updating employee:', error);
    throw error;
  }
};

// Delete employee
export const deleteEmployee = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/employees/${id}`);
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

// Employee login
export const employeeLogin = async (email: string, password: string): Promise<Employee> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/employees/login`, { email, password });
    return response.data;
  } catch (error: any) {
    console.error('Error logging in employee:', error);
    throw error;
  }
};
