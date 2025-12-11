import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../../lib/mongodb'
import IndependentWork from '../../../../../models/IndependentWork'

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    await dbConnect()
    
    const independentWork = await IndependentWork.find({ 
      employeeId: params.employeeId 
    }).sort({ date: -1, createdAt: -1 })
    
    // Normalize the data structure for frontend compatibility
    const normalizedWork = independentWork.map(work => {
      const workObj = work.toObject()
      return {
        ...workObj,
        id: workObj._id, // Add id field for frontend compatibility
        _id: workObj._id,
        comments: (workObj.comments || []).map((comment: any) => ({
          ...comment,
          id: comment.id || comment._id || `${workObj._id}-${comment.timestamp}`
        })),
        attachments: (workObj.attachments || []).map((attachment: any) => ({
          ...attachment,
          id: attachment.id || attachment._id || `${workObj._id}-${attachment.uploadedAt}`
        }))
      }
    })
    
    return NextResponse.json(normalizedWork)
  } catch (error) {
    console.error('Error fetching employee independent work:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

