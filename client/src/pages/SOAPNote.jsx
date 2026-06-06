import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Save, CheckCircle, FileSignature, Clock, AlertTriangle, Languages } from 'lucide-react'
import { streamSOAPNote, translateSOAPNote } from '../services/aiScribe'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const icd10Options = [
  { code: 'F80.0', desc: 'Phonological disorder' },
  { code: 'F80.1', desc: 'Expressive language disorder' },
  { code: 'F80.2', desc: 'Mixed receptive-expressive language disorder' },
  { code: 'F80.4', desc: 'Speech development delay due to hearing loss' },
  { code: 'F80.81', desc: 'Childhood onset fluency disorder (Stuttering)' },
  { code: 'F80.89', desc: 'Other developmental disorders of speech and language' },
  { code: 'R47.01', desc: 'Aphasia' },
  { code: 'R47.1', desc: 'Dysarthria and anarthria' },
  { code: 'R48.2', desc: 'Apraxia' },
  { code: 'R13.10', desc: 'Dysphagia, unspecified' }
]

const presets = {
  subjective: [
    "Client cooperative and highly engaged.",
    "Parent reports consistent practice at home.",
    "Client appeared fatigued and easily distracted."
  ],
  objective: [
    "Produced targets with 80% accuracy.",
    "Completed comprehension task with minimal cues.",
    "Fluency rate measured at 90% in sentences."
  ],
  assessment: [
    "Shows steady progress towards goals.",
    "Receptive language stable; expressive improving.",
    "Attention limited; benefited from tactile prompts."
  ],
  plan: [
    "Continue therapy twice weekly targeting phonemes.",
    "Assign home practice for parent coaching.",
    "Introduce conversational level tasks next."
  ]
}

