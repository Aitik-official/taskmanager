import mongoose, { Document, Schema } from 'mongoose'

export interface ITask extends Document {
  title: string
  description: string
  projectId?: string
  projectName?: string
  assignedToId?: string
  assignedToName?: string
  assignedById: string
  assignedByName: string
  priority: 'Urgent' | 'Less Urgent' | 'Free Time' | 'Custom'
  status: 'Pending' | 'In Progress' | 'Completed'
  estimatedHours?: number
  actualHours?: number
  startDate?: string
  dueDate: string
  completedDate?: string
  isLocked: boolean
  comments: Array<{
    id: string
    taskId: string
    userId: string
    userName: string
    content: string
    timestamp: string
    isVisibleToEmployee: boolean
  }>
  rating?: number
  ratingComment?: string
  newDeadlineProposal?: string
  reasonForExtension?: string
  extensionRequestStatus: 'Pending' | 'Approved' | 'Rejected'
  extensionRequestDate?: Date
  extensionResponseDate?: Date
  extensionResponseBy?: string
  extensionResponseComment?: string
  completionRequestStatus?: 'Pending' | 'Approved' | 'Rejected'
  completionRequestDate?: Date
  completionRequestedBy?: string
  completionResponseDate?: Date
  completionResponseBy?: string
  completionResponseComment?: string
  isEmployeeCreated?: boolean // Flag to identify tasks created by employees from employee dashboard
  workDone?: number // Percentage of work done (0-100)
  flagDirectorInputRequired?: boolean // Flag when staff needs clarification, approval, or input
  createdAt: Date
}

const taskSchema = new Schema<ITask>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  projectId: { type: String },
  projectName: { type: String },
  assignedToId: { type: String, default: '' },
  assignedToName: { type: String, default: '' },
  assignedById: { type: String, required: true },
  assignedByName: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['Urgent', 'Less Urgent', 'Free Time', 'Custom'], 
    default: 'Less Urgent' 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed'], 
    default: 'Pending' 
  },
  estimatedHours: { type: Number, default: 0 },
  actualHours: { type: Number },
  startDate: { type: String },
  dueDate: { type: String, required: true },
  completedDate: { type: String },
  isLocked: { type: Boolean, default: false },
  comments: [{
    id: { type: String, required: true },
    taskId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: String, required: true },
    isVisibleToEmployee: { type: Boolean, default: true }
  }],
  rating: { type: Number, min: 1, max: 5 },
  ratingComment: String,
  newDeadlineProposal: String,
  reasonForExtension: String,
  extensionRequestStatus: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  extensionRequestDate: { type: Date },
  extensionResponseDate: { type: Date },
  extensionResponseBy: String,
  extensionResponseComment: String,
  completionRequestStatus: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'],
    default: undefined
  },
  completionRequestDate: { type: Date },
  completionRequestedBy: String,
  completionResponseDate: { type: Date },
  completionResponseBy: String,
  completionResponseComment: String,
  isEmployeeCreated: { type: Boolean, default: false }, // Flag to identify tasks created by employees from employee dashboard
  workDone: { type: Number, min: 0, max: 100 }, // Percentage of work done (0-100)
  flagDirectorInputRequired: { type: Boolean, default: false }, // Flag when staff needs clarification, approval, or input
  createdAt: { type: Date, default: Date.now }
})

// Clear cached model in development to ensure schema changes take effect
if (process.env.NODE_ENV === 'development' && mongoose.models.Task) {
  delete mongoose.models.Task
}

export default mongoose.models.Task || mongoose.model<ITask>('Task', taskSchema)
