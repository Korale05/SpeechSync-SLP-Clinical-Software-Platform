import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Save, CheckCircle, FileSignature, Clock, AlertTriangle } from 'lucide-react'
import { streamSOAPNote } from '../services/aiScribe'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const SOAPNote = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const queryPatientId = searchParams.get('patientId')
  const [selectedPatientId, setSelectedPatientId] = useState(queryPatientId || '')
  const [selectedGoals, setSelectedGoals] = useState({})
  const [sessionType, setSessionType] = useState('Individual Speech Therapy')
  const [duration, setDuration] = useState('45')

  const [isDrafting, setIsDrafting] = useState(false)
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  })

  // Fetch Patients caseload
  const { data: patients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.patients.getAll().then(res => res)
  })

  // Set default patient if caseload is loaded
  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id)
    }
  }, [patients, selectedPatientId])

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0]
  const patientGoals = selectedPatient?.goals || []

  // Fetch all sessions to find patient's active draft
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.sessions.getAll().then(res => res)
  })

  const currentDraftSession = sessions.find(s => s.patientId === selectedPatient?.id && s.status === 'DRAFT')

  // Load existing draft if present
  useEffect(() => {
    if (currentDraftSession && currentDraftSession.soapNote) {
      setSoapData({
        subjective: currentDraftSession.soapNote.subjective || '',
        objective: currentDraftSession.soapNote.objective || '',
        assessment: currentDraftSession.soapNote.assessment || '',
        plan: currentDraftSession.soapNote.plan || ''
      })
      if (currentDraftSession.durationMinutes) {
        setDuration(currentDraftSession.durationMinutes.toString())
      }
    } else {
      setSoapData({ subjective: '', objective: '', assessment: '', plan: '' })
    }
  }, [currentDraftSession, selectedPatientId])

  // Save session mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return api.sessions.update(data.id, data.payload)
      } else {
        return api.sessions.create(data.payload)
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['patient', selectedPatient?.id] })
      toast.success(data.status === 'DRAFT' ? 'Draft saved successfully!' : 'SOAP Note signed and locked!')
      navigate(`/patients/${selectedPatient?.id}`)
    },
    onError: (err) => {
      toast.error(`Error saving: ${err.message}`)
    }
  })

  if (isPatientsLoading || isSessionsLoading) return <LoadingScreen />

  if (!selectedPatient) {
    return (
      <div className="p-8 text-center text-slate-500 italic max-w-xl mx-auto mt-20 bg-white border border-slate-200 rounded-2xl p-12">
        <h3 className="font-bold text-lg text-slate-800">No Patient Profile Available</h3>
        <p className="text-slate-400 text-sm mt-1">Please create a patient profile first to document SOAP notes.</p>
      </div>
    )
  }

  // Handle checking a goal: auto-populates objective text with target
  const handleGoalCheck = (goalId, checked) => {
    setSelectedGoals(prev => ({ ...prev, [goalId]: checked }))
    
    if (checked) {
      const goal = patientGoals.find(g => g.id === goalId)
      if (goal) {
        setSoapData(prev => ({
          ...prev,
          objective: prev.objective 
            ? `${prev.objective}\n• Addressed Goal: ${goal.goalText} (Accuracy: ${goal.current}%)`
            : `• Addressed Goal: ${goal.goalText} (Accuracy: ${goal.current}%)`
        }))
      }
    }
  }

  // AI Scribe Stream Handler
  const handleAIScribe = () => {
    setIsDrafting(true)
    setSoapData({ subjective: '', objective: '', assessment: '', plan: '' })
    
    let accumulated = ''
    const sessionData = {
      patient: selectedPatient,
      sessionType: sessionType,
      duration: duration,
      exercises: currentDraftSession?.exercises || [
        { name: '/r/ initial words', correct: 25, incorrect: 15 }
      ],
      goals: Object.keys(selectedGoals)
        .filter(id => selectedGoals[id])
        .map(id => patientGoals.find(g => g.id === id)?.goalText || '')
    }

    streamSOAPNote(
      sessionData,
      (chunk) => {
        accumulated += chunk
        
        const extractField = (key) => {
          const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*)`)
          const match = accumulated.match(regex)
          if (match) {
            return match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\t/g, '\t')
          }
          return ''
        }

        setSoapData({
          subjective: extractField('subjective'),
          objective: extractField('objective'),
          assessment: extractField('assessment'),
          plan: extractField('plan')
        })
      },
      () => {
        setIsDrafting(false)
      }
    )
  }

  const handleSave = (status) => {
    const payload = {
      patientId: selectedPatient.id,
      durationMinutes: parseInt(duration) || 45,
      cptCode: '92507',
      soapNote: soapData,
      status
    }

    saveMutation.mutate({
      id: currentDraftSession?.id,
      payload
    })
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.20))] bg-slate-50">
      
      {/* Left Panel - Context */}
      <div className="w-1/3 border-r border-slate-200 bg-white p-6 overflow-y-auto">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-900">Session Setup</h2>
            <p className="text-sm text-slate-500">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          {currentDraftSession && (
            <Badge variant="warning" className="animate-pulse">Active Draft</Badge>
          )}
        </div>

        <div className="space-y-5">
          {/* Patient Selection Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Select Patient</label>
            <select 
              className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value)
                setSelectedGoals({})
              }}
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <Card className="shadow-sm border-slate-200 bg-slate-50/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-bold text-slate-800">
                {selectedPatient.name}
              </CardTitle>
              <CardDescription className="text-xs">
                DOB: {new Date(selectedPatient.dob).toLocaleDateString('en-IN')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 space-y-2">
              <div>
                <strong>Diagnoses:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {selectedPatient.diagnoses.map((diag, i) => (
                    <li key={i}>{diag}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Session Type</label>
            <select 
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option>Individual Speech Therapy</option>
              <option>Group Speech Therapy</option>
              <option>Evaluation</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Duration</label>
              <select 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">CPT Code</label>
              <Input defaultValue="92507" readOnly className="bg-slate-100 font-semibold" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Primary ICD-10</label>
            <Input defaultValue={selectedPatient.diagnoses[0] || 'F80.2'} readOnly className="bg-slate-100 font-semibold text-xs" />
          </div>

          {/* Goals Selection */}
          <div className="pt-4 border-t border-slate-100">
            <label className="text-sm font-bold text-slate-800 mb-2 block">Linked Goals Addressed</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {patientGoals.map((goal) => (
                <div 
                  key={goal.id} 
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
                    selectedGoals[goal.id] 
                      ? 'bg-primary/5 border-primary/20 text-slate-900' 
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={!!selectedGoals[goal.id]}
                    onChange={(e) => handleGoalCheck(goal.id, e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4 mt-0.5" 
                  />
                  <span className="text-xs leading-normal">{goal.goalText}</span>
                </div>
              ))}
              {patientGoals.length === 0 && (
                <p className="text-xs italic text-slate-400">No active goals found for this patient.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - SOAP Editor */}
      <div className="w-2/3 p-6 overflow-y-auto relative flex flex-col justify-between bg-white">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-heading text-2xl font-bold text-slate-900">SOAP Note Editor</h2>
            <Button 
              onClick={handleAIScribe} 
              disabled={isDrafting}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all rounded-lg"
            >
              {isDrafting ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isDrafting ? 'Drafting...' : '✨ AI Scribe — Draft Note'}
            </Button>
          </div>

          {isDrafting && (
            <div className="mb-4 p-3.5 bg-purple-50 border border-purple-200 rounded-xl flex gap-3 text-purple-900 text-sm items-center shadow-xs animate-pulse">
              <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0 animate-spin" />
              <span className="font-medium">AI Scribe is streaming SOAP fields from Groq API (llama-3.3-70b-versatile)...</span>
            </div>
          )}

          {soapData.subjective && !isDrafting && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-900 text-sm items-center shadow-xs">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <span className="font-semibold">AI Draft — Please review and edit before signing or saving.</span>
            </div>
          )}

          <div className="space-y-4 pb-28">
            <Card className="shadow-sm border-slate-200 hover:shadow-xs transition-shadow bg-white">
              <CardHeader className="bg-slate-50 py-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold tracking-wide text-slate-700">S — SUBJECTIVE</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <textarea 
                  className="w-full min-h-[100px] p-4 resize-y focus:outline-none focus:ring-0 rounded-b-lg border-0 bg-transparent text-sm leading-relaxed"
                  placeholder="Parent/patient reports..."
                  value={soapData.subjective}
                  onChange={e => setSoapData({...soapData, subjective: e.target.value})}
                />
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:shadow-xs transition-shadow bg-white">
              <CardHeader className="bg-slate-50 py-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold tracking-wide text-slate-700">O — OBJECTIVE</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <textarea 
                  className="w-full min-h-[120px] p-4 resize-y focus:outline-none focus:ring-0 rounded-b-lg border-0 bg-transparent text-sm leading-relaxed"
                  placeholder="Clinician observations, data collected..."
                  value={soapData.objective}
                  onChange={e => setSoapData({...soapData, objective: e.target.value})}
                />
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:shadow-xs transition-shadow bg-white">
              <CardHeader className="bg-slate-50 py-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold tracking-wide text-slate-700">A — ASSESSMENT</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <textarea 
                  className="w-full min-h-[100px] p-4 resize-y focus:outline-none focus:ring-0 rounded-b-lg border-0 bg-transparent text-sm leading-relaxed"
                  placeholder="Clinical interpretation of progress..."
                  value={soapData.assessment}
                  onChange={e => setSoapData({...soapData, assessment: e.target.value})}
                />
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:shadow-xs transition-shadow bg-white">
              <CardHeader className="bg-slate-50 py-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold tracking-wide text-slate-700">P — PLAN</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <textarea 
                  className="w-full min-h-[100px] p-4 resize-y focus:outline-none focus:ring-0 rounded-b-lg border-0 bg-transparent text-sm leading-relaxed"
                  placeholder="Next steps, changes to treatment..."
                  value={soapData.plan}
                  onChange={e => setSoapData({...soapData, plan: e.target.value})}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-10">
          <Button variant="outline" onClick={() => handleSave('DRAFT')} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" /> Save Draft
          </Button>
          <Button variant="outline" onClick={() => handleSave('PENDING_COSIGN')} disabled={saveMutation.isPending}>
            <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Submit for Co-sign
          </Button>
          <Button onClick={() => handleSave('LOCKED')} disabled={saveMutation.isPending}>
            <FileSignature className="mr-2 h-4 w-4" /> Sign & Lock Note
          </Button>
        </div>
      </div>

    </div>
  )
}

export default SOAPNote
