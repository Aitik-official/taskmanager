import { NextResponse } from 'next/server'
import dbConnect from '../../../lib/mongodb'
import Task from '../../../models/Task'

export async function GET() {
  try {
    await dbConnect()
    
    const extensionRequests = await Task.find({
      newDeadlineProposal: { $exists: true, $ne: null },
      extensionRequestStatus: 'Pending'
    }).sort({ extensionRequestDate: -1 })
    
    // Normalize the data structure
    const normalizedRequests = extensionRequests.map(task => {
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
    
    return NextResponse.json(normalizedRequests)
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
