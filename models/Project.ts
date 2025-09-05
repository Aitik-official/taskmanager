import mongoose, { Document, Schema } from 'mongoose'

export interface IProject extends Document {
  name: string
  description: string
  assignedEmployeeId: string
  assignedEmployeeName: string
  status: 'Active' | 'Completed' | 'On Hold'
  startDate: string
  progress: number
  comments: Array<{
    id: string
    userId: string
    userName: string
    userRole: string
    content: string
    timestamp: Date
    isVisibleToEmployee: boolean
  }>
  createdAt: Date
  updatedAt: Date
}

const projectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  assignedEmployeeId: { type: String, required: true },
  assignedEmployeeName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Active', 'Completed', 'On Hold'], 
    default: 'Active' 
  },
  startDate: { type: String, required: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  comments: [{
    id: String,
    userId: String,
    userName: String,
    userRole: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
    isVisibleToEmployee: { type: Boolean, default: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema)
