import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../lib/mongodb'
import Project from '../../../../models/Project'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const project = await Project.findById(params.id)
    
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 })
    }
    
    // Normalize the data structure
    const projectObj = project.toObject()
    const normalizedProject = {
      ...projectObj,
      id: projectObj._id
    }
    
    return NextResponse.json(normalizedProject)
  } catch (error) {
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
    
    const { name, description, assignedEmployeeId, assignedEmployeeName, status, startDate, progress } = await request.json()
    
    // Validate required fields
    if (!name || !description || !assignedEmployeeId || !assignedEmployeeName || !startDate) {
      return NextResponse.json({ message: 'All required fields must be provided' }, { status: 400 })
    }
    
    const updatedProject = await Project.findByIdAndUpdate(
      params.id,
      {
        name,
        description,
        assignedEmployeeId,
        assignedEmployeeName,
        status,
        startDate,
        progress,
        updatedAt: new Date()
      },
      { new: true }
    )
    
    if (!updatedProject) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 })
    }
    
    // Normalize the response
    const projectObj = updatedProject.toObject()
    const normalizedProject = {
      ...projectObj,
      id: projectObj._id
    }
    
    return NextResponse.json(normalizedProject)
  } catch (error) {
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
    
    const deletedProject = await Project.findByIdAndDelete(params.id)
    
    if (!deletedProject) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 })
    }
    
    // Also delete all tasks associated with this project
    const Task = (await import('@/models/Task')).default
    await Task.deleteMany({ projectId: params.id })
    
    return NextResponse.json({ message: 'Project and associated tasks deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}
