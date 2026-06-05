import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Calendar, Video, Clock, Check, X, Plus, ShieldAlert, ChevronRight } from 'lucide-react'
import useAuthStore, { ROLES } from '../store/authStore'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'



const Scheduling = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    patientId: '',
    startTime: '',
    durationMinutes: '45',
    type: 'Speech Therapy',
    isTelepractice: false
  })

  const { data: appointments, isLoading: isApptsLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.appointments.getAll().then(res => res)
  })

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.patients.getAll().then(res => res),
    enabled: user.role === ROLES.SLP || user.role === ROLES.ADMIN
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.appointments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Session scheduled successfully!')
      setShowModal(false)
      setFormData({
        patientId: '',
        startTime: '',
        durationMinutes: '45',
        type: 'Speech Therapy',
        isTelepractice: false
      })
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`)
    }
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.appointments.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Appointment status updated')
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`)
    }
  })

  if (isApptsLoading) return <LoadingScreen />

  const handleCreate = (e) => {
    e.preventDefault()
    if (!formData.patientId && formData.type !== 'IEP Screening') {
      toast.error('Please select a patient')
      return
    }
    if (!formData.startTime) {
      toast.error('Please select start date and time')
      return
    }
    createMutation.mutate(formData)
  }

  const handleStatusChange = (id, newStatus) => {
    statusMutation.mutate({ id, status: newStatus })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Session Scheduling</h1>
          <p className="text-slate-500 mt-1">Book and manage diagnostic sessions, evaluations, and teletherapy appointments.</p>
        </div>
        {(user.role === ROLES.SLP || user.role === ROLES.ADMIN) && (
          <Button onClick={() => setShowModal(true)} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Book New Session
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Upcoming Appointments
              </CardTitle>
              <CardDescription>View status and teletherapy logs for scheduled clinical times.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointments && appointments.length > 0 ? (
                appointments.map((appt) => (
                  <div key={appt.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white rounded-lg border border-slate-100 flex flex-col items-center justify-center w-16 text-center shadow-xs">
                        <span className="text-xs font-bold uppercase text-primary">
                          {new Date(appt.startTime).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-lg font-extrabold text-slate-800">
                          {new Date(appt.startTime).toLocaleDateString('en-US', { day: 'numeric' })}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          {appt.patient?.name || 'IEP Screening'}
                          {appt.isTelepractice && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 flex items-center gap-1 py-0 px-1.5 text-[10px]">
                              <Video className="h-2.5 w-2.5" /> Teletherapy
                            </Badge>
                          )}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-slate-500 text-xs mt-1.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(appt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({appt.durationMinutes} min)
                          </span>
                          <span className="h-1 w-1 bg-slate-300 rounded-full" />
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{appt.type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                      <Badge variant={
                        appt.status === 'SCHEDULED' ? 'outline' : 
                        appt.status === 'COMPLETED' ? 'success' : 'destructive'
                      }>
                        {appt.status}
                      </Badge>
                      
                      {(user.role === ROLES.SLP || user.role === ROLES.ADMIN) && appt.status === 'SCHEDULED' && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleStatusChange(appt.id, 'COMPLETED')}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={() => handleStatusChange(appt.id, 'CANCELLED')}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Calendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No appointments scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side Details */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Scheduling Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-4">
              <p>Standard speech-language session slot configurations:</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Assessments:</strong> Typically 60 minutes. Standard standardized tests are GFTA-3 and CELF-5.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Therapy Sessions:</strong> Configured for 30-45 minutes. Requires GN plan of care modifier check.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>IEP Screenings:</strong> Batch scheduled for 30 minute screenings for school districts.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md shadow-2xl border-slate-200 bg-white max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <CardTitle className="text-xl">Schedule Session</CardTitle>
                <CardDescription>Configure a new clinical appointment.</CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Appointment Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Speech Therapy">Speech Therapy</option>
                    <option value="Evaluation">Evaluation</option>
                    <option value="IEP Screening">IEP Screening</option>
                  </select>
                </div>

                {formData.type !== 'IEP Screening' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</label>
                    <select
                      value={formData.patientId}
                      onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                      className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Select Patient --</option>
                      {patients?.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Start Time</label>
                  <Input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration (Minutes)</label>
                  <select
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isTelepractice"
                    checked={formData.isTelepractice}
                    onChange={(e) => setFormData({ ...formData, isTelepractice: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isTelepractice" className="text-sm text-slate-700">Telepractice (Daily.co session)</label>
                </div>
              </CardContent>
              <div className="flex gap-3 justify-end p-4 border-t border-slate-100 bg-slate-50">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Scheduling...' : 'Save Appointment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Scheduling
