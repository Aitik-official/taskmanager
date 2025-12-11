'use client'

import { useAuth } from '../src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Login from '../src/components/Login'
import Dashboard from '../src/components/Dashboard'
import EmployeeDashboard from '../src/components/EmployeeDashboard'

export default function Home() {
  const { user, loading, isDirector, isProjectHead, isEmployee } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if we've finished loading and there's no user
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        Loading...
      </div>
    )
  }

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
