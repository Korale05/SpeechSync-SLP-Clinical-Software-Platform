import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, CheckCircle2, TrendingUp, CalendarDays, Target } from 'lucide-react';

const PatientProgressTab = ({ progressData, isLoading }) => {
  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 italic">Loading progress data...</div>;
  }

  if (!progressData) {
    return <div className="p-8 text-center text-slate-500 italic">No progress data available.</div>;
  }

  const { assessmentScores = [], sessionAttendance = [], goalTrends = [], totalSessions, completedSessions, assessmentsCompleted, lastAssessmentDate } = progressData;

  // Simple improvement calculation based on first and last assessment scores
  let improvementPercentage = 0;
  if (assessmentScores.length >= 2) {
    const firstScore = assessmentScores[0].score;
    const lastScore = assessmentScores[assessmentScores.length - 1].score;
    if (firstScore > 0) {
      improvementPercentage = Math.round(((lastScore - firstScore) / firstScore) * 100);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <CalendarDays className="h-8 w-8 text-blue-500 mb-2" />
            <h4 className="text-3xl font-bold text-slate-900">{totalSessions}</h4>
            <p className="text-xs text-slate-500 uppercase font-semibold mt-1">Total Sessions</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <h4 className="text-3xl font-bold text-slate-900">{completedSessions}</h4>
            <p className="text-xs text-slate-500 uppercase font-semibold mt-1">Completed Sessions</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Activity className="h-8 w-8 text-purple-500 mb-2" />
            <h4 className="text-3xl font-bold text-slate-900">{assessmentsCompleted}</h4>
            <p className="text-xs text-slate-500 uppercase font-semibold mt-1">Assessments Completed</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <TrendingUp className={`h-8 w-8 mb-2 ${improvementPercentage >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
            <h4 className={`text-3xl font-bold ${improvementPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {improvementPercentage > 0 ? '+' : ''}{improvementPercentage}%
            </h4>
            <p className="text-xs text-slate-500 uppercase font-semibold mt-1">Improvement</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assessment Score Trend */}
        <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
          <CardHeader>
            <CardTitle>Assessment Score Trend</CardTitle>
            <CardDescription>Overall standard/raw scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentScores.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={assessmentScores} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="score" name="Score" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 italic">Not enough assessment data</div>
            )}
          </CardContent>
        </Card>

        {/* Session Attendance Trend */}
        <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
          <CardHeader>
            <CardTitle>Session Attendance</CardTitle>
            <CardDescription>1 = Attended, 0 = Missed/Cancelled</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionAttendance.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionAttendance} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} domain={[0, 1]} ticks={[0, 1]} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Bar dataKey="attended" name="Attended" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 italic">Not enough session data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goal Progress Trendlines */}
      {goalTrends.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            Goal Progress Trends
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {goalTrends.map(goal => (
              <Card key={goal.id} className="rounded-xl border-slate-200 bg-white shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm line-clamp-1">{goal.goalText}</CardTitle>
                  <CardDescription>Target: {goal.target}% | {goal.domain}</CardDescription>
                </CardHeader>
                <CardContent>
                  {goal.history && goal.history.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={goal.history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} />
                          <YAxis tick={{fontSize: 12, fill: '#64748b'}} domain={[0, 100]} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Line type="monotone" dataKey="value" name="Accuracy %" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 italic">No progress data logged yet</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProgressTab;
