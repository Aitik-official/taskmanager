import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../lib/mongodb'
import Project from '../../../models/Project'

export async function GET() {
  try {
    await dbConnect()
    
    const projects = await Project.find().sort({ createdAt: -1 })
    
    // Normalize the data structure
    const normalizedProjects = projects.map(project => {
      const projectObj = project.toObject()
      return {
        ...projectObj,
        id: projectObj._id
      }
    })
    
    return NextResponse.json(normalizedProjects)
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
    
    const { name, description, assignedEmployeeId, assignedEmployeeName, status, startDate, progress } = await request.json()
    
    // Validate required fields
    if (!name || !description || !assignedEmployeeId || !assignedEmployeeName || !startDate) {
      return NextResponse.json({ message: 'All required fields must be provided' }, { status: 400 })
    }
    
    const newProject = new Project({
      name,
      description,
      assignedEmployeeId,
      assignedEmployeeName,
      status: status || 'Active',
      startDate,
      progress: progress || 0
    })
    
    const savedProject = await newProject.save()
    
    // Normalize the response
    const projectObj = savedProject.toObject()
    const normalizedProject = {
      ...projectObj,
      id: projectObj._id
    }
    
    return NextResponse.json(normalizedProject, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}
