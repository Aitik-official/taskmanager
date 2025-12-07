import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../lib/mongodb'
import Task from '../../../../models/Task'
import mongoose from 'mongoose'

// Helper function to check if a string is a valid MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && (String(new mongoose.Types.ObjectId(id)) === id)
}

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
    console.error('Error updating task:', error)
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
    
    const { id } = params
    
    // Convert to string and validate ObjectId
    const taskId = String(id).trim()
    
    if (!taskId) {
      return NextResponse.json(
        { message: 'Task ID is required' },
        { status: 400 }
      )
    }
    
    // Validate ObjectId format
    if (!isValidObjectId(taskId)) {
      console.error('Invalid ObjectId format:', taskId)
      return NextResponse.json(
        { message: `Invalid task ID format: ${taskId}` },
        { status: 400 }
      )
    }
    
    console.log('Attempting to delete task with ID:', taskId)
    
    const deletedTask = await Task.findByIdAndDelete(taskId)
    
    if (!deletedTask) {
      console.log('Task not found with ID:', taskId)
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      )
    }
    
    console.log('Task deleted successfully:', deletedTask._id)
    
    return NextResponse.json({ 
      message: 'Task deleted successfully',
      id: deletedTask._id.toString()
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { errorMessage, errorStack })
    
    return NextResponse.json(
      { 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}
