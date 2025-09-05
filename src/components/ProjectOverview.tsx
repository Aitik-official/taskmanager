import React from 'react';
import { Project } from '../types';
import { Calendar, User, TrendingUp, MessageCircle } from 'lucide-react';

interface ProjectOverviewProps {
  projects: Project[];
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ projects }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">📁</div>
        <p className="text-gray-500">No projects found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900 text-sm">{project.name}</h4>
              {project.comments && project.comments.length > 0 && (
                <span className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  <MessageCircle className="h-3 w-3" />
                  <span>{project.comments.length}</span>
                </span>
              )}
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          </div>
          
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {project.description}
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>{project.assignedEmployeeName}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(project.startDate)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-xs font-medium text-gray-900">{project.progress}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  project.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
            
            {project.progress > 0 && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <TrendingUp className="h-3 w-3" />
                <span>
                  {project.progress === 100 ? 'Completed' : `${project.progress}% Complete`}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectOverview;
