'use client'

import React, { useState } from 'react';
import { Edit, Eye, Trash2, Plus, Download } from 'lucide-react';
import { Employee, Project, Task } from '../types';
import EmployeeModal from './EmployeeModal';
import { useAuth } from '../contexts/AuthContext';

interface EmployeeListProps {
  employees: Employee[];
  projects?: Project[];
  tasks?: Task[];
  onEmployeeSave: (employee: Employee, assignmentData?: any) => void;
  onEmployeeDelete: (employeeId: string) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  projects,
  tasks,
  onEmployeeSave,
  onEmployeeDelete
}) => {
  // Debug logging for employees prop changes
  React.useEffect(() => {
    console.log('🔄 EmployeeList: Employees prop updated');
    console.log('📊 Number of employees:', employees.length);
    console.log('👥 Employee details:', employees.map(emp => ({
      name: `${emp.firstName} ${emp.lastName}`,
      role: emp.role,
      department: emp.department
    })));
  }, [employees]);
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');

  const handleCreateEmployee = () => {
    setSelectedEmployee(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    onEmployeeDelete(employeeId);
  };

  const handleEmployeeSave = async (employee: Employee, assignmentData?: any) => {
    try {
      console.log('🔄 EmployeeList: Starting employee save...');
      console.log('📤 Employee data to save:', employee);
      console.log('📋 Assignment data:', assignmentData);
      
      await onEmployeeSave(employee, assignmentData);
      console.log('✅ EmployeeList: Employee saved successfully');
      
      setIsModalOpen(false);
      console.log('✅ EmployeeList: Modal closed');
    } catch (error: any) {
      console.error('❌ EmployeeList: Error saving employee:', error);
      // Keep modal open if there's an error
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const canCreateEmployee = user?.role === 'Director';
  const canEditEmployee = user?.role === 'Director';
  const canDeleteEmployee = user?.role === 'Director';

  const getStatusColor = (status: Employee['status']) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-red-100 text-red-800';
      case 'On Leave': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const exportEmployees = () => {
    const csvContent = [
      ['Name', 'Position', 'Department', 'Email', 'Phone', 'Status', 'Username', 'Role', 'Joining Date'],
      ...employees.map(employee => [
        `${employee.firstName} ${employee.lastName}`,
        employee.position,
        employee.department,
        employee.email,
        employee.phone,
        employee.status,
        employee.username,
        employee.role,
        formatDate(employee.joiningDate)
      ])
    ];

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Actions */}
      <div style={{
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
            Employees
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginTop: '4px',
            margin: 0
          }}>
            {canCreateEmployee ? 'Full access - Create, Edit, Delete employees' : 
             'View only - No editing permissions'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={exportEmployees}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4b5563',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#4b5563';
            }}
          >
            <Download size={16} />
            Export
          </button>
          {canCreateEmployee && (
            <button
              onClick={handleCreateEmployee}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
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
              <Plus size={16} />
              New Employee
            </button>
          )}
        </div>
      </div>

      {/* Employees Table */}
      <div style={{
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            minWidth: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0
          }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Name
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Position
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Department
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Email
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Phone
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Status
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: '#ffffff' }}>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{
                    padding: '16px 24px',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    No employees found
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} style={{
                    borderBottom: '1px solid #e5e7eb',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}>
                    <td style={{
                      padding: '16px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#111827'
                        }}>
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          @{employee.username}
                        </div>
                      </div>
                    </td>
                    <td style={{
                      padding: '16px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#111827'
                      }}>
                        {employee.position}
                      </div>
                    </td>
                    <td style={{
                      padding: '16px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#111827'
                      }}>
                        {employee.department}
                      </div>
                    </td>
                    <td style={{
                      padding: '16px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#111827'
                      }}>
                        {employee.email}
                      </div>
                    </td>
                    <td style={{
                      padding: '16px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#111827'
                      }}>
                        {employee.phone}
                      </div>
                    </td>
                    <td style={{
                      padding: '16px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{
                        padding: '4px 8px',
                        display: 'inline-flex',
                        fontSize: '12px',
                        lineHeight: '1.25',
                        fontWeight: '600',
                        borderRadius: '9999px',
                        backgroundColor: employee.status === 'Active' ? '#dcfce7' :
                                        employee.status === 'Inactive' ? '#fecaca' :
                                        employee.status === 'On Leave' ? '#fef3c7' : '#f3f4f6',
                        color: employee.status === 'Active' ? '#166534' :
                               employee.status === 'Inactive' ? '#dc2626' :
                               employee.status === 'On Leave' ? '#92400e' : '#374151'
                      }}>
                        {employee.status}
                      </span>
                    </td>
                    <td style={{
                      padding: '16px 24px',
                      whiteSpace: 'nowrap',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleViewEmployee(employee)}
                          style={{
                            color: '#2563eb',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.color = '#1d4ed8';
                            e.currentTarget.style.backgroundColor = '#dbeafe';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.color = '#2563eb';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="View Employee"
                        >
                          <Eye size={16} />
                        </button>
                        {canEditEmployee && employee.id && (
                          <button
                            onClick={() => handleEditEmployee(employee)}
                            style={{
                              color: '#16a34a',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.color = '#15803d';
                              e.currentTarget.style.backgroundColor = '#dcfce7';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.color = '#16a34a';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="Edit Employee"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {canDeleteEmployee && employee.id && (
                          <button
                            onClick={() => handleDeleteEmployee(employee.id!)}
                            style={{
                              color: '#dc2626',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.color = '#b91c1c';
                              e.currentTarget.style.backgroundColor = '#fecaca';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.color = '#dc2626';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="Delete Employee"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {!canEditEmployee && !canDeleteEmployee && (
                          <span style={{
                            fontSize: '12px',
                            color: '#9ca3af',
                            padding: '4px 8px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px'
                          }}>
                            View Only
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Modal */}
      <EmployeeModal
        employee={modalMode === 'create' ? null : selectedEmployee}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleEmployeeSave}
        onDelete={canDeleteEmployee ? handleDeleteEmployee : undefined}
        projects={projects}
        tasks={tasks}
      />
    </div>
  );
};

export default EmployeeList;
