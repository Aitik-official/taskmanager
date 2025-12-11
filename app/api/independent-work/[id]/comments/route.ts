import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../../lib/mongodb'
import IndependentWork from '../../../../../models/IndependentWork'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const { userId, userName, content } = await request.json()
    
    if (!userId || !userName || !content) {
      return NextResponse.json(
        { message: 'All comment fields are required (userId, userName, content)' },
        { status: 400 }
      )
    }
    
    // Try to find the work entry by ID
    const work = await IndependentWork.findById(params.id)
    if (!work) {
      return NextResponse.json(
        { message: 'Independent work entry not found' },
        { status: 404 }
      )
    }
    
    const newComment = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      userId,
      userName,
      content,
      timestamp: new Date().toISOString()
    }
    
    // Initialize comments array if it doesn't exist
    if (!work.comments) {
      work.comments = []
    }
    
    // Add the new comment
    work.comments.push(newComment)
    
    // Mark the comments array as modified so Mongoose saves it
    work.markModified('comments')
    work.updatedAt = new Date()
    
    const savedWork = await work.save()
    
    // Fetch the saved work again to ensure we have the latest data
    const refreshedWork = await IndependentWork.findById(params.id)
    
    if (!refreshedWork) {
      return NextResponse.json(
        { message: 'Failed to retrieve updated entry' },
        { status: 500 }
      )
    }
    
    // Normalize the response
    const workObj = refreshedWork.toObject()
    console.log('Saved work comments:', workObj.comments)
    
    const normalizedWork = {
      ...workObj,
      id: workObj._id.toString(),
      _id: workObj._id.toString(),
      comments: (workObj.comments || []).map((comment: any) => ({
        id: comment.id || comment._id || `${workObj._id}-${comment.timestamp}`,
        userId: comment.userId,
        userName: comment.userName,
        content: comment.content,
        timestamp: comment.timestamp
      })),
      attachments: (workObj.attachments || []).map((attachment: any) => ({
        ...attachment,
        id: attachment.id || attachment._id || `${workObj._id}-${attachment.uploadedAt}`
      }))
    }
    
    console.log('Normalized work comments:', normalizedWork.comments)
    
    return NextResponse.json(normalizedWork, { status: 201 })
  } catch (error) {
    console.error('Error adding comment to independent work:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

