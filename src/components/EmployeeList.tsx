'use client'

import React, { useState } from 'react';
import { Edit, Eye, Trash2, Plus, Download, Users, Mail, Phone, Briefcase, Building2 } from 'lucide-react';
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
      {/* Header with Actions - Modern Design */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '20px',
        borderBottom: '2px solid #f3f4f6'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(79, 172, 254, 0.3)'
            }}>
              <Users size={20} color="#ffffff" />
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#111827',
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              Employees
            </h1>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0,
            paddingLeft: '52px'
          }}>
            {canCreateEmployee ? 'Full access - Create, Edit, Delete employees' : 
             'View only - No editing permissions'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={exportEmployees}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ffffff',
              color: '#374151',
              borderRadius: '10px',
              border: '2px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
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
            }}
          >
            <Download size={16} />
            Export
          </button>
          {canCreateEmployee && (
            <button
              onClick={handleCreateEmployee}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
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
              <Plus size={18} />
              New Employee
            </button>
          )}
        </div>
      </div>

      {/* Employees Table - Modern Design */}
      <div style={{
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            minWidth: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0
          }}>
            <thead style={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <tr>
                <th style={{
                  padding: '16px 24px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#374151',
                  letterSpacing: '-0.3px',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  Name
                </th>
                <th style={{
                  padding: '16px 24px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#374151',
                  letterSpacing: '-0.3px',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  Position
                </th>
                <th style={{
                  padding: '16px 24px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#374151',
                  letterSpacing: '-0.3px',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  Department
                </th>
                <th style={{
                  padding: '16px 24px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#374151',
                  letterSpacing: '-0.3px',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  Email
                </th>
                <th style={{
                  padding: '16px 24px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#374151',
                  letterSpacing: '-0.3px',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  Phone
                </th>
                <th style={{
                  padding: '16px 24px',
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
                  padding: '16px 24px',
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
            <tbody style={{ backgroundColor: '#ffffff' }}>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                      }}>
                        <Users size={32} color="#9ca3af" />
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        No employees found
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        {canCreateEmployee ? 'Create your first employee to get started' : 'No employees available'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((employee, index) => (
                  <tr key={employee.id} style={{
                    borderBottom: index < employees.length - 1 ? '1px solid #f3f4f6' : 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.transform = 'scale(1.002)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <td style={{
                      padding: '20px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                          flexShrink: 0
                        }}>
                          <Users size={20} color="#16a34a" />
                        </div>
                        <div>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#111827',
                            letterSpacing: '-0.3px',
                            marginBottom: '4px'
                          }}>
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}>
                            @{employee.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{
                      padding: '20px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Briefcase size={16} color="#6b7280" style={{ flexShrink: 0 }} />
                        <span style={{
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '600'
                        }}>
                          {employee.position}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      padding: '20px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={16} color="#6b7280" style={{ flexShrink: 0 }} />
                        <span style={{
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '600'
                        }}>
                          {employee.department}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      padding: '20px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={16} color="#6b7280" style={{ flexShrink: 0 }} />
                        <span style={{
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '500'
                        }}>
                          {employee.email}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      padding: '20px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={16} color="#6b7280" style={{ flexShrink: 0 }} />
                        <span style={{
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '500'
                        }}>
                          {employee.phone}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      padding: '20px 24px',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{
                        padding: '8px 16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase',
                        borderRadius: '10px',
                        backgroundColor: employee.status === 'Active' ? '#d1fae5' :
                                        employee.status === 'Inactive' ? '#fee2e2' :
                                        employee.status === 'On Leave' ? '#fef3c7' : '#f3f4f6',
                        color: employee.status === 'Active' ? '#065f46' :
                               employee.status === 'Inactive' ? '#991b1b' :
                               employee.status === 'On Leave' ? '#92400e' : '#374151',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                      }}>
                        {employee.status}
                      </span>
                    </td>
                    <td style={{
                      padding: '20px 24px',
                      whiteSpace: 'nowrap',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleViewEmployee(employee)}
                          style={{
                            color: '#2563eb',
                            backgroundColor: '#dbeafe',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.color = '#1d4ed8';
                            e.currentTarget.style.backgroundColor = '#bfdbfe';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.color = '#2563eb';
                            e.currentTarget.style.backgroundColor = '#dbeafe';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(59, 130, 246, 0.2)';
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
                              backgroundColor: '#dcfce7',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.color = '#15803d';
                              e.currentTarget.style.backgroundColor = '#bbf7d0';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 6px rgba(22, 163, 74, 0.3)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.color = '#16a34a';
                              e.currentTarget.style.backgroundColor = '#dcfce7';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(22, 163, 74, 0.2)';
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
                              backgroundColor: '#fee2e2',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.color = '#b91c1c';
                              e.currentTarget.style.backgroundColor = '#fecaca';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 6px rgba(220, 38, 38, 0.3)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.color = '#dc2626';
                              e.currentTarget.style.backgroundColor = '#fee2e2';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(220, 38, 38, 0.2)';
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
