import mongoose, { Document, Schema } from 'mongoose'

export interface IIndependentWork extends Document {
  employeeId: string
  employeeName: string
  date: string
  workDescription: string
  category: 'Design' | 'Site' | 'Office' | 'Other'
  timeSpent: number // in hours
  comments: Array<{
    id: string
    userId: string
    userName: string
    content: string
    timestamp: string
  }>
  attachments: Array<{
    id: string
    fileName: string
    fileType: string
    fileSize: number
    fileData: string // base64 encoded file data
    uploadedAt: string
  }>
  createdAt: Date
  updatedAt: Date
}

const independentWorkSchema = new Schema<IIndependentWork>({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  date: { type: String, required: true },
  workDescription: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Design', 'Site', 'Office', 'Other'], 
    required: true 
  },
  timeSpent: { type: Number, required: true, min: 0 },
  comments: [{
    id: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: String, required: true }
  }],
  attachments: [{
    id: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileData: { type: String, required: true },
    uploadedAt: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Update the updatedAt field before saving
independentWorkSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.models.IndependentWork || mongoose.model<IIndependentWork>('IndependentWork', independentWorkSchema)

