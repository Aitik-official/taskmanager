import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../lib/mongodb'
import Task from '../../../../models/Task'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const updatedTask = await Task.findByIdAndUpdate(
      params.id,
      body,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const deletedTask = await Task.findByIdAndDelete(params.id)
    if (!deletedTask) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 })
    }
    
    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
