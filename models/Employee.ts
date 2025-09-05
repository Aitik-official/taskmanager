import mongoose, { Document, Schema } from 'mongoose'

export interface IEmployee extends Document {
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  department: string
  joiningDate: string
  status: 'Active' | 'Inactive' | 'On Leave'
  username: string
  password: string
  role: 'Director' | 'Project Head' | 'Employee'
  createdAt: Date
  updatedAt: Date
}

const employeeSchema = new Schema<IEmployee>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  position: { type: String, required: true },
  department: { type: String, required: true },
  joiningDate: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Active', 'Inactive', 'On Leave'], 
    default: 'Active' 
  },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Director', 'Project Head', 'Employee'], 
    default: 'Employee' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.models.Employee || mongoose.model<IEmployee>('Employee', employeeSchema)
