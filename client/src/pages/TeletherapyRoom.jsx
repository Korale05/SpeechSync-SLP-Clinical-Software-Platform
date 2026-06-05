// client/src/pages/TeletherapyRoom.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Video, VideoOff, Circle, PhoneOff, Lock } from 'lucide-react'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const TeletherapyRoom = () => {
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
  
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [meetUrl, setMeetUrl] = useState('')
  const [tempMeetUrl, setTempMeetUrl] = useState('')

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

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: () => api.teletherapy.endSession(sessionId, sessionTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient'] });
      queryClient.invalidateQueries({ queryKey: ['patient-history'] });
      queryClient.invalidateQueries({ queryKey: ['patient-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      
      toast.success('Session completed! Navigating to Clinical Workspace.');
      navigate(`/clinical-assistant/${sessionId}`);
    },
    onError: (err) => {
      toast.error(`Failed to end session: ${err.message}`);
    }
  });

  const handleEndSession = () => {
    endSessionMutation.mutate();
  };

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

  const isEndingSession = endSessionMutation.isPending

  return (
    <div className="flex h-[calc(100vh-theme(spacing.20))] bg-slate-900 overflow-hidden relative">
      {/* Full Width Video Area */}
      <div className="w-full h-full flex flex-col relative">

        {/* Top Bar */}
        <div className="h-12 bg-slate-950/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 absolute top-0 w-full z-20">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Lock className="h-3.5 w-3.5 text-emerald-500" />
            <span>🔒 SECURE TELEHEALTH CONNECTION</span>
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

        {/* Video Mock / Meet Input */}
        <div className="flex-1 bg-slate-950 relative flex items-center justify-center pt-12">
          {meetUrl && meetUrl.includes('daily.co') ? (
            <div className="w-full h-full p-4 pb-16">
              <iframe
                src={meetUrl}
                allow="camera; microphone; fullscreen; speaker; display-capture"
                className="w-full h-full border border-slate-850 rounded-2xl bg-slate-950 shadow-2xl animate-in zoom-in-95 duration-300"
                title="Secure Teletherapy Session"
              />
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
                      placeholder="https://meet.google.com/..."
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
                    onClick={() => { if (meetUrl) window.open(meetUrl, '_blank') }}
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
                    className="border-slate-800 hover:bg-slate-800 text-slate-300 px-6 py-3 h-12 rounded-xl font-semibold bg-transparent"
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
              src="https://placehold.co/320x240/0f172a/94a3b8?text=Your+Camera"
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
            disabled={isEndingSession}
            className="h-12 px-6 rounded-full font-bold shadow-lg"
          >
            <PhoneOff className="mr-2 h-5 w-5" /> End Session
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TeletherapyRoom