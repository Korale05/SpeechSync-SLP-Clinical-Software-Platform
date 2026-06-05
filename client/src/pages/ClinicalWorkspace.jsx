// client/src/pages/ClinicalWorkspace.jsx
import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import PatientProfile from './PatientProfile'
import LoadingScreen from '../components/LoadingScreen'

export default function ClinicalWorkspace() {
  const { sessionId } = useParams()
  
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.sessions.getById(sessionId),
    enabled: !!sessionId
  })

  if (isLoading) return <LoadingScreen />
  
  if (!session?.patientId) {
    return (
      <div className="p-8 text-center mt-20">
        <h2 className="text-xl font-bold text-slate-800">Session Context Not Found</h2>
        <p className="text-slate-500 mt-2">Could not load the patient associated with this session.</p>
      </div>
    )
  }

  // Render the patient profile but inject the session context
  return <PatientProfile overridePatientId={session.patientId} activeSessionId={sessionId} />
}
