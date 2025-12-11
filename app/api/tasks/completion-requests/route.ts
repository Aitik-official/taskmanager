import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../lib/mongodb'
import Task from '../../../../models/Task'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    // Get query parameter for filtering
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // 'all', 'Pending', 'Approved', 'Rejected'
    
    // Build query based on filter
    let query: any = {}
    
    if (statusFilter && statusFilter !== 'all') {
      query.completionRequestStatus = statusFilter
    } else {
      // If 'all', get all tasks that have a completionRequestStatus (not null/undefined)
      query.completionRequestStatus = { $exists: true, $ne: null }
    }
    
    // Get all tasks with completion requests (based on filter)
    const tasks = await Task.find(query).sort({ completionRequestDate: -1 })
    
    const normalizedTasks = tasks.map(task => {
      const taskObj = task.toObject()
      return {
        ...taskObj,
        id: taskObj._id.toString(),
        comments: (taskObj.comments || []).map((comment: any) => ({
          ...comment,
          id: comment.id || comment._id
        }))
      }
    })
    
    return NextResponse.json(normalizedTasks)
  } catch (error) {
    console.error('Error fetching completion requests:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

