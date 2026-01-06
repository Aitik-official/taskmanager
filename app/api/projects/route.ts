import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../lib/mongodb'
import Project from '../../../models/Project'

export async function GET() {
  try {
    await dbConnect()
    
    const projects = await Project.find().sort({ createdAt: -1 })
    
    // Normalize the data structure
    const normalizedProjects = projects.map(project => {
      const projectObj = project.toObject()
      return {
        ...projectObj,
        id: projectObj._id
      }
    })
    
    return NextResponse.json(normalizedProjects)
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const { name, projectNumber, location, description, contactDetails, projectRemarks, assignedEmployeeId, assignedEmployeeName, status, startDate, progress, isEmployeeCreated } = await request.json()
    
    // Validate required fields
    if (!name || !description) {
      return NextResponse.json({ message: 'All required fields must be provided' }, { status: 400 })
    }
    
    // Build project object - only include fields that are provided and not empty
    const projectData: any = {
      name: name.trim(),
      description: description.trim()
    };
    
    // Set status with default - ensure it's a valid enum value
    const validStatuses = ['Current', 'Upcoming', 'Sleeping (On Hold)', 'Completed'];
    const projectStatus = (status && validStatuses.includes(status)) ? status : 'Current';
    projectData.status = projectStatus;
    
    // Only add optional fields if they have values (not empty strings or null/undefined)
    if (projectNumber && typeof projectNumber === 'string' && projectNumber.trim()) {
      projectData.projectNumber = projectNumber.trim();
    }
    if (location && typeof location === 'string' && location.trim()) {
      projectData.location = location.trim();
    }
    if (contactDetails && typeof contactDetails === 'string' && contactDetails.trim()) {
      projectData.contactDetails = contactDetails.trim();
    }
    if (projectRemarks && Array.isArray(projectRemarks) && projectRemarks.length > 0) {
      projectData.projectRemarks = projectRemarks;
    }
    if (assignedEmployeeId && typeof assignedEmployeeId === 'string' && assignedEmployeeId.trim()) {
      projectData.assignedEmployeeId = assignedEmployeeId.trim();
    }
    if (assignedEmployeeName && typeof assignedEmployeeName === 'string' && assignedEmployeeName.trim()) {
      projectData.assignedEmployeeName = assignedEmployeeName.trim();
    }
    if (startDate && typeof startDate === 'string' && startDate.trim()) {
      projectData.startDate = startDate.trim();
    }
    if (progress !== undefined && progress !== null && !isNaN(Number(progress))) {
      projectData.progress = Number(progress);
    }
    if (isEmployeeCreated !== undefined) {
      projectData.isEmployeeCreated = Boolean(isEmployeeCreated);
    }
    
    // Create project with validation disabled for optional fields
    const newProject = new Project(projectData)
    
    // Validate and save
    const savedProject = await newProject.save({ validateBeforeSave: true })
    
    // Normalize the response
    const projectObj = savedProject.toObject()
    const normalizedProject = {
      ...projectObj,
      id: projectObj._id
    }
    
    return NextResponse.json(normalizedProject, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}
