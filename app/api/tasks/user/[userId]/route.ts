import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../../lib/mongodb'
import Task from '../../../../../models/Task'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    let tasks
    if (role === 'Employee') {
      tasks = await Task.find({
        $or: [
          { assignedToId: params.userId },
          { assignedEmployeeIds: params.userId },
          { assignedById: params.userId }
        ]
      }).sort({ createdAt: -1 })
    } else if (role === 'Project Head') {
      // For project heads, get tasks from their projects
      tasks = await Task.find().sort({ createdAt: -1 })
    } else {
      // For directors, get all tasks
      tasks = await Task.find().sort({ createdAt: -1 })
    }

    // Normalize the data structure
    const normalizedTasks = tasks.map(task => {
      const taskObj = task.toObject()
      return {
        ...taskObj,
        id: taskObj._id,
        comments: taskObj.comments.map((comment: any) => ({
          ...comment,
          id: comment._id || comment.id
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
