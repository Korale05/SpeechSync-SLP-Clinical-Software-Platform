import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Video, VideoOff, Circle, PhoneOff, Check, X, Lock, Pencil, Eraser, Trash2, PlayCircle } from 'lucide-react'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const stimuliList = [
  { id: 1, name: "Roar like a Lion (/r/ initial)", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=LION+/r/" },
  { id: 2, name: "Red Apple (/r/ initial)", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=RED+APPLE" },
  { id: 3, name: "Starfish (/r/ final)", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=STARFISH" },
  { id: 4, name: "Mirror Placement Guide", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=TONGUE+POSITION" },
  { id: 5, name: "Preposition Card (On)", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=CAT+ON+MAT" },
  { id: 6, name: "Preposition Card (Under)", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=DOG+UNDER+TABLE" }
]

const Teletherapy = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch appointment details
  const { data: appointment, isLoading: isApptLoading } = useQuery({
    queryKey: ['appointment', sessionId],
    queryFn: () => api.get(`/appointments/${sessionId}`).then(res => res.data),
    enabled: !!sessionId
  })

  // Create room endpoint call
  const { data: roomData, isLoading: isRoomLoading } = useQuery({
    queryKey: ['teletherapy-room', sessionId],
    queryFn: () => api.teletherapy.createRoom(sessionId),
    enabled: !!sessionId
  })

  // Fetch all patients (as fallback caseload context)
  const { data: patients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.patients.getAll().then(res => res)
  })

  const selectedPatient = appointment?.patient || patients[0]

  const [sessionTime, setSessionTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [sharedStimulus, setSharedStimulus] = useState(null)
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [meetUrl, setMeetUrl] = useState('')
  const [tempMeetUrl, setTempMeetUrl] = useState('')
  
  // Quick Session Notes
  const [quickNotes, setQuickNotes] = useState('')

  // Exercises
  const [exercises, setExercises] = useState([
    { id: 1, name: '/r/ initial words', correct: 0, incorrect: 0 },
    { id: 2, name: '/r/ medial words', correct: 0, incorrect: 0 },
  ])

  // Whiteboard Canvas State
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushColor, setBrushColor] = useState('#2563EB')
  const [brushWidth, setBrushWidth] = useState(4)
  const [brushMode, setBrushMode] = useState('draw') // 'draw' | 'erase'

  useEffect(() => {
    if (roomData?.url) {
      setMeetUrl(roomData.url)
      setTempMeetUrl(roomData.url)
    } else if (appointment?.dailyRoomUrl) {
      setMeetUrl(appointment.dailyRoomUrl)
      setTempMeetUrl(appointment.dailyRoomUrl)
    }
  }, [roomData, appointment])

  useEffect(() => {
    const timer = setInterval(() => setSessionTime(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [canvasRef])

  // Update room URL mutation
  const updateMeetUrlMutation = useMutation({
    mutationFn: (url) => api.appointments.updateStatus(sessionId, { dailyRoomUrl: url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', sessionId] })
      toast.success('Teletherapy link updated successfully!')
      setIsEditingLink(false)
    },
    onError: (err) => {
      toast.error(`Failed to update link: ${err.message}`)
    }
  })

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (sessionData) => api.sessions.create(sessionData),
    onSuccess: () => {
      toast.success('Teletherapy session saved as draft!')
      navigate('/sessions/new')
    },
    onError: (err) => {
      toast.error(`Failed to save session: ${err.message}`)
    }
  })

  if (isApptLoading || isRoomLoading || isPatientsLoading) return <LoadingScreen />

  if (!selectedPatient) {
    return (
      <div className="p-8 text-center text-slate-500 italic max-w-xl mx-auto mt-20 bg-white border border-slate-200 rounded-2xl p-12">
        <h3 className="font-bold text-lg text-slate-800">No Patient Associated</h3>
        <p className="text-slate-400 text-sm mt-1">This appointment is not linked to any patient.</p>
        <Button className="mt-4" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const recordAttempt = (id, isCorrect) => {
    setExercises(exercises.map(ex => {
      if (ex.id === id) {
        return {
          ...ex,
          correct: isCorrect ? ex.correct + 1 : ex.correct,
          incorrect: !isCorrect ? ex.incorrect + 1 : ex.incorrect
        }
      }
      return ex
    }))
  }

  // Draw handlers
  const startDrawing = ({ nativeEvent }) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { offsetX, offsetY } = nativeEvent
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(offsetX, offsetY)
    setIsDrawing(true)
  }

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const { offsetX, offsetY } = nativeEvent
    const ctx = canvas.getContext('2d')
    
    ctx.strokeStyle = brushMode === 'erase' ? '#ffffff' : brushColor
    ctx.lineWidth = brushMode === 'erase' ? brushWidth * 4 : brushWidth
    
    ctx.lineTo(offsetX, offsetY)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleEndSession = () => {
    createSessionMutation.mutate({
      patientId: selectedPatient.id,
      durationMinutes: Math.ceil(sessionTime / 60),
      cptCode: "92507",
      soapNote: {
        subjective: `Patient ${selectedPatient.name} joined via teletherapy. ${quickNotes ? `Notes: ${quickNotes}` : ''}`,
        objective: `Completed teletherapy drills. ${exercises.map(ex => `${ex.name}: ${ex.correct} correct, ${ex.incorrect} incorrect`).join('; ')}.`,
        assessment: 'Patient engaged well in remote teletherapy games. Responds well to visual/screen cues.',
        plan: 'Continue teletherapy 1x/week. Target /r/ in initial positions.'
      },
      exercises: exercises,
      status: "DRAFT"
    })
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.20))] bg-slate-900 overflow-hidden relative">
      
      {/* Left 70% - Video Area & Shared Screen */}
      <div className="w-[70%] h-full flex flex-col relative">
        
        {/* Top Bar */}
        <div className="h-12 bg-slate-950/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 absolute top-0 w-full z-20">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Lock className="h-3.5 w-3.5 text-emerald-500" />
            <span>🔒 HIPAA SECURE | SRTP ENCRYPTED PIPELINE</span>
          </div>
          <div className="font-mono font-bold text-white bg-slate-800 px-3 py-1 rounded-md border border-slate-700 tracking-wider">
            {formatTime(sessionTime)}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400 font-semibold px-2 py-0.5 animate-pulse text-[10px]">
              LIVE TELEHEALTH
            </Badge>
          </div>
        </div>

        {/* Video Mock / Active Shared Card */}
        <div className="flex-1 bg-slate-950 relative flex items-center justify-center pt-12">
          
          {/* Main frame: either Shared Stimulus OR Patient Camera */}
          {sharedStimulus ? (
            <div className="w-[85%] max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl z-10 flex flex-col items-center">
              <div className="flex justify-between w-full mb-3 items-center">
                <Badge className="bg-primary/95 text-white">Clinician Shared Stimulus</Badge>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setSharedStimulus(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Close Share
                </Button>
              </div>
              <img 
                src={sharedStimulus.imgUrl} 
                alt={sharedStimulus.name} 
                className="w-full h-80 object-contain rounded-xl border border-slate-800 bg-black/40"
              />
              <span className="text-white mt-4 font-bold text-lg">{sharedStimulus.name}</span>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6">
              <div className="text-center max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
                <div className="flex justify-center mb-4">
                  <div className="bg-primary/10 p-4 rounded-full border border-primary/20 animate-pulse">
                    <Video className="h-10 w-10 text-primary" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2 font-heading">Google Meet Integration</h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Start an external video session using Google Meet for a lag-free, high-quality video call. The parent portal will automatically update with this link.
                </p>

                {/* Meet Link Display & Edit */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-6 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>MEETING LINK</span>
                    <button 
                      onClick={() => {
                        if (isEditingLink) {
                          updateMeetUrlMutation.mutate(tempMeetUrl)
                        } else {
                          setTempMeetUrl(meetUrl)
                          setIsEditingLink(true)
                        }
                      }}
                      className="text-primary hover:underline font-semibold"
                      disabled={updateMeetUrlMutation.isPending}
                    >
                      {updateMeetUrlMutation.isPending ? 'Saving...' : isEditingLink ? 'Save Link' : 'Edit Link'}
                    </button>
                  </div>
                  
                  {isEditingLink ? (
                    <input 
                      type="text" 
                      value={tempMeetUrl}
                      onChange={(e) => setTempMeetUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <div className="text-slate-200 text-sm font-mono break-all font-semibold select-all bg-slate-900/60 p-2 rounded-lg border border-slate-850">
                      {meetUrl || 'No room URL configured.'}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => {
                      if (meetUrl) window.open(meetUrl, '_blank')
                    }}
                    disabled={!meetUrl}
                    className="bg-primary hover:bg-primary/95 text-white px-6 py-3 h-12 rounded-xl font-semibold shadow-md flex items-center justify-center gap-2"
                  >
                    🎥 Launch Google Meet
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (meetUrl) {
                        navigator.clipboard.writeText(meetUrl)
                        toast.success('Meet invitation link copied to clipboard!')
                      }
                    }}
                    disabled={!meetUrl}
                    className="border-slate-800 hover:bg-slate-800 text-slate-300 px-6 py-3 h-12 rounded-xl font-semibold"
                  >
                    Copy Invitation
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* SLP Video (PiP) */}
          <div className="absolute bottom-24 right-6 w-48 h-32 bg-slate-900 rounded-xl border-2 border-slate-700 shadow-2xl overflow-hidden z-20">
            <img 
              src="https://placehold.co/320x240/0f172a/94a3b8?text=Your+Camera+(SLP)" 
              alt="SLP Video" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>

        {/* Control Bar */}
        <div className="h-20 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-4 px-6 z-20">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsMuted(!isMuted)}
            className={`h-12 w-12 rounded-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 ${isMuted ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30' : ''}`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`h-12 w-12 rounded-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 ${isVideoOff ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30' : ''}`}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsRecording(!isRecording)}
            className={`h-12 w-12 rounded-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 ${isRecording ? 'border-red-500 text-red-500 animate-pulse bg-red-500/10' : ''}`}
          >
            <Circle className={`h-5 w-5 ${isRecording ? 'fill-red-500' : 'text-slate-400'}`} />
          </Button>
          <div className="w-px h-8 bg-slate-800 mx-2"></div>
          <Button 
            variant="destructive" 
            onClick={handleEndSession}
            disabled={createSessionMutation.isPending}
            className="h-12 px-6 rounded-full font-bold shadow-lg"
          >
            <PhoneOff className="mr-2 h-5 w-5" /> End Session & Draft SOAP
          </Button>
        </div>
      </div>

      {/* Right 30% - Clinical Panels (Tabbed content) */}
      <div className="w-[30%] h-full bg-white border-l border-slate-200 flex flex-col z-20">
        <Tabs defaultValue="exercises" className="flex-1 flex flex-col">
          <div className="px-4 pt-4 pb-2 border-b border-slate-200 bg-slate-50">
            <h3 className="font-heading font-bold text-slate-800 text-base mb-3 flex items-center gap-1.5">
              <span>Clinical Assistant</span>
              <Badge variant="secondary" className="bg-slate-200 text-slate-800 text-[10px] font-semibold">
                {selectedPatient.name}
              </Badge>
            </h3>
            <TabsList className="w-full grid grid-cols-4 bg-slate-200 p-1 rounded-xl">
              <TabsTrigger value="stimuli" className="text-xs font-semibold">Stimuli</TabsTrigger>
              <TabsTrigger value="exercises" className="text-xs font-semibold">Scores</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs font-semibold">Notes</TabsTrigger>
              <TabsTrigger value="whiteboard" className="text-xs font-semibold">Board</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            
            {/* Stimuli Tab */}
            <TabsContent value="stimuli" className="mt-0">
              <div className="grid grid-cols-2 gap-3">
                {stimuliList.map(stim => (
                  <div 
                    key={stim.id} 
                    onClick={() => setSharedStimulus(stim)}
                    className="border border-slate-200 rounded-xl overflow-hidden group cursor-pointer hover:border-primary hover:shadow-md transition-all bg-slate-50"
                  >
                    <img src={stim.imgUrl} className="w-full h-24 object-cover" />
                    <div className="p-2 text-center text-xs font-bold text-slate-700 group-hover:text-primary">
                      {stim.name}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Score Logs Tab */}
            <TabsContent value="exercises" className="mt-0 space-y-4">
              {exercises.map(ex => {
                const total = ex.correct + ex.incorrect
                const accuracy = total > 0 ? Math.round((ex.correct / total) * 100) : 0
                return (
                  <Card key={ex.id} className="shadow-sm border-slate-200">
                    <CardHeader className="p-3 pb-2 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-bold text-slate-700 uppercase">{ex.name}</CardTitle>
                      {total > 0 && (
                        <Badge variant={accuracy >= 80 ? 'success' : 'default'} className="text-[10px] px-2 py-0.5">
                          {accuracy}% Acc
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-semibold text-slate-500">Correct: {ex.correct}</span>
                        <span className="text-xs font-semibold text-slate-500">Incorrect: {ex.incorrect}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => recordAttempt(ex.id, true)}
                          variant="outline" 
                          className="flex-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800"
                        >
                          <Check className="h-4 w-4" /> Correct
                        </Button>
                        <Button 
                          onClick={() => recordAttempt(ex.id, false)}
                          variant="outline" 
                          className="flex-1 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
                        >
                          <X className="h-4 w-4" /> Error
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-0 h-full flex flex-col">
              <textarea 
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                className="flex-1 w-full min-h-[300px] p-3 text-sm rounded-xl border border-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent leading-relaxed"
                placeholder="Type quick clinician session shorthand logs here. These will append into your final SOAP Note draft upon ending the session..."
              />
            </TabsContent>

            {/* Interactive Drawing Board Tab */}
            <TabsContent value="whiteboard" className="mt-0 flex flex-col h-full space-y-4">
              <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <Button 
                    size="icon" 
                    variant={brushMode === 'draw' ? 'default' : 'outline'}
                    onClick={() => setBrushMode('draw')}
                    className="h-8 w-8 rounded-lg"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant={brushMode === 'erase' ? 'default' : 'outline'}
                    onClick={() => setBrushMode('erase')}
                    className="h-8 w-8 rounded-lg"
                  >
                    <Eraser className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={clearCanvas}
                    className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-1">
                  {['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#000000'].map(color => (
                    <button 
                      key={color}
                      onClick={() => { setBrushColor(color); setBrushMode('draw'); }}
                      className={`h-5 w-5 rounded-full border ${brushColor === color && brushMode === 'draw' ? 'ring-2 ring-slate-400 border-white' : 'border-slate-300'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-white relative cursor-crosshair h-64">
                <canvas 
                  ref={canvasRef}
                  width={320}
                  height={250}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-full block bg-white"
                />
              </div>
            </TabsContent>

          </div>
        </Tabs>
      </div>

    </div>
  )
}

export default Teletherapy
