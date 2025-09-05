import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../lib/mongodb'
import Task from '../../../models/Task'

export async function GET() {
  try {
    await dbConnect()
    
    const tasks = await Task.find().sort({ createdAt: -1 })
    
    // Normalize the data structure for frontend compatibility
    const normalizedTasks = tasks.map(task => {
      const taskObj = task.toObject()
      return {
        ...taskObj,
        id: taskObj._id, // Add id field for frontend compatibility
        comments: taskObj.comments.map((comment: any) => ({
          ...comment,
          id: comment._id || comment.id // Ensure comment has id field
        }))
      }
    })
    
    return NextResponse.json(normalizedTasks)
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
    
    const body = await request.json()
    console.log('Received task data:', JSON.stringify(body, null, 2))
    
    // Remove id and _id for new tasks to let MongoDB auto-generate them
    const { id, _id, ...taskData } = body
    console.log('Cleaned task data:', JSON.stringify(taskData, null, 2))
    
    // Validate required fields
    const requiredFields = ['title', 'description', 'projectId', 'projectName', 'assignedToId', 'assignedToName', 'assignedById', 'assignedByName', 'estimatedHours', 'startDate']
    const missingFields = requiredFields.filter(field => !taskData[field])
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields)
      return NextResponse.json(
        { message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }
    
    const task = new Task(taskData)
    const savedTask = await task.save()
    
    // Normalize the data structure
    const taskObj = savedTask.toObject()
    const normalizedTask = {
      ...taskObj,
      id: taskObj._id,
      comments: taskObj.comments.map((comment: any) => ({
        ...comment,
        id: comment._id || comment.id
      }))
    }
    
    return NextResponse.json(normalizedTask, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}
