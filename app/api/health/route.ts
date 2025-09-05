import { NextResponse } from 'next/server'
import dbConnect from '../../../lib/mongodb'
import mongoose from 'mongoose'

export async function GET() {
  try {
    await dbConnect()
    
    const status = mongoose.connection.readyState
    const statusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }
    
    return NextResponse.json({
      mongodb: {
        status: statusText[status as keyof typeof statusText] || 'unknown',
        readyState: status,
        connected: status === 1
      },
      server: 'running',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    )
  }
}
