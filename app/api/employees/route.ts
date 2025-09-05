import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../lib/mongodb'
import Employee from '../../../models/Employee'

export async function GET() {
  try {
    await dbConnect()
    
    const employees = await Employee.find().sort({ createdAt: -1 })
    
    // Normalize the data structure
    const normalizedEmployees = employees.map(employee => {
      const employeeObj = employee.toObject()
      return {
        ...employeeObj,
        id: employeeObj._id,
        password: undefined // Don't send password in response
      }
    })
    
    return NextResponse.json(normalizedEmployees)
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const { 
      firstName, lastName, email, phone, position, department, 
      joiningDate, status, username, password, role 
    } = await request.json()
    
    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !position || 
        !department || !joiningDate || !username || !password) {
      return NextResponse.json({ message: 'All required fields must be provided' }, { status: 400 })
    }
    
    // Check if email or username already exists
    const existingEmployee = await Employee.findOne({
      $or: [{ email }, { username }]
    })
    
    if (existingEmployee) {
      return NextResponse.json({ 
        message: 'Employee with this email or username already exists' 
      }, { status: 400 })
    }
    
    const newEmployee = new Employee({
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      joiningDate,
      status: status || 'Active',
      username,
      password,
      role: role || 'Employee'
    })
    
    const savedEmployee = await newEmployee.save()
    
    // Normalize the response
    const employeeObj = savedEmployee.toObject()
    const normalizedEmployee = {
      ...employeeObj,
      id: employeeObj._id,
      password: undefined
    }
    
    return NextResponse.json(normalizedEmployee, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}
