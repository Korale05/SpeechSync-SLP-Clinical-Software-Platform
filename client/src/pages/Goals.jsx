import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Plus, Target, TrendingUp, FileText } from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const Goals = () => {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  
  const queryPatientId = searchParams.get('patientId')
  const [selectedPatientId, setSelectedPatientId] = useState(queryPatientId || '')
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Form states
  const [goalType, setGoalType] = useState('Short-Term')
  const [domain, setDomain] = useState('Articulation')
  const [goalText, setGoalText] = useState('')
  const [baseline, setBaseline] = useState('25')
  const [target, setTarget] = useState('80')
  const [cpt, setCpt] = useState('92507')
  const [icd, setIcd] = useState('F80.0')

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

  // Fetch goals for selected patient
  const { data: patientGoals = [], isLoading: isGoalsLoading } = useQuery({
    queryKey: ['patient-goals', selectedPatientId],
    queryFn: () => api.get(`/goals/patient/${selectedPatientId}`).then(res => res.data),
    enabled: !!selectedPatientId
  })

  // Active goal for trajectory display
  const [activeGoalId, setActiveGoalId] = useState('')
  
  useEffect(() => {
    if (patientGoals.length > 0 && !activeGoalId) {
      setActiveGoalId(patientGoals[0].id)
    }
  }, [patientGoals, activeGoalId])

  const activeGoal = patientGoals.find(g => g.id === activeGoalId) || patientGoals[0]

  // Fetch progress history for active goal
  const { data: progressHistory = [], isLoading: isProgressLoading } = useQuery({
    queryKey: ['goal-progress', activeGoal?.id],
    queryFn: () => api.get(`/goals/${activeGoal.id}/progress`).then(res => res.data),
    enabled: !!activeGoal?.id
  })

  const progressData = [
    { date: 'Baseline', accuracy: activeGoal?.baseline || 0 },
    ...progressHistory.map(p => ({
      date: new Date(p.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      accuracy: p.value
    }))
  ]

  // Add goal mutation
  const addGoalMutation = useMutation({
    mutationFn: (newGoal) => api.goals.create(newGoal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-goals', selectedPatientId] })
      toast.success('Goal successfully created!')
      setIsFormOpen(false)
      setGoalText('')
    },
    onError: (err) => {
      toast.error(`Failed to add goal: ${err.message}`)
    }
  })

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="text-primary text-sm font-medium">Accuracy: {payload[0].value}%</p>
          <p className="text-xs text-slate-500 mt-2 max-w-[200px]">Recorded via SOAP note/session logs.</p>
        </div>
      )
    }
    return null
  }

  const handleSaveGoal = () => {
    if (!goalText) {
      toast.error('Please enter a goal description')
      return
    }

    addGoalMutation.mutate({
      patientId: selectedPatient.id,
      domain: domain,
      goalText: goalText,
      baseline: parseInt(baseline) || 0,
      target: parseInt(target) || 80,
      cptCode: cpt,
      icd10Code: icd,
      targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 6 months target
    })
  }

  if (isPatientsLoading || isGoalsLoading) return <LoadingScreen />

  if (!selectedPatient) {
    return (
      <div className="p-8 text-center text-slate-500 italic max-w-xl mx-auto mt-20 bg-white border border-slate-200 rounded-2xl p-12">
        <h3 className="font-bold text-lg text-slate-800">No Patient Profile Available</h3>
        <p className="text-slate-400 text-sm mt-1">Please create a patient profile first to manage goals.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900 font-sans">Goals & Progress</h1>
          <p className="text-slate-500">Active caseload tracking for: <strong className="text-slate-800">{selectedPatient.name}</strong></p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            value={selectedPatientId}
            onChange={(e) => {
              setSelectedPatientId(e.target.value)
              setActiveGoalId('')
            }}
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button onClick={() => setIsFormOpen(!isFormOpen)} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Add New Goal
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Create SMART Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Goal Type</label>
                <select 
                  value={goalType} 
                  onChange={(e) => setGoalType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option>Short-Term</option>
                  <option>Long-Term</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Domain</label>
                <select 
                  value={domain} 
                  onChange={(e) => setDomain(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option>Articulation</option>
                  <option>Language</option>
                  <option>Fluency</option>
                  <option>Voice</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">SMART Goal Text</label>
              <textarea 
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                rows="3"
                placeholder="e.g., Aanya will produce /r/ in word-initial position with 80% accuracy in 3/4 trials by June 2026."
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Baseline (%)</label>
                <Input type="number" value={baseline} onChange={(e) => setBaseline(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Target (%)</label>
                <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Linked CPT</label>
                <Input value={cpt} onChange={(e) => setCpt(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Linked ICD-10</label>
                <Input value={icd} onChange={(e) => setIcd(e.target.value)} />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveGoal} disabled={addGoalMutation.isPending}>
                {addGoalMutation.isPending ? 'Saving...' : 'Save Goal'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trajectory & Sidebar Details */}
      {activeGoal ? (
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{domain}</Badge>
                <Badge variant={activeGoal.status === 'MET' ? 'success' : 'warning'}>{activeGoal.status}</Badge>
              </div>
              <CardTitle className="text-lg md:text-xl max-w-3xl leading-relaxed">{activeGoal.goalText}</CardTitle>
            </div>
            
            {patientGoals.length > 1 && (
              <div className="flex-shrink-0">
                <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">Switch Active Goal</label>
                <select 
                  className="flex h-9 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                  value={activeGoalId || activeGoal.id}
                  onChange={(e) => setActiveGoalId(e.target.value)}
                >
                  {patientGoals.map(g => (
                    <option key={g.id} value={g.id}>{g.domain} - {g.id.substring(0, 8)}</option>
                  ))}
                </select>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Trajectory Chart */}
            <div className="md:col-span-3 h-80">
              <h4 className="font-semibold text-sm text-slate-500 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Accuracy Trajectory
              </h4>
              {isProgressLoading ? (
                <div className="h-full flex items-center justify-center text-slate-400">Loading progress...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={activeGoal.target} stroke="#10B981" strokeDasharray="5 5" label={{ position: 'top', value: `Target ${activeGoal.target}%`, fill: '#10B981', fontSize: 12, fontWeight: 600 }} />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#2563EB" 
                      strokeWidth={3}
                      activeDot={{ r: 8, fill: '#2563EB', stroke: '#white', strokeWidth: 2 }}
                      dot={{ r: 5, fill: '#2563EB', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            
            {/* Sidebar Stats */}
            <div className="space-y-6 flex flex-col justify-center border-l border-slate-100 pl-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1 uppercase">Current Progress</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-heading text-slate-900">{activeGoal.current}%</span>
                  {activeGoal.current > activeGoal.baseline && (
                    <span className="text-xs font-bold text-accent flex items-center">
                      +{activeGoal.current - activeGoal.baseline}% <TrendingUp className="h-3 w-3 ml-0.5" />
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-0.5 uppercase">Baseline</p>
                  <span className="text-lg font-bold text-slate-700">{activeGoal.baseline}%</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-0.5 uppercase">Target</p>
                  <span className="text-lg font-bold text-slate-700">{activeGoal.target}%</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-0.5 uppercase">Target Date</p>
                <span className="text-slate-900 font-semibold text-sm">
                  {new Date(activeGoal.targetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              
              <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white border-slate-200">
                <FileText className="mr-2 h-3.5 w-3.5" /> Link to SOAP Note
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Target className="h-12 w-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 font-semibold">No active goals found for this patient.</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add New Goal" at the top to create one.</p>
        </div>
      )}

      {/* Goal Listing */}
      <div className="space-y-4">
        <h3 className="font-heading text-lg font-bold text-slate-900">All Patient Goals ({patientGoals.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patientGoals.map(g => (
            <Card 
              key={g.id} 
              onClick={() => setActiveGoalId(g.id)}
              className={`p-4 cursor-pointer hover:shadow-sm transition-all border bg-white ${activeGoalId === g.id ? 'border-primary bg-primary/5 shadow-xs' : 'border-slate-200'}`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <Badge variant="outline" className="bg-slate-100">{g.domain}</Badge>
                <Badge variant={g.status === 'MET' ? 'success' : 'warning'} className="text-[10px]">{g.status}</Badge>
              </div>
              <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-relaxed">{g.goalText}</p>
              <div className="mt-4 flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Baseline: <strong>{g.baseline}%</strong></span>
                <span>Current: <strong>{g.current}%</strong></span>
                <span>Target: <strong>{g.target}%</strong></span>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
    </div>
  )
}

export default Goals
