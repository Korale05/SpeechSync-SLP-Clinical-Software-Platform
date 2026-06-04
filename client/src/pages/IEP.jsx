import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Calendar, Download, Users, Clock } from 'lucide-react'
import LoadingScreen from '../components/LoadingScreen'

const IEP = () => {
  const [searchQuery, setSearchQuery] = useState('')

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['iep-students'],
    queryFn: () => api.patients.getAll('school').then(patients => {
      return patients.map(p => {
        let goalProgress = 0
        if (p.goals && p.goals.length > 0) {
          const sum = p.goals.reduce((acc, g) => {
            const target = g.target || 100
            const ratio = g.current / target
            return acc + ratio
          }, 0)
          goalProgress = Math.round((sum / p.goals.length) * 100)
        }

        let status = 'On Track'
        if (goalProgress < 20) {
          status = 'At Risk'
        } else if (p.metadata?.iepDueDate) {
          const due = new Date(p.metadata.iepDueDate).getTime()
          const now = new Date().getTime()
          const diffDays = (due - now) / (1000 * 60 * 60 * 24)
          if (diffDays < 30) {
            status = 'Review Due'
          }
        }

        return {
          id: p.id,
          name: p.name,
          grade: p.metadata?.grade || 'N/A',
          disorder: p.diagnoses[0]?.split('—')[1]?.trim() || p.diagnoses[0]?.split('-')[1]?.trim() || p.diagnoses[0] || 'Phonological',
          dueDate: p.metadata?.iepDueDate || 'N/A',
          goalProgress,
          status,
        }
      })
    })
  })

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
          <Button variant="outline" className="bg-white"><Calendar className="mr-2 h-4 w-4" /> Schedule Bulk Screening</Button>
          <Button className="shadow-sm"><Download className="mr-2 h-4 w-4" /> Export Progress Summaries</Button>
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
              <thead className="bg-slate-55 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-xs font-semibold">
                <tr>
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

    </div>
  )
}

export default IEP
