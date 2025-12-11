import React from 'react';
import { Task } from '../types';
import { Calendar, Clock, User, Flag, MessageSquare, FolderOpen } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  showActions?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskClick, showActions = true }) => {
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800';
      case 'Less Urgent': return 'bg-amber-100 text-amber-800';
      case 'Free Time': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
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

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">📋</div>
        <p className="text-gray-500">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onTaskClick(task)}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {task.title}
                </h4>
                {task.isLocked && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    🔒 Locked
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {task.description}
              </p>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <FolderOpen className="h-3 w-3" />
                  <span>{task.projectName}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{task.assignedToName}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
  
                </div>
                
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{task.estimatedHours}h</span>
                </div>
                
                {task.comments.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{task.comments.length}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-2 ml-4">
              <div className="flex space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  <Flag className="h-3 w-3 inline mr-1" />
                  {task.priority}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
              
              {task.rating && (
                <div className="flex items-center space-x-1 text-yellow-600">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < task.rating! ? 'text-yellow-500' : 'text-gray-300'}>
                      ★
                    </span>
                  ))}
                </div>
              )}
              
              {task.newDeadlineProposal && (
                <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  Extension requested: {formatDate(task.newDeadlineProposal)}
                </div>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Assigned by: {task.assignedByName}
              </div>
              
              <div className="flex space-x-2">
                {task.status === 'In Progress' && (
                  <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                    Update Progress
                  </button>
                )}
                {(task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date()) && !task.newDeadlineProposal && (
                  <button className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200">
                    Request Extension
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TaskList;
