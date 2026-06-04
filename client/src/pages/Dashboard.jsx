import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Calendar, AlertTriangle, FileText, Plus, Video, Activity } from 'lucide-react'
import useAuthStore, { ROLES } from '../store/authStore'
import { Skeleton } from '../components/ui/skeleton'

const Dashboard = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  
  // Today's appointments query
  const { data: appointments = [], isLoading: isApptsLoading } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => api.get('/appointments/today').then(r => r.data)
  })

  // Goal weekly summary query
  const { data: weeklySummary, isLoading: isWeeklyLoading } = useQuery({
    queryKey: ['goals', 'weekly'],
    queryFn: () => api.get('/goals/weekly-summary').then(r => r.data)
  })

  // Billing alerts query
  const { data: alertsData } = useQuery({
    queryKey: ['billing', 'alerts'],
    queryFn: () => api.get('/billing/alerts').then(r => r.data),
    enabled: user.role === ROLES.SLP || user.role === ROLES.ADMIN
  })

  // Sessions query to calculate pending notes count
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/sessions').then(r => r.data)
  })

  const isCurrentlyLoading = isApptsLoading || isWeeklyLoading || isSessionsLoading

  // Calculate pending notes count
  const pendingCount = isCurrentlyLoading ? 0 : sessions.filter(s => s.status === 'DRAFT' || s.status === 'PENDING_COSIGN').length

  // Map today's appointments
  const displayAppointments = isCurrentlyLoading ? [] : appointments.map((apt) => {
    const timeStr = new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return {
      id: apt.id,
      time: timeStr !== 'Invalid Date' ? timeStr : '09:00 AM',
      patientName: apt.patient?.name || 'IEP Screening',
      type: apt.type,
      status: apt.status,
      patientId: apt.patientId
    }
  })

  // Goal metrics
  const metPercentage = weeklySummary?.metPercentage || 0
  const inProgressPercentage = weeklySummary?.inProgressPercentage || 100
  const goalData = [
    { name: 'Met', value: metPercentage },
    { name: 'In Progress', value: inProgressPercentage }
  ]
  const COLORS = ['#10B981', '#E2E8F0']

  // Medicare alerts
  const kxAlerts = alertsData?.kxAlerts || []

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Welcome back, {user.name}</h1>
          <p className="text-slate-500 mt-1">Here's what's happening today.</p>
        </div>
        {(user.role === ROLES.SLP || user.role === ROLES.ADMIN) && (
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/patients/new')} className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> New Patient
            </Button>
            <Button variant="outline" onClick={() => navigate('/patients')} className="shadow-sm border-slate-200">
              Patients Directory
            </Button>
            <Button variant="outline" onClick={() => navigate('/scheduling')} className="shadow-sm border-slate-200">
              <Video className="mr-2 h-4 w-4 text-primary" /> Start Teletherapy
            </Button>
          </div>
        )}
      </div>

      {user.role !== ROLES.PARENT && kxAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-4 shadow-xs">
          <div className="p-2 bg-amber-100 rounded-full text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-900">Insurance Alert: Medicare Cap Limit reached</h4>
            <p className="text-sm text-amber-800 mt-1">
              The following patients are approaching or have exceeded their Medicare cap threshold. Append KX modifier for all future claims:
            </p>
            <ul className="list-disc ml-5 mt-1.5 text-xs text-amber-800 space-y-1">
              {kxAlerts.map((a, i) => (
                <li key={i}>
                  <strong>{a.patientName}</strong>: Accumulated ${a.spent.toFixed(2)} spend (Cap limit: ${a.cap})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Appointments Column */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> Today's Schedule
                </CardTitle>
                <CardDescription>
                  {isCurrentlyLoading ? 'Loading schedule...' : `${displayAppointments.length} sessions remaining today`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-4">
                {isCurrentlyLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-4 w-full">
                        <Skeleton className="h-4 w-16" />
                        <div className="h-10 w-[2px] bg-slate-200 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))
                ) : displayAppointments.length > 0 ? (
                  displayAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-semibold text-slate-900 w-20">{apt.time}</div>
                        <div className="h-10 w-[2px] bg-slate-200 rounded-full" />
                        <div>
                          <div className="font-bold text-slate-900">{apt.patientName}</div>
                          <div className="text-xs text-slate-500">{apt.type}</div>
                        </div>
                      </div>
                      <Badge variant={
                        apt.status === 'COMPLETED' ? 'success' : 
                        apt.status === 'SCHEDULED' ? 'outline' : 'default'
                      }>
                        {apt.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No appointments scheduled for today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Metrics Column */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-destructive" /> Pending Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isCurrentlyLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-20" />
                  <Skeleton className="h-10 w-full mt-2" />
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-heading font-bold text-destructive">{pendingCount}</span>
                    <span className="text-slate-500 mb-1">overdue SOAP notes</span>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/sessions/new')} className="w-full mt-6 text-sm">
                    Complete SOAP Note
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" /> Goal Attainment
              </CardTitle>
              <CardDescription>Across all patient goals this week</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {isCurrentlyLoading ? (
                <div className="flex flex-col items-center py-10 w-full">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <Skeleton className="h-6 w-24 mt-4" />
                </div>
              ) : (
                <>
                  <div className="h-48 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={goalData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {goalData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center -mt-28 mb-16">
                    <span className="text-3xl font-bold font-heading text-slate-900">{metPercentage}%</span>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Goals Met</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}

export default Dashboard
