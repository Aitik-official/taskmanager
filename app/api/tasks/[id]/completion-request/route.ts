import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../../lib/mongodb'
import Task from '../../../../../models/Task'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { requestedBy } = await request.json()
    
    const task = await Task.findByIdAndUpdate(
      params.id,
      {
        completionRequestStatus: 'Pending',
        completionRequestDate: new Date(),
        completionRequestedBy: requestedBy
      },
      { new: true, runValidators: false } // runValidators: false to avoid validation errors on existing data
    )
    
    if (!task) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      )
    }
    
    const taskObj = task.toObject()
    const normalizedTask = {
      ...taskObj,
      id: taskObj._id.toString(),
      comments: (taskObj.comments || []).map((comment: any) => ({
        ...comment,
        id: comment.id || comment._id
      }))
    }
    
    return NextResponse.json(normalizedTask, { status: 200 })
  } catch (error) {
    console.error('Error requesting task completion:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

