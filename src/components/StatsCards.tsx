import React from 'react';
import { DashboardStats } from '../types';
import { CheckCircle, Clock, AlertTriangle, FolderOpen, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  stats: DashboardStats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: CheckCircle,
      bgGradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverEffect: 'hover:from-blue-600 hover:to-blue-700 hover:scale-105'
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      icon: CheckCircle,
      bgGradient: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      hoverEffect: 'hover:from-emerald-600 hover:to-emerald-700 hover:scale-105'
    },
    {
      title: 'In Progress',
      value: stats.inProgressTasks,
      icon: Clock,
      bgGradient: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      hoverEffect: 'hover:from-amber-600 hover:to-amber-700 hover:scale-105'
    },
    {
      title: 'Overdue',
      value: stats.overdueTasks,
      icon: AlertTriangle,
      bgGradient: 'from-rose-500 to-rose-600',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      borderColor: 'border-rose-200',
      hoverEffect: 'hover:from-rose-600 hover:to-rose-700 hover:scale-105'
    },
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      icon: FolderOpen,
      bgGradient: 'from-violet-500 to-violet-600',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      borderColor: 'border-violet-200',
      hoverEffect: 'hover:from-violet-600 hover:to-violet-700 hover:scale-105'
    },
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      icon: TrendingUp,
      bgGradient: 'from-indigo-500 to-indigo-600',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      hoverEffect: 'hover:from-indigo-600 hover:to-indigo-700 hover:scale-105'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <div 
            key={index} 
            className="glass-effect rounded-2xl shadow-2xl p-6 hover:shadow-3xl transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-sm font-medium opacity-90 mb-1">{card.title}</p>
                <p className="text-3xl font-bold">{card.value}</p>
              </div>
              <div className="p-3 rounded-full bg-white/20 shadow-lg">
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            
            {card.title === 'Completed' && stats.totalTasks > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-white opacity-90 mb-2">
                  <span>Completion Rate</span>
                  <span className="font-semibold">{Math.round((stats.completedTasks / stats.totalTasks) * 100)}%</span>
                </div>
                <div className="w-full bg-white bg-opacity-20 rounded-full h-2 backdrop-blur-sm">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(stats.completedTasks / stats.totalTasks) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Interactive pulse effect for active projects */}
            {card.title === 'Active Projects' && stats.activeProjects > 0 && (
              <div className="mt-3 flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs text-white opacity-80">Live Updates</span>
              </div>
            )}

            {/* Warning indicator for overdue tasks */}
            {card.title === 'Overdue' && stats.overdueTasks > 0 && (
              <div className="mt-3 flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <span className="text-xs text-white opacity-80">Attention Required</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
