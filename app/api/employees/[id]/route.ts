import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../lib/mongodb'
import Employee from '../../../../models/Employee'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { id } = params
    
    const employee = await Employee.findById(id)
    
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
    
    const employee = await Employee.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    
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
