import mongoose, { Document, Schema } from 'mongoose'

export interface ITask extends Document {
  title: string
  description: string
  projectId: string
  projectName: string
  assignedToId: string
  assignedToName: string
  assignedById: string
  assignedByName: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue'
  estimatedHours: number
  actualHours?: number
  startDate: string
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
  createdAt: Date
}

const taskSchema = new Schema<ITask>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  projectId: { type: String, required: true },
  projectName: { type: String, required: true },
  assignedToId: { type: String, required: true },
  assignedToName: { type: String, required: true },
  assignedById: { type: String, required: true },
  assignedByName: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Medium' 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed', 'Overdue'], 
    default: 'Pending' 
  },
  estimatedHours: { type: Number, required: true },
  actualHours: { type: Number },
  startDate: { type: String, required: true },
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
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.models.Task || mongoose.model<ITask>('Task', taskSchema)
