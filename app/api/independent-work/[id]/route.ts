import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../lib/mongodb'
import IndependentWork from '../../../../models/IndependentWork'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const work = await IndependentWork.findById(params.id)
    
    if (!work) {
      return NextResponse.json(
        { message: 'Independent work entry not found' },
        { status: 404 }
      )
    }
    
    const workObj = work.toObject()
    const normalizedWork = {
      ...workObj,
      id: workObj._id,
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
    
    return NextResponse.json(normalizedWork)
  } catch (error) {
    console.error('Error fetching independent work:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const { id, _id, createdAt, ...updateData } = body
    
    // Update updatedAt field
    updateData.updatedAt = new Date()
    
    const work = await IndependentWork.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    )
    
    if (!work) {
      return NextResponse.json(
        { message: 'Independent work entry not found' },
        { status: 404 }
      )
    }
    
    const workObj = work.toObject()
    const normalizedWork = {
      ...workObj,
      id: workObj._id,
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
    
    return NextResponse.json(normalizedWork)
  } catch (error) {
    console.error('Error updating independent work:', error)
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
    
    const work = await IndependentWork.findByIdAndDelete(params.id)
    
    if (!work) {
      return NextResponse.json(
        { message: 'Independent work entry not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ message: 'Independent work entry deleted successfully' })
  } catch (error) {
    console.error('Error deleting independent work:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

