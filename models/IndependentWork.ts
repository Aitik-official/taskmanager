import mongoose, { Document, Schema } from 'mongoose'

export interface IIndependentWork extends Document {
  employeeId: string
  employeeName: string
  date: string
  workDescription: string
  category: 'Design' | 'Site' | 'Office' | 'Other'
  timeSpent: number // in hours
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Update the updatedAt field before saving
independentWorkSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.models.IndependentWork || mongoose.model<IIndependentWork>('IndependentWork', independentWorkSchema)

