import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../../lib/mongodb'
import Project from '../../../../../models/Project'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { userId, userName, userRole, content } = await request.json()
    
    if (!userId || !userName || !userRole || !content) {
      return NextResponse.json({ message: 'All comment fields are required' }, { status: 400 })
    }
    
    // Validate MongoDB ObjectId format
    if (!params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ message: 'Invalid project ID format' }, { status: 400 })
    }
    
    const project = await Project.findById(params.id)
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 })
    }
    
    const newComment = {
      id: Date.now().toString(),
      userId,
      userName,
      userRole,
      content,
      timestamp: new Date(),
      isVisibleToEmployee: true
    }
    
    // Initialize comments array if it doesn't exist
    if (!project.comments) {
      project.comments = []
    }
    
    project.comments.push(newComment)
    project.updatedAt = new Date()
    
    const savedProject = await project.save()
    
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
