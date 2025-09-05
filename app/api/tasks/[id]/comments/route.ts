import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../../lib/mongodb'
import Task from '../../../../../models/Task'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { content, userId, userName } = await request.json()
    
    const comment = {
      id: Date.now().toString(),
      taskId: params.id,
      userId,
      userName,
      content,
      timestamp: new Date().toISOString(),
      isVisibleToEmployee: true
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      params.id,
      { $push: { comments: comment } },
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
