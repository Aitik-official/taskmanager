import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../../lib/mongodb'
import Task from '../../../../../models/Task'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { action, approvedBy, comment } = await request.json()
    
    if (!action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        { message: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }
    
    // Prepare update data
    const updateData: any = {
      completionRequestStatus: action === 'approve' ? 'Approved' : 'Rejected',
      completionResponseDate: new Date(),
      completionResponseBy: approvedBy,
      completionResponseComment: comment || ''
    }
    
    // If approved, mark task as completed
    if (action === 'approve') {
      updateData.status = 'Completed'
      updateData.completedDate = new Date().toISOString()
    }
    
    const task = await Task.findByIdAndUpdate(
      params.id,
      updateData,
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
    console.error('Error processing completion approval:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