const SOAPNote = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const queryPatientId = searchParams.get('patientId')
  const [selectedPatientId, setSelectedPatientId] = useState(queryPatientId || '')
  const [selectedGoals, setSelectedGoals] = useState({})
  const [goalProgressData, setGoalProgressData] = useState({})
  const [sessionType, setSessionType] = useState('Individual Speech Therapy')
  const [duration, setDuration] = useState('45')

  const [isDrafting, setIsDrafting] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState('English')
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  })

  // ICD-10 Search Component states
  const [selectedIcd10, setSelectedIcd10] = useState('F80.2')
  const [icdSearch, setIcdSearch] = useState('F80.2')
  const [icdDropdownOpen, setIcdDropdownOpen] = useState(false)

  // HEP Modal state
  const [hepModalOpen, setHepModalOpen] = useState(false)
  const [hepName, setHepName] = useState('R-phoneme Initial Practice')
  const [hepDescription, setHepDescription] = useState('')
  const [hepFrequency, setHepFrequency] = useState('Once daily')
  const [hepDueDate, setHepDueDate] = useState('')
  const [isAssigningHep, setIsAssigningHep] = useState(false)

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
    if (currentDraftSession) {
      if (currentDraftSession.soapNote) {
        setSoapData({
          subjective: currentDraftSession.soapNote.subjective || '',
          objective: currentDraftSession.soapNote.objective || '',
          assessment: currentDraftSession.soapNote.assessment || '',
          plan: currentDraftSession.soapNote.plan || ''
        })
      }
      if (currentDraftSession.durationMinutes) {
        setDuration(currentDraftSession.durationMinutes.toString())
      }
      if (currentDraftSession.icd10Codes && currentDraftSession.icd10Codes.length > 0) {
        setSelectedIcd10(currentDraftSession.icd10Codes[0])
        setIcdSearch(currentDraftSession.icd10Codes[0])
      }
    } else {
      setSoapData({ subjective: '', objective: '', assessment: '', plan: '' })
      if (selectedPatient) {
        const firstDiag = selectedPatient.diagnoses?.[0] || 'F80.2'
        setSelectedIcd10(firstDiag)
        setIcdSearch(firstDiag)
      }
    }
  }, [currentDraftSession, selectedPatientId, selectedPatient])

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
        setGoalProgressData(prev => ({ ...prev, [goalId]: goal.current || 0 }))
        setSoapData(prev => ({
          ...prev,
          objective: prev.objective 
            ? `${prev.objective}\n• Addressed Goal: ${goal.goalText} (Target: ${goal.target}%)`
            : `• Addressed Goal: ${goal.goalText} (Target: ${goal.target}%)`
        }))
      }
    } else {
      setGoalProgressData(prev => {
        const next = { ...prev }
        delete next[goalId]
        return next
      })
    }
  }

  const handleGoalProgressChange = (goalId, value) => {
    setGoalProgressData(prev => ({ ...prev, [goalId]: parseInt(value) || 0 }))
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
        
        // Robust char-by-char key-value extractor to handle backslash escapes and JSON streaming structure
        const extractField = (key) => {
          const keyStr = `"${key}"`;
          const keyIndex = accumulated.indexOf(keyStr);
          if (keyIndex === -1) return '';
          
          const colonIndex = accumulated.indexOf(':', keyIndex + keyStr.length);
          if (colonIndex === -1) return '';
          
          const valueStartIndex = accumulated.indexOf('"', colonIndex + 1);
          if (valueStartIndex === -1) return '';
          
          let value = '';
          let escaped = false;
          for (let i = valueStartIndex + 1; i < accumulated.length; i++) {
            const char = accumulated[i];
            if (escaped) {
              if (char === 'n') value += '\n';
              else if (char === 't') value += '\t';
              else value += char;
              escaped = false;
            } else if (char === '\\') {
              escaped = true;
            } else if (char === '"') {
              break;
            } else {
              value += char;
            }
          }
          return value;
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

  const handleTranslate = async () => {
    if (targetLanguage === 'English') return; // Default
    setIsTranslating(true);
    try {
      const translatedData = await translateSOAPNote(soapData, targetLanguage);
      setSoapData(prev => ({
        ...prev,
        subjective: translatedData.subjective || prev.subjective,
        objective: translatedData.objective || prev.objective,
        assessment: translatedData.assessment || prev.assessment,
        plan: translatedData.plan || prev.plan,
      }));
      toast.success(`Note translated to ${targetLanguage}`);
    } catch (error) {
      toast.error(`Translation failed: ${error.message}`);
    } finally {
      setIsTranslating(false);
    }
  }

  const handleSave = (status) => {
    // Only send goal progress if signing/locking the session
    const goalsToUpdate = status === 'LOCKED' || status === 'SIGNED' ? Object.keys(selectedGoals)
      .filter(id => selectedGoals[id])
      .map(id => ({
        goalId: id,
        value: goalProgressData[id] || 0
      })) : [];

    const payload = {
      patientId: selectedPatient.id,
      durationMinutes: parseInt(duration) || 45,
      cptCode: '92507',
      icd10Codes: [selectedIcd10],
      soapNote: soapData,
      goalProgressUpdates: goalsToUpdate,
      status
    }

    saveMutation.mutate({
      id: currentDraftSession?.id,
      payload
    })
  }

  const handleAssignHep = async (e) => {
    e.preventDefault()
    if (!hepName || !hepDescription) {
      toast.error('Please fill out all required fields')
      return
    }
    setIsAssigningHep(true)
    try {
      await api.exercises.assign({
        patientId: selectedPatient.id,
        name: hepName,
        description: hepDescription,
        frequency: hepFrequency,
        dueDate: hepDueDate ? new Date(hepDueDate).toISOString() : null
      })
      toast.success('Home Exercise Program successfully assigned!')
      setHepModalOpen(false)
      setHepDescription('')
      setHepDueDate('')
    } catch (err) {
      toast.error(`Failed to assign exercise: ${err.message}`)
    } finally {
      setIsAssigningHep(false)
    }
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

          {/* Searchable ICD-10 Dropdown */}
          <div className="relative">
            <label className="text-sm font-medium text-slate-700 mb-1 block">Primary ICD-10 Diagnosis</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Search ICD-10 code or desc..."
                value={icdSearch}
                onChange={(e) => {
                  setIcdSearch(e.target.value)
                  setIcdDropdownOpen(true)
                }}
                onFocus={() => setIcdDropdownOpen(true)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-xs"
              />
              <Badge variant="outline" className="h-10 px-3 flex items-center justify-center font-mono text-xs font-bold shrink-0 bg-slate-50 border-slate-200">
                {selectedIcd10}
              </Badge>
            </div>
            {icdDropdownOpen && (
              <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto">
                {icd10Options
                  .filter(opt => 
                    opt.code.toLowerCase().includes(icdSearch.toLowerCase()) || 
                    opt.desc.toLowerCase().includes(icdSearch.toLowerCase())
                  )
                  .map(opt => (
                    <div 
                      key={opt.code}
                      className="px-3 py-2 text-xs hover:bg-slate-100 cursor-pointer flex justify-between items-center transition-colors"
                      onClick={() => {
                        setSelectedIcd10(opt.code)
                        setIcdSearch(opt.code)
                        setIcdDropdownOpen(false)
                      }}
                    >
                      <span className="font-semibold text-slate-700">{opt.code}</span>
                      <span className="text-slate-500 truncate max-w-[200px]">{opt.desc}</span>
                    </div>
                  ))
                }
              </div>
            )}
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
                  <div className="flex flex-col w-full gap-2">
                    <div className="flex items-start gap-2.5">
                      <input 
                        type="checkbox" 
                        checked={!!selectedGoals[goal.id]}
                        onChange={(e) => handleGoalCheck(goal.id, e.target.checked)}
                        className="rounded text-primary focus:ring-primary h-4 w-4 mt-0.5 shrink-0" 
                      />
                      <span className="text-xs leading-normal">{goal.goalText}</span>
                    </div>
                    {!!selectedGoals[goal.id] && (
                      <div className="pl-6 flex items-center gap-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Session Accuracy %:</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={goalProgressData[goal.id] || 0}
                          onChange={(e) => handleGoalProgressChange(goal.id, e.target.value)}
                          className="w-16 h-7 text-xs border-slate-200 rounded px-2"
                        />
                      </div>
                    )}
                  </div>
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
            <div className="flex items-center gap-2">
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <option value="English">English</option>
                <option value="Marathi">Marathi</option>
                <option value="Hindi">Hindi</option>
                <option value="Telugu">Telugu</option>
                <option value="Tamil">Tamil</option>
              </select>
              <Button 
                onClick={handleTranslate} 
                disabled={isDrafting || isTranslating || targetLanguage === 'English' || !soapData.subjective}
                variant="outline"
                className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all rounded-lg"
              >
                {isTranslating ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4 text-indigo-500" />}
                {isTranslating ? 'Translating...' : 'Translate'}
              </Button>
              <Button 
                onClick={handleAIScribe} 
                disabled={isDrafting || isTranslating}
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all rounded-lg"
              >
                {isDrafting ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isDrafting ? 'Drafting...' : '✨ AI Scribe — Draft Note'}
              </Button>
            </div>
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
                  className="w-full min-h-[100px] p-4 resize-y focus:outline-none focus:ring-0 rounded-t-lg border-0 bg-transparent text-sm leading-relaxed"
                  placeholder="Parent/patient reports..."
                  value={soapData.subjective}
                  onChange={e => setSoapData({...soapData, subjective: e.target.value})}
                />
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/50 border-t border-slate-100 rounded-b-lg">
                  <span className="text-[10px] font-bold text-slate-400 self-center uppercase mr-1">PRESETS:</span>
                  {presets.subjective.map((preset, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow-sm"
                      onClick={() => {
                        setSoapData(prev => ({
                          ...prev,
                          subjective: prev.subjective ? `${prev.subjective} ${preset}` : preset
                        }))
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:shadow-xs transition-shadow bg-white">
              <CardHeader className="bg-slate-50 py-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold tracking-wide text-slate-700">O — OBJECTIVE</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <textarea 
                  className="w-full min-h-[120px] p-4 resize-y focus:outline-none focus:ring-0 rounded-t-lg border-0 bg-transparent text-sm leading-relaxed"
                  placeholder="Clinician observations, data collected..."
                  value={soapData.objective}
                  onChange={e => setSoapData({...soapData, objective: e.target.value})}
                />
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/50 border-t border-slate-100 rounded-b-lg">
                  <span className="text-[10px] font-bold text-slate-400 self-center uppercase mr-1">PRESETS:</span>
                  {presets.objective.map((preset, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow-sm"
                      onClick={() => {
                        setSoapData(prev => ({
                          ...prev,
                          objective: prev.objective ? `${prev.objective} ${preset}` : preset
                        }))
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:shadow-xs transition-shadow bg-white">
              <CardHeader className="bg-slate-50 py-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold tracking-wide text-slate-700">A — ASSESSMENT</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <textarea 
                  className="w-full min-h-[100px] p-4 resize-y focus:outline-none focus:ring-0 rounded-t-lg border-0 bg-transparent text-sm leading-relaxed"
                  placeholder="Clinical interpretation of progress..."
                  value={soapData.assessment}
                  onChange={e => setSoapData({...soapData, assessment: e.target.value})}
                />
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/50 border-t border-slate-100 rounded-b-lg">
                  <span className="text-[10px] font-bold text-slate-400 self-center uppercase mr-1">PRESETS:</span>
                  {presets.assessment.map((preset, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow-sm"
                      onClick={() => {
                        setSoapData(prev => ({
                          ...prev,
                          assessment: prev.assessment ? `${prev.assessment} ${preset}` : preset
                        }))
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 hover:shadow-xs transition-shadow bg-white">
              <CardHeader className="bg-slate-50 py-2.5 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold tracking-wide text-slate-700">P — PLAN</CardTitle>
                <Button 
                  size="xs" 
                  variant="outline" 
                  className="h-7 text-[11px] border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold flex items-center gap-1 shrink-0"
                  onClick={() => setHepModalOpen(true)}
                  type="button"
                >
                  <Sparkles className="h-3 w-3" /> HEP Exercise Builder
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <textarea 
                  className="w-full min-h-[100px] p-4 resize-y focus:outline-none focus:ring-0 rounded-t-lg border-0 bg-transparent text-sm leading-relaxed"
                  placeholder="Next steps, changes to treatment..."
                  value={soapData.plan}
                  onChange={e => setSoapData({...soapData, plan: e.target.value})}
                />
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/50 border-t border-slate-100 rounded-b-lg">
                  <span className="text-[10px] font-bold text-slate-400 self-center uppercase mr-1">PRESETS:</span>
                  {presets.plan.map((preset, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow-sm"
                      onClick={() => {
                        setSoapData(prev => ({
                          ...prev,
                          plan: prev.plan ? `${prev.plan} ${preset}` : preset
                        }))
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
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

      {/* Home Exercise Program (HEP) Builder Modal */}
      {hepModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="max-w-md w-full shadow-2xl border-slate-200 p-6 space-y-4 bg-white">
            <CardHeader className="p-0 pb-2 border-b">
              <CardTitle className="text-lg font-heading text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Home Exercise Program Builder
              </CardTitle>
              <CardDescription className="text-xs">
                Assign clinical speech practice exercises to <strong>{selectedPatient.name}</strong>.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAssignHep} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exercise Program Template</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  value={hepName}
                  onChange={(e) => setHepName(e.target.value)}
                >
                  <option>R-phoneme Initial Practice</option>
                  <option>S-phoneme Medial Practice</option>
                  <option>Linguistic comprehension exercises</option>
                  <option>Vocal range expansion</option>
                  <option>Custom Practice Routine</option>
                </select>
              </div>

              {hepName === 'Custom Practice Routine' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Title</label>
                  <Input 
                    placeholder="Enter custom exercise title..." 
                    value={hepName === 'Custom Practice Routine' ? '' : hepName}
                    onChange={(e) => setHepName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Instructions / Description</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary animate-in fade-in"
                  placeholder="Provide instruction details (e.g. Practice R sound in front of a mirror 10 times)..."
                  value={hepDescription}
                  onChange={(e) => setHepDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Frequency</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    value={hepFrequency}
                    onChange={(e) => setHepFrequency(e.target.value)}
                  >
                    <option>Once daily</option>
                    <option>Twice daily</option>
                    <option>3 times a week</option>
                    <option>Weekly</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Due Date</label>
                  <Input 
                    type="date"
                    value={hepDueDate}
                    onChange={(e) => setHepDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setHepModalOpen(false); setHepDescription(''); }}
                  disabled={isAssigningHep}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAssigningHep} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  {isAssigningHep ? 'Assigning...' : 'Assign to Parent Portal'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  )
}

export default SOAPNote
