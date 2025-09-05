import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../lib/mongodb'
import Employee from '../../../../models/Employee'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const { username, password, email } = await request.json()
    
    if (!password) {
      return NextResponse.json({ message: 'Password is required' }, { status: 400 })
    }
    
    if (!username && !email) {
      return NextResponse.json({ message: 'Username or email is required' }, { status: 400 })
    }
    
    // Try to find employee by username or email
    const employee = await Employee.findOne({
      $or: [
        { username, password },
        { email, password }
      ]
    })
    
    if (!employee) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }
    
    // Normalize the response
    const employeeObj = employee.toObject()
    const normalizedEmployee = {
      ...employeeObj,
      id: employeeObj._id,
      password: undefined
    }
    
    return NextResponse.json(normalizedEmployee)
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}
