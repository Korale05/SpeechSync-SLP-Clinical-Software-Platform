// client/src/pages/TeletherapyLanding.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../services/api'
import { Video, Sparkles, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

export default function TeletherapyLanding() {
  const navigate = useNavigate()
  const [patientId, setPatientId] = useState('')

  const { data: realPatients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.patients.getAll()
  })

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const diff = Date.now() - new Date(dobString).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  const createVideoSessionMutation = useMutation({
    mutationFn: (pid) => api.teletherapy.createSession(pid),
    onSuccess: (data) => {
      toast.success('Video session created!')
      navigate(`/teletherapy/${data.sessionId}`)
    },
    onError: (err) => {
      toast.error(`Failed to create video session: ${err.message}`)
    }
  })

  const createDirectSessionMutation = useMutation({
    mutationFn: (pid) => api.teletherapy.createDirectSession(pid),
    onSuccess: (data) => {
      toast.success('Clinical workspace created!')
      navigate(`/clinical-assistant/${data.sessionId}`)
    },
    onError: (err) => {
      toast.error(`Failed to create clinical workspace: ${err.message}`)
    }
  })

  const handleVideoSession = () => {
    if (!patientId) return toast.error('Please select a patient first')
    createVideoSessionMutation.mutate(patientId)
  }

  const handleDirectSession = () => {
    if (!patientId) return toast.error('Please select a patient first')
    createDirectSessionMutation.mutate(patientId)
  }

  if (isPatientsLoading) return <LoadingScreen />

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-3">
          <Video className="h-8 w-8 text-primary" />
          Teletherapy & Clinical Workspace
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          Select a patient and choose how you want to conduct this session.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="max-w-xl">
          <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-slate-400" />
            SELECT PATIENT FOR SESSION
          </label>
          <select 
            value={patientId} 
            onChange={e => setPatientId(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          >
            <option value="" disabled>Choose a patient from your caseload...</option>
            {realPatients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.dob ? calculateAge(p.dob) : 'N/A'} yrs
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* Option 1: Video Call */}
        <div className={`bg-white border-2 rounded-2xl p-8 transition-all duration-200 ${patientId ? 'hover:border-primary/50 hover:shadow-lg' : 'opacity-70 grayscale border-slate-100'}`}>
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
            <Video className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Start Video Call Session</h2>
          <p className="text-slate-500 mb-8 leading-relaxed h-20">
            Launch a secure Jitsi teletherapy session with the patient.
            After the call ends, you will automatically continue documentation in the AI Clinical Assistant.
          </p>
          <Button 
            onClick={handleVideoSession}
            disabled={!patientId || createVideoSessionMutation.isPending}
            className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            <Video className="h-5 w-5" />
            {createVideoSessionMutation.isPending ? 'Starting...' : 'Start Video Session'}
          </Button>
        </div>

        {/* Option 2: Direct AI */}
        <div className={`bg-white border-2 rounded-2xl p-8 transition-all duration-200 ${patientId ? 'hover:border-primary/50 hover:shadow-lg' : 'opacity-70 grayscale border-slate-100'}`}>
          <div className="bg-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-purple-100">
            <Sparkles className="h-8 w-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Direct AI Clinical Assistant</h2>
          <p className="text-slate-500 mb-8 leading-relaxed h-20">
            Open the clinical workspace directly without a video call.
            Perfect for in-person sessions, assessments, goal tracking, and rapid AI documentation.
          </p>
          <Button 
            onClick={handleDirectSession}
            disabled={!patientId || createDirectSessionMutation.isPending}
            className="w-full h-14 text-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            {createDirectSessionMutation.isPending ? 'Opening Workspace...' : 'Open Clinical Assistant'}
          </Button>
        </div>
      </div>
    </div>
  )
}
