'use client'

import React, { useState } from 'react';
import { Edit, Eye, Trash2, Plus, Download } from 'lucide-react';
import { Project, User, Employee } from '../types';
import ProjectModal from './ProjectModal';
import { useAuth } from '../contexts/AuthContext';

interface ProjectListProps {
  projects: Project[];
  users: (User | Employee)[];
  onProjectSave: (project: Project) => void;
  onProjectDelete: (projectId: string) => void;
  onProjectComplete?: (project: Project) => void;
  onCommentAdded?: (projectId: string, comment: any) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  users,
  onProjectSave,
  onProjectDelete,
  onProjectComplete,
  onCommentAdded
}) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');

  const handleCreateProject = () => {
    setSelectedProject(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    onProjectDelete(projectId);
  };

  const handleProjectSave = async (project: Project) => {
    try {
      await onProjectSave(project);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving project:', error);
      // Keep modal open if there's an error
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const canCreateProject = user?.role === 'Director';
  // Allow employees to edit/delete projects they created themselves
  const canEditProject = user?.role === 'Director' || (user?.role === 'Employee' && projects.some(p => p.isEmployeeCreated));
  const canDeleteProject = user?.role === 'Director' || (user?.role === 'Employee' && projects.some(p => p.isEmployeeCreated));

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Current': return 'bg-green-100 text-green-800';
      case 'Upcoming': return 'bg-blue-100 text-blue-800';
      case 'Sleeping (On Hold)': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const exportProjects = () => {
    const csvContent = [
      ['Project Name', 'Assigned Employee', 'Start Date', 'Progress', 'Status', 'Description'],
      ...projects.map(project => [
        project.name,
        project.assignedEmployeeName,
        formatDate(project.startDate),
        `${project.progress}%`,
        project.status,
        project.description
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Projects
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '4px',
              margin: 0
            }}>
              {user?.role === 'Director' ? 'Full access - Create, Edit, Delete' : 
               user?.role === 'Project Head' ? 'View only - No editing permissions' : 
               'View only - Employee access'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={exportProjects}
              style={{
                padding: '8px 16px',
                color: '#374151',
                backgroundColor: '#f3f4f6',
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
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
            >
              <Download size={16} />
              Export
            </button>
            {canCreateProject && (
              <button
                onClick={handleCreateProject}
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
                New Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Projects Table */}
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
                Project Name
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
                Project Number
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
                Location
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
                Project Description (in short)
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
                Contact Details
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
            {projects.length === 0 ? (
              <tr>
                <td colSpan={7} style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
                  <p style={{ margin: 0, fontSize: '16px' }}>No projects found</p>
                  {canCreateProject && (
                    <button
                      onClick={handleCreateProject}
                      style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
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
                      Create Your First Project
                    </button>
                  )}
                  {!canCreateProject && (
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginTop: '8px',
                      margin: 0
                    }}>
                      Only Directors can create new projects
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.id} style={{
                  borderBottom: '1px solid #e5e7eb',
                  transition: 'background-color 0.2s ease',
                  backgroundColor: project.flagDirectorInputRequired ? '#dc2626' : '#ffffff'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = project.flagDirectorInputRequired ? '#b91c1c' : '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = project.flagDirectorInputRequired ? '#dc2626' : '#ffffff';
                }}>
                  {/* Project Name */}
                  <td style={{
                    padding: '16px 24px',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#111827'
                    }}>
                      {project.name || '-'}
                    </div>
                  </td>
                  {/* Project Number */}
                  <td style={{
                    padding: '16px 24px',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#111827'
                    }}>
                      {project.projectNumber || '-'}
                    </div>
                  </td>
                  {/* Location */}
                  <td style={{
                    padding: '16px 24px',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#111827'
                    }}>
                      {project.location || '-'}
                    </div>
                  </td>
                  {/* Status */}
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
                      backgroundColor: project.status === 'Current' ? '#dcfce7' :
                                      project.status === 'Upcoming' ? '#dbeafe' :
                                      project.status === 'Completed' ? '#dbeafe' :
                                      project.status === 'Sleeping (On Hold)' ? '#fef3c7' : '#f3f4f6',
                      color: project.status === 'Current' ? '#166534' :
                             project.status === 'Upcoming' ? '#1e40af' :
                             project.status === 'Completed' ? '#1e40af' :
                             project.status === 'Sleeping (On Hold)' ? '#92400e' : '#374151'
                    }}>
                      {project.status || '-'}
                    </span>
                  </td>
                  {/* Project Description (in short) */}
                  <td style={{
                    padding: '16px 24px',
                    whiteSpace: 'normal',
                    maxWidth: '300px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: '1.4'
                    }}>
                      {project.description || '-'}
                    </div>
                  </td>
                  {/* Contact Details */}
                  <td style={{
                    padding: '16px 24px',
                    whiteSpace: 'normal',
                    maxWidth: '250px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: '1.4'
                    }}>
                      {project.contactDetails || '-'}
                    </div>
                  </td>
                  <td style={{
                    padding: '16px 24px',
                    whiteSpace: 'nowrap',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={async () => {
                          const projectId = project.id || project._id;
                          if (!projectId) return;
                          
                          const updatedProject = {
                            ...project,
                            flagDirectorInputRequired: !project.flagDirectorInputRequired
                          };
                          await onProjectSave(updatedProject);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: project.flagDirectorInputRequired ? '#fee2e2' : '#f3f4f6',
                          color: project.flagDirectorInputRequired ? '#dc2626' : '#6b7280',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = project.flagDirectorInputRequired ? '#fecaca' : '#e5e7eb';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = project.flagDirectorInputRequired ? '#fee2e2' : '#f3f4f6';
                        }}
                        title={project.flagDirectorInputRequired ? "Director Input Required - Click to remove flag" : "Click to flag for Director Input"}
                      >
                        Red Flag
                      </button>
                       <button
                         onClick={() => handleViewProject(project)}
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
                         title="View Project"
                       >
                        <Eye size={16} />
                       </button>
                                               {/* Show Edit button for Directors or for employee-created projects */}
                        {((user?.role === 'Director' && project.id) || (user?.role === 'Employee' && project.isEmployeeCreated && project.id)) && (
                          <button
                            onClick={() => handleEditProject(project)}
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
                            title="Edit Project"
                          >
                          <Edit size={16} />
                          </button>
                        )}
                        {/* Show Complete button for Directors only */}
                        {user?.role === 'Director' && project.id && onProjectComplete && project.status !== 'Completed' && (
                          <button
                            onClick={() => onProjectComplete(project)}
                            style={{
                              color: '#15803d',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.color = '#166534';
                              e.currentTarget.style.backgroundColor = '#dcfce7';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.color = '#15803d';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="Mark as Completed"
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        {/* Show Delete button for Directors or for employee-created projects */}
                        {((user?.role === 'Director' && project.id) || (user?.role === 'Employee' && project.isEmployeeCreated && project.id)) && (
                          <button
                            onClick={() => handleDeleteProject(project.id!)}
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
                            title="Delete Project"
                          >
                          <Trash2 size={16} />
                          </button>
                        )}
                       {/* Show View Only for projects not created by employee and user is not Director */}
                       {user?.role === 'Employee' && !project.isEmployeeCreated && (
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

      {/* Project Modal */}
      <ProjectModal
        project={modalMode === 'create' ? null : selectedProject}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleProjectSave}
        onDelete={canDeleteProject ? handleDeleteProject : undefined}
        users={users}
        onCommentAdded={onCommentAdded}
      />
    </div>
  );
};

export default ProjectList;
