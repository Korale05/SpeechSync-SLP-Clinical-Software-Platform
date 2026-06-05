import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { GraduationCap, Users, Calendar, CheckCircle2 } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../services/api'
import LoadingScreen from '../components/LoadingScreen'

const SchoolDashboard = () => {
  const { user } = useAuthStore()

  // Fetch School Dashboard Data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['school-dashboard'],
    queryFn: () => api.get('/school/dashboard').then(res => res.data),
    refetchInterval: 10000 // Refetch periodically or rely on socket events
  })

  if (isLoading) return <LoadingScreen />

  if (!dashboardData || dashboardData.students.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 italic max-w-xl mx-auto mt-20 bg-white border border-slate-200 rounded-2xl p-12">
        <h3 className="font-bold text-lg text-slate-800">No Assigned Students</h3>
        <p className="text-slate-400 text-sm mt-1">There are currently no students assigned to your school profile.</p>
      </div>
    )
  }

  const { metrics, students } = dashboardData

  return (
    <div className="min-h-[calc(100vh-theme(spacing.20))] bg-slate-50 p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h1 className="font-heading text-3xl font-bold text-slate-900">School Portal</h1>
              <p className="text-slate-600 mt-2 text-lg">Welcome, {user?.name || 'Coordinator'}. Here is the status of your assigned students.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-primary/10 p-4 rounded-xl flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-slate-600">Total Students</p>
                  <p className="text-xl font-bold text-slate-900">{metrics.totalStudentsAssigned}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => {
            const pct = student.metrics.progressPercentage;
            const goalData = [
              { name: 'Met', value: pct },
              { name: 'Remaining', value: Math.max(0, 100 - pct) },
            ];
            const COLORS = ['#10B981', '#E2E8F0'];

            return (
              <Card key={student.id} className="rounded-2xl shadow-sm border-slate-200 overflow-hidden bg-white hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{student.name}</CardTitle>
                      <CardDescription className="mt-1">SLP: {student.assignedSlp || 'Unassigned'}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {student.metrics.activeGoalsCount} Active Goals
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-20 w-20 relative flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={goalData} innerRadius={25} outerRadius={35} paddingAngle={5} dataKey="value">
                            {goalData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-slate-900">{pct}%</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-700">Goal Completion</p>
                      <p className="text-xs text-slate-500">{student.metrics.completedSessions} sessions attended</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">Recent Goals</h4>
                    {student.goals.slice(0, 2).map(goal => (
                      <div key={goal.id} className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-md">
                        <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${goal.status === 'MET' ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="line-clamp-2" title={goal.goalText}>{goal.goalText}</span>
                      </div>
                    ))}
                    {student.goals.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No academic/behavioral goals tracked.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

      </div>
    </div>
  )
}

export default SchoolDashboard
