import mongoose, { Document, Schema } from 'mongoose'

export interface IProject extends Document {
  name: string
  projectNumber?: string // e.g., 2025-001 / 2025-002 / 2025-003
  location?: string
  description: string
  contactDetails?: string
  projectRemarks?: Array<{
    date: string
    remark: string
  }>
  assignedEmployeeId?: string
  assignedEmployeeName?: string
  status?: 'Current' | 'Upcoming' | 'Sleeping (On Hold)' | 'Completed'
  startDate?: string
  progress?: number
  comments: Array<{
    id: string
    userId: string
    userName: string
    userRole: string
    content: string
    timestamp: Date
    isVisibleToEmployee: boolean
  }>
  isEmployeeCreated?: boolean // Flag to identify projects created by employees from employee dashboard
  flagDirectorInputRequired?: boolean // Flag when staff needs clarification, approval, or input
  createdAt: Date
  updatedAt: Date
}

const projectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  projectNumber: { type: String, required: false },
  location: { type: String, required: false },
  description: { type: String, required: true },
  contactDetails: { type: String, required: false },
  projectRemarks: [{
    date: { type: String, required: false },
    remark: { type: String, required: false }
  }],
  assignedEmployeeId: { type: String, required: false },
  assignedEmployeeName: { type: String, required: false },
  status: { 
    type: String, 
    enum: {
      values: ['Current', 'Upcoming', 'Sleeping (On Hold)', 'Completed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'Current',
    required: false
  },
  startDate: { type: String, required: false },
  progress: { type: Number, min: 0, max: 100, default: 0, required: false },
  comments: [{
    id: String,
    userId: String,
    userName: String,
    userRole: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
    isVisibleToEmployee: { type: Boolean, default: true }
  }],
  isEmployeeCreated: { type: Boolean, default: false }, // Flag to identify projects created by employees from employee dashboard
  flagDirectorInputRequired: { type: Boolean, default: false }, // Flag when staff needs clarification, approval, or input
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  // Disable strict mode to allow fields not in schema
  strict: false
})

// Delete existing model to avoid schema caching issues
if (mongoose.models.Project) {
  mongoose.deleteModel('Project')
}

// Create and export the model
const ProjectModel = mongoose.model<IProject>('Project', projectSchema)

export default ProjectModel
