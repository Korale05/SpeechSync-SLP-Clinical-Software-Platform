import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Calendar, MessageCircle, PlayCircle, Download, CheckCircle2, Send, X } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const Portal = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Chat window state
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [newMessageText, setNewMessageText] = useState('')
  const chatEndRef = React.useRef(null)

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

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => api.get('/messages').then(res => res.data),
    enabled: !!user?.id && isChatOpen,
    refetchInterval: 5000
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (bodyText) => api.messages.sendMessage({
      body: bodyText,
      subject: `Message from Parent (${user?.name})`,
      patientId: child?.id
    }),
    onSuccess: () => {
      setNewMessageText('')
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
    onError: (err) => {
      toast.error('Failed to send message: ' + err.message)
    }
  })

  // Scroll to bottom on message updates
  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isChatOpen])

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
            <Button 
              onClick={() => setIsChatOpen(true)}
              size="lg" 
              className="rounded-full shadow-sm bg-primary hover:bg-primary/90 text-white font-semibold px-6"
            >
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
                  {child?.appointments && child.appointments.length > 0 ? (
                    <>
                      <p className="text-sm font-bold text-slate-800 mb-1">
                        {new Date(child.appointments[0].startTime).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-2xl font-bold font-heading text-slate-900 mb-6">
                        {new Date(child.appointments[0].startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <Button 
                        onClick={() => {
                          const apptUrl = child.appointments[0].dailyRoomUrl;
                          if (apptUrl) {
                            window.open(apptUrl, '_blank');
                          } else {
                            toast.error('The therapist has not opened the teletherapy room yet. Please refresh shortly.');
                          }
                        }}
                        className="w-full rounded-xl h-12 text-base font-semibold shadow-sm bg-primary hover:bg-primary/95 text-white"
                      >
                        🎥 Join Teletherapy Room
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold font-heading text-slate-900 mb-6">Not Scheduled</p>
                      <Button 
                        disabled
                        className="w-full rounded-xl h-12 text-base font-semibold shadow-sm bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      >
                        No Active Room
                      </Button>
                    </>
                  )}
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
                <Button
                  variant="outline"
                  className="w-full mt-4 rounded-xl text-primary border-primary/20 hover:bg-primary/5"
                  onClick={async () => {
                    try {
                      await api.downloadSecureFile(`/reports/iep/${child.id}`, `${child.name}-Progress-Report.pdf`)
                      toast.success('Progress Report downloaded successfully')
                    } catch (err) {
                      toast.error('Failed to download progress report: ' + err.message)
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" /> Download Progress Report
                </Button>
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

      {/* Slide-over Chat Panel */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col transform animate-in slide-in-from-right duration-250">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  SLP
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Therapist Chat</h3>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span> Secure Clinical Line
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.length > 0 ? (
                [...messages].reverse().map((msg) => {
                  const isMe = msg.fromUserId === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isMe 
                          ? 'bg-primary text-white rounded-tr-none shadow-sm' 
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/80 shadow-2xs'
                      }`}>
                        <p>{msg.body}</p>
                        <span className={`text-[8px] block mt-1.5 text-right ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                  <MessageCircle className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">No messages yet</p>
                  <p className="text-[10px] text-slate-400/80 mt-0.5">Send a message to start communicating with your therapist.</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newMessageText.trim()) return;
              sendMessageMutation.mutate(newMessageText.trim());
            }} className="p-3 border-t border-slate-100 flex gap-2 bg-white">
              <input 
                type="text"
                value={newMessageText}
                onChange={e => setNewMessageText(e.target.value)}
                placeholder="Type a message to the therapist..."
                className="flex-1 h-9 rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-white transition-all"
              />
              <Button 
                type="submit"
                disabled={sendMessageMutation.isPending || !newMessageText.trim()}
                className="h-9 w-9 rounded-lg bg-primary hover:bg-primary/95 text-white flex items-center justify-center p-0 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Portal
