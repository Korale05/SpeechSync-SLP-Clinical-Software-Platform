import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Calendar, Download, Users, Clock, X } from 'lucide-react'
import LoadingScreen from '../components/LoadingScreen'
import { toast } from 'react-hot-toast'

const IEP = () => {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false)
  const [screeningDate, setScreeningDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [screeningRoom, setScreeningRoom] = useState('Speech Lab A')

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['iep-students'],
    queryFn: () => api.get('/iep/students').then(res => {
      return res.data.map(student => {
        let goalProgress = student.currentGoalPercent || 0
        let status = 'On Track'
        
        if (goalProgress < 20) {
          status = 'At Risk'
        } else {
          const due = new Date(student.iepDueDate).getTime()
          const now = new Date().getTime()
          const diffDays = (due - now) / (1000 * 60 * 60 * 24)
          if (diffDays < 30) {
            status = 'Review Due'
          }
        }

        return {
          id: student.id,
          name: student.name,
          grade: student.grade || 'N/A',
          disorder: student.disorder || 'Phonological',
          dueDate: student.iepDueDate,
          goalProgress,
          status,
          patientId: student.patientId
        }
      })
    })
  })

  const handleBulkExport = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student to export.')
      return
    }
    try {
      const token = localStorage.getItem('speechsync_token')
      const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000')
      const response = await fetch(`${API_BASE_URL}/api/iep/bulk-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ studentIds: selectedStudentIds })
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Export failed')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `IEP_Bulk_Report_${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Bulk IEP summaries exported successfully!')
      setSelectedStudentIds([])
    } catch (err) {
      toast.error('Failed to export summaries: ' + err.message)
    }
  }

  const handleScheduleScreeningSubmit = async (e) => {
    e.preventDefault()
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student to schedule.')
      return
    }
    try {
      const response = await api.post('/iep/schedule-screening', {
        date: screeningDate,
        room: screeningRoom,
        studentIds: selectedStudentIds
      })
      toast.success(`Successfully scheduled screenings for ${response.data.scheduled} students!`)
      setIsScreeningModalOpen(false)
      setSelectedStudentIds([])
      queryClient.invalidateQueries({ queryKey: ['iep-students'] })
    } catch (err) {
      toast.error('Failed to schedule screenings: ' + err.message)
    }
  }

  if (isLoading) return <LoadingScreen />

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.disorder.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCaseload = students.length
  const reviewsDue = students.filter(s => s.status === 'Review Due').length

  const timelineStudents = [...students]
    .filter(s => s.dueDate !== 'N/A')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 bg-slate-50 min-h-full">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">IEP Coordination</h1>
          <p className="text-slate-500 mt-1">Manage student caseloads, IEP deadlines, and screenings across the district.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => {
              if (selectedStudentIds.length === 0) {
                toast.error('Please select at least one student to schedule.')
              } else {
                setIsScreeningModalOpen(true)
              }
            }}
            variant="outline" 
            className="bg-white"
          >
            <Calendar className="mr-2 h-4 w-4" /> Schedule Bulk Screening ({selectedStudentIds.length})
          </Button>
          <Button 
            onClick={handleBulkExport}
            className="shadow-sm"
          >
            <Download className="mr-2 h-4 w-4" /> Export Progress Summaries ({selectedStudentIds.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* KPI Cards */}
        <Card className="shadow-sm border-slate-200 bg-white animate-in slide-in-from-top-4 duration-300">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg"><Users className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Caseload</p>
              <h3 className="text-2xl font-bold font-heading text-slate-900">{activeCaseload}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-warning/20 bg-warning/5 animate-in slide-in-from-top-4 duration-300 delay-75">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-warning/20 text-amber-700 rounded-lg"><Clock className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-amber-800">Reviews Due &lt;30 days</p>
              <h3 className="text-2xl font-bold font-heading text-amber-900">{reviewsDue}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Student IEP Roster</CardTitle>
            <CardDescription>Filter by grade, status, or IEP due date</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              className="pl-9 bg-slate-50 border-slate-200" 
              placeholder="Search students..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(filteredStudents.map(s => s.id))
                        } else {
                          setSelectedStudentIds([])
                        }
                      }}
                      checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                    />
                  </th>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Grade</th>
                  <th className="px-6 py-4">Primary Disorder</th>
                  <th className="px-6 py-4">IEP Due Date</th>
                  <th className="px-6 py-4">Goal Progress</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds([...selectedStudentIds, s.id])
                          } else {
                            setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id))
                          }
                        }}
                        checked={selectedStudentIds.includes(s.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{s.name}</td>
                    <td className="px-6 py-4 text-slate-600">{s.grade}</td>
                    <td className="px-6 py-4 text-slate-600">{s.disorder}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {s.dueDate !== 'N/A' ? new Date(s.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-slate-100 rounded-full h-2 max-w-[100px]">
                          <div 
                            className={`h-2 rounded-full ${s.goalProgress > 80 ? 'bg-accent' : s.goalProgress < 20 ? 'bg-destructive' : 'bg-primary'}`} 
                            style={{ width: `${s.goalProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{s.goalProgress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        s.status === 'On Track' ? 'success' : 
                        s.status === 'Review Due' ? 'warning' : 'destructive'
                      }>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="outline" size="sm" className="h-8 bg-white">View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Mini Gantt View / Timeline */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2"><Calendar className="h-5 w-5 text-primary"/> IEP Milestone Timeline</CardTitle>
          <CardDescription>Upcoming ARD meetings and re-evaluations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative pt-4 pl-4 border-l-2 border-slate-200 ml-4 space-y-8">
            {timelineStudents.length > 0 ? (
              timelineStudents.map((s) => (
                <div key={s.id} className="relative">
                  <div className={`absolute -left-[25px] h-4 w-4 rounded-full border-2 border-white shadow-sm ${s.status === 'Review Due' ? 'bg-amber-500' : s.status === 'At Risk' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                  <div className={`bg-white p-4 rounded-lg border shadow-sm ml-2 ${s.status === 'Review Due' ? 'border-amber-200 shadow-amber-50/50' : s.status === 'At Risk' ? 'border-rose-200 shadow-rose-50/50' : 'border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-semibold text-slate-900">{s.status === 'Review Due' ? 'Annual Review (ARD)' : 'IEP Milestone'} - {s.name}</h4>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${s.status === 'Review Due' ? 'text-amber-700 bg-amber-50' : s.status === 'At Risk' ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'}`}>
                        {new Date(s.dueDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Goal Progress: {s.goalProgress}% | Primary diagnosis focus: {s.disorder}.</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No upcoming IEP milestones.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Bulk Screening Modal */}
      {isScreeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" /> Schedule Bulk Screening
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Scheduling {selectedStudentIds.length} students in 30-minute intervals.</p>
              </div>
              <button onClick={() => setIsScreeningModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleScheduleScreeningSubmit} className="p-5 space-y-4">
              {/* Screening Date */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Start Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={screeningDate}
                  onChange={e => setScreeningDate(e.target.value)}
                  required
                  className="border-slate-200"
                />
              </div>

              {/* Room Location */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Screening Room / Location
                </label>
                <Input
                  type="text"
                  value={screeningRoom}
                  onChange={e => setScreeningRoom(e.target.value)}
                  placeholder="E.g. Room 102 / Speech Lab"
                  required
                  className="border-slate-200"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsScreeningModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                  Confirm Schedule
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default IEP
