import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../../lib/mongodb'
import Task from '../../../../../models/Task'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { status, responseComment, respondedBy } = await request.json()
    
    const updatedTask = await Task.findByIdAndUpdate(
      params.id,
      {
        extensionRequestStatus: status,
        extensionResponseDate: new Date(),
        extensionResponseBy: respondedBy,
        extensionResponseComment: responseComment
      },
      { new: true }
    )
    
    if (!updatedTask) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 })
    }
    
    // Normalize the response
    const taskObj = updatedTask.toObject()
    const normalizedTask = {
      ...taskObj,
      id: taskObj._id,
      comments: taskObj.comments.map((comment: any) => ({
        ...comment,
        id: comment._id || comment.id
      }))
    }
    
    return NextResponse.json(normalizedTask)
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}
