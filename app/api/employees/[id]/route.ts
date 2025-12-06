import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../lib/mongodb'
import Employee from '../../../../models/Employee'
import mongoose from 'mongoose'

// Helper function to check if a string is a valid MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && (String(new mongoose.Types.ObjectId(id)) === id)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { id } = params
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')
    
    let employee = null
    
    // If ID is a valid ObjectId, try to find by ID
    if (isValidObjectId(id)) {
      employee = await Employee.findById(id)
    }
    
    // If not found by ID and email is provided, try to find by email
    if (!employee && email) {
      employee = await Employee.findOne({ email })
    }
    
    // If still not found and ID is not a valid ObjectId, try to find by username
    if (!employee && !isValidObjectId(id)) {
      // Try to find by username if ID looks like a username
      employee = await Employee.findOne({ username: id })
    }
    
    if (!employee) {
      return NextResponse.json(
        { message: 'Employee not found' },
        { status: 404 }
      )
    }
    
    // Normalize the data structure
    const employeeObj = employee.toObject()
    const normalizedEmployee = {
      ...employeeObj,
      id: employeeObj._id,
      password: employeeObj.password // Include password for profile view
    }
    
    return NextResponse.json(normalizedEmployee)
  } catch (error) {
    console.error('Error fetching employee by ID:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { id } = params
    const updateData = await request.json()
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')
    
    let employee = null
    
    // If ID is a valid ObjectId, try to update by ID
    if (isValidObjectId(id)) {
      employee = await Employee.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
    }
    
    // If not found by ID and email is provided, try to find and update by email
    if (!employee && email) {
      employee = await Employee.findOneAndUpdate(
        { email },
        updateData,
        { new: true, runValidators: true }
      )
    }
    
    // If still not found and ID is not a valid ObjectId, try to find by username
    if (!employee && !isValidObjectId(id)) {
      employee = await Employee.findOneAndUpdate(
        { username: id },
        updateData,
        { new: true, runValidators: true }
      )
    }
    
    if (!employee) {
      return NextResponse.json(
        { message: 'Employee not found' },
        { status: 404 }
      )
    }
    
    // Normalize the response
    const employeeObj = employee.toObject()
    const normalizedEmployee = {
      ...employeeObj,
      id: employeeObj._id,
      password: undefined // Don't send password in response
    }
    
    return NextResponse.json(normalizedEmployee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { id } = params
    
    const employee = await Employee.findByIdAndDelete(id)
    
    if (!employee) {
      return NextResponse.json(
        { message: 'Employee not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
