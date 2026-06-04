import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Calendar, MessageCircle, PlayCircle, Download, CheckCircle2 } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const Portal = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch Patients caseload (parent gets only their children)
  const { data: patients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.patients.getAll().then(res => res)
  })

  const child = patients.find(p => p.guardianEmail === user?.email) || patients[0]

  // Fetch goals for this child
  const { data: childGoals = [], isLoading: isGoalsLoading } = useQuery({
    queryKey: ['patient-goals', child?.id],
    queryFn: () => api.get(`/goals/patient/${child.id}`).then(res => res.data),
    enabled: !!child?.id
  })

  // Fetch home exercises for this child
  const { data: exercises = [], isLoading: isExercisesLoading } = useQuery({
    queryKey: ['patient-exercises', child?.id],
    queryFn: () => api.exercises.getAll(child.id).then(res => res),
    enabled: !!child?.id
  })

  // Update exercise status mutation
  const updateExerciseMutation = useMutation({
    mutationFn: ({ id, completed }) => api.exercises.updateStatus(id, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-exercises', child?.id] })
      toast.success('Exercise status updated successfully!')
    },
    onError: (err) => {
      toast.error(`Failed to update exercise: ${err.message}`)
    }
  })

  if (isPatientsLoading || isGoalsLoading || isExercisesLoading) return <LoadingScreen />

  if (!child) {
    return (
      <div className="p-8 text-center text-slate-500 italic max-w-xl mx-auto mt-20 bg-white border border-slate-200 rounded-2xl p-12">
        <h3 className="font-bold text-lg text-slate-800">No Linked Child Found</h3>
        <p className="text-slate-400 text-sm mt-1">Please contact your administrator to link your profile to your child's record.</p>
      </div>
    )
  }

  const metCount = childGoals.filter(g => g.status === 'MET').length
  const pct = childGoals.length ? Math.round((metCount / childGoals.length) * 100) : 0

  const goalData = [
    { name: 'Met', value: pct },
    { name: 'Remaining', value: 100 - pct },
  ]
  const COLORS = ['#10B981', '#E2E8F0']

  const completedExercisesCount = exercises.filter(ex => ex.completedAt).length

  return (
    <div className="min-h-[calc(100vh-theme(spacing.20))] bg-slate-50 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h1 className="font-heading text-3xl font-bold text-slate-900">Welcome, {user?.name?.split(' ')[0] || 'Parent'}!</h1>
              <p className="text-slate-600 mt-2 text-lg">Here's the latest on {child.name}'s speech therapy journey.</p>
            </div>
            <Button size="lg" className="rounded-full shadow-sm bg-primary hover:bg-primary/90 text-white font-semibold px-6">
              <MessageCircle className="mr-2 h-5 w-5" /> Message Therapist
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Progress & Appointments */}
          <div className="lg:col-span-1 space-y-6">
            
            <Card className="rounded-2xl shadow-sm border-slate-200 overflow-hidden bg-white">
              <div className="bg-primary/5 p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Next Session
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Upcoming Appointment</p>
                  <p className="text-3xl font-bold font-heading text-slate-900 mb-6">Scheduled</p>
                  <Button 
                    onClick={() => window.open(child.telepracticeUrl || 'https://daily.co', '_blank')}
                    className="w-full rounded-xl h-12 text-base font-semibold shadow-sm bg-primary hover:bg-primary/95 text-white"
                  >
                    🎥 Join Teletherapy
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm border-slate-200 bg-white">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Goal Progress</CardTitle>
                <CardDescription>Primary Articulation Goals</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-40 w-full mt-2 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={goalData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                        {goalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold font-heading text-slate-900">{pct}%</span>
                  </div>
                </div>
                <p className="text-center text-sm text-slate-600 mt-2 font-medium">
                  {child.name} is making great progress on goals!
                </p>
                <a 
                  href={api.reports.getDownloadUrl(child.id)} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full"
                >
                  <Button variant="outline" className="w-full mt-4 rounded-xl text-primary border-primary/20 hover:bg-primary/5">
                    <Download className="mr-2 h-4 w-4" /> Download Progress Report
                  </Button>
                </a>
              </CardContent>
            </Card>

          </div>

          {/* Home Exercises */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl shadow-sm border-slate-200 h-full bg-white">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">Home Practice</CardTitle>
                    <CardDescription>Activities assigned by your clinician this week</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-accent/10 text-accent font-semibold px-3 py-1">
                    {completedExercisesCount}/{exercises.length} Completed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                {exercises.map((ex) => (
                  <div 
                    key={ex.id}
                    className={`flex flex-col sm:flex-row gap-4 p-4 rounded-xl border transition-all ${
                      ex.completedAt ? 'border-accent/30 bg-accent/5' : 'border-slate-100 bg-white hover:shadow-xs'
                    }`}
                  >
                    <div className="w-full sm:w-32 h-24 bg-slate-100 rounded-lg relative overflow-hidden flex-shrink-0 group cursor-pointer">
                      <img src="https://placehold.co/300x200/e2e8f0/64748b?text=Practice" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center group-hover:bg-slate-900/40 transition-colors">
                        <PlayCircle className="h-8 w-8 text-white opacity-90" />
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-slate-900 text-lg">{ex.name}</h4>
                          {ex.completedAt && <CheckCircle2 className="h-6 w-6 text-accent flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{ex.description}</p>
                        <p className="text-xs text-slate-400 mt-1">Frequency: {ex.frequency}</p>
                      </div>
                      <div className="mt-3">
                        {!ex.completedAt ? (
                          <Button 
                            variant="outline" 
                            className="rounded-lg text-slate-500 border-slate-200 hover:text-accent hover:border-accent hover:bg-accent/5"
                            onClick={() => updateExerciseMutation.mutate({ id: ex.id, completed: true })}
                            disabled={updateExerciseMutation.isPending}
                          >
                            Mark Complete
                          </Button>
                        ) : (
                          <div className="text-sm font-medium text-accent">
                            Completed on {new Date(ex.completedAt).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {exercises.length === 0 && (
                  <p className="text-center text-slate-400 italic py-8">No home practice exercises assigned yet.</p>
                )}

              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Portal
