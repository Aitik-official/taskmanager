import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../lib/mongodb'
import IndependentWork from '../../../models/IndependentWork'

export async function GET() {
  try {
    await dbConnect()
    
    const independentWork = await IndependentWork.find().sort({ date: -1, createdAt: -1 })
    
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
        }))
      }
    })
    
    return NextResponse.json(normalizedWork)
  } catch (error) {
    console.error('Error fetching independent work:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const body = await request.json()
    console.log('Received independent work data:', JSON.stringify(body, null, 2))
    
    // Remove id and _id for new entries to let MongoDB auto-generate them
    const { id, _id, createdAt, updatedAt, ...workData } = body
    
    // Validate required fields
    const requiredFields = ['employeeId', 'employeeName', 'date', 'workDescription', 'category', 'timeSpent']
    const missingFields = requiredFields.filter(field => !workData[field] && workData[field] !== 0)
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields)
      return NextResponse.json(
        { message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Validate category
    const validCategories = ['Design', 'Site', 'Office', 'Other']
    if (!validCategories.includes(workData.category)) {
      return NextResponse.json(
        { message: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Validate timeSpent
    if (typeof workData.timeSpent !== 'number' || workData.timeSpent < 0) {
      return NextResponse.json(
        { message: 'timeSpent must be a non-negative number' },
        { status: 400 }
      )
    }
    
    const independentWork = new IndependentWork({
      ...workData,
      comments: workData.comments || []
    })
    const savedWork = await independentWork.save()
    
    // Normalize the data structure
    const workObj = savedWork.toObject()
    const normalizedWork = {
      ...workObj,
      id: workObj._id,
      _id: workObj._id,
      comments: (workObj.comments || []).map((comment: any) => ({
        ...comment,
        id: comment.id || comment._id || `${workObj._id}-${comment.timestamp}`
      }))
    }
    
    console.log('✅ Independent work entry created successfully:', normalizedWork.id)
    return NextResponse.json(normalizedWork, { status: 201 })
  } catch (error) {
    console.error('Error creating independent work:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}

