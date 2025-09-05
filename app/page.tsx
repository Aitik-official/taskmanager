'use client'

import { useAuth } from '../src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Login from '../src/components/Login'
import Dashboard from '../src/components/Dashboard'
import EmployeeDashboard from '../src/components/EmployeeDashboard'

export default function Home() {
  const { user, isDirector, isProjectHead, isEmployee } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  if (!user) {
    return <Login />
  }

  // If user is an employee, show EmployeeDashboard
  if (isEmployee) {
    return <EmployeeDashboard />
  }
  
  // If user is a director or project head, show main Dashboard
  if (isDirector || isProjectHead) {
    return <Dashboard />
  }
  
  // Default fallback
  return <Dashboard />
}
