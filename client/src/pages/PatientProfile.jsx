import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, Activity, Download, ChevronRight, User, Sparkles, ShieldCheck } from 'lucide-react'
import useAuthStore from '../store/authStore'
import LoadingScreen from '../components/LoadingScreen'

const PatientProfile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Fetch patient profile via React Query
  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.patients.getById(id),
    enabled: !!id
  })

  if (isLoading) return <LoadingScreen />

  if (error || !patient) {
    return (
      <div className="p-8 text-center text-slate-500 italic max-w-xl mx-auto mt-20 bg-white border border-slate-200 rounded-2xl p-12 shadow-sm animate-in fade-in duration-500">
        <Activity className="h-12 w-12 text-rose-400 mx-auto mb-4" />
        <h3 className="font-bold text-lg text-slate-800">Patient Profile Not Found</h3>
        <p className="text-slate-400 text-sm mt-1">{error?.message || 'The specified record could not be loaded.'}</p>
        <Button className="mt-6" onClick={() => navigate('/patients')}>Back to Caseload</Button>
      </div>
    )
  }

  // Derived properties matching database fields
  const patientGoals = patient.goals || []
  const patientAssessments = patient.assessments || []
  const patientSessions = patient.sessions || []

  // Format age from DOB
  const calculateAge = (dobString) => {
    if (!dobString) return 'N/A'
    const dob = new Date(dobString)
    const diffMs = Date.now() - dob.getTime()
    const ageDate = new Date(diffMs)
    return Math.abs(ageDate.getUTCFullYear() - 1970) + ' years old'
  }

  const token = localStorage.getItem('speechsync_token')
  const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/iep/${patient.id}?token=${token}`

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header Profile Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold font-heading border border-primary/20 shadow-xs">
            {patient.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-3xl font-bold text-slate-900">{patient.name}</h1>
              <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">Patient ID: {patient.id.slice(0, 8)}</Badge>
            </div>
            <p className="text-slate-500 mt-1">
              {calculateAge(patient.dob)} (DOB: {new Date(patient.dob).toLocaleDateString('en-IN')}) &bull; Guardian: {patient.guardianName}
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              {patient.diagnoses.map((dx, i) => (
                <Badge key={i} variant="secondary" className="bg-primary/5 text-primary border border-primary/10">
                  {dx}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/sessions/new?patientId=${patient.id}`)}>
            <FileText className="mr-2 h-4 w-4" /> SOAP Note
          </Button>
          <Button onClick={() => navigate(`/assessments/new?patientId=${patient.id}`)}>
            <Activity className="mr-2 h-4 w-4" /> Assessment
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8 bg-slate-100/80 rounded-xl p-1 border border-slate-200/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessments">Assessment History</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-xl border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Clinical Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Diagnoses & ICD-10 Code Groups</p>
                  <ul className="list-disc pl-5 mt-1 text-slate-700 text-sm space-y-1.5">
                    {patient.diagnoses.map((dx, i) => <li key={i}>{dx}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Administrative & Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Insurance Coverage</p>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5 flex items-center gap-2">
                    {patient.insuranceCarrier || 'Self Pay'} {patient.insurancePolicy ? `(Policy: ${patient.insurancePolicy})` : ''}
                    <Badge variant="success" className="text-[10px] h-4">Active</Badge>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Guardian Info</p>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">{patient.guardianName} &bull; {patient.guardianPhone}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assessment History Tab */}
        <TabsContent value="assessments">
          <Card className="rounded-xl border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Standardized Test Log</CardTitle>
            </CardHeader>
            <CardContent>
              {patientAssessments.length > 0 ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-xs uppercase">Date</th>
                        <th className="px-6 py-4 font-semibold text-xs uppercase">Test Name</th>
                        <th className="px-6 py-4 font-semibold text-xs uppercase">Raw Score</th>
                        <th className="px-6 py-4 font-semibold text-xs uppercase">Standard Score</th>
                        <th className="px-6 py-4 font-semibold text-xs uppercase">Percentile</th>
                        <th className="px-6 py-4 font-semibold text-xs uppercase">Qualitative Label</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {patientAssessments.map((a, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-900">{new Date(a.dateAdministered).toLocaleDateString('en-IN')}</td>
                          <td className="px-6 py-4 font-bold text-primary">{a.testName}</td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{a.rawScore}</td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{a.standardScore}</td>
                          <td className="px-6 py-4 font-medium text-slate-600">{a.percentile}th</td>
                          <td className="px-6 py-4">
                            <Badge variant={
                              a.severityLabel?.includes('Normal') || a.severityLabel?.includes('Average') ? 'success' :
                              a.severityLabel?.includes('Severe') ? 'destructive' : 'warning'
                            } className="text-[10px]">
                              {a.severityLabel}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400 italic">No assessments administered yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <div className="space-y-4">
            {patientGoals.map((g, idx) => (
              <Card key={idx} className="overflow-hidden border-slate-200 hover:shadow-xs transition-shadow bg-white">
                <div className="flex border-l-4 border-primary">
                  <CardContent className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold text-base text-slate-900 max-w-2xl leading-relaxed">{g.goalText}</h4>
                      <Badge variant={g.status === 'MET' ? 'success' : 'warning'} className="ml-4">{g.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>Domain: <strong>{g.domain}</strong></span>
                      <span className="font-bold text-slate-800">{g.current}% Attained (Target: {g.target}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${g.status === 'MET' ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                        style={{ width: `${Math.min(100, Math.max(0, g.current))}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
            {patientGoals.length === 0 && (
              <div className="text-center p-8 text-slate-400 italic bg-white border rounded-xl">No goals assigned yet.</div>
            )}
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card className="rounded-xl border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <CardContent>
              {patientSessions.length > 0 ? (
                <div className="space-y-4 border-l-2 border-slate-200 ml-4 pl-6 relative">
                  {patientSessions.map((s, i) => (
                    <div key={i} className="relative mb-8 last:mb-2">
                      <div className="absolute -left-[35px] top-1.5 h-4.5 w-4.5 rounded-full border-4 border-white bg-primary shadow-xs"></div>
                      <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                        <span>{new Date(s.dateOfService).toLocaleDateString('en-IN')}</span>
                        <span>•</span>
                        <span>{s.durationMinutes} mins</span>
                        <span>•</span>
                        <Badge className="text-[9px] px-1.5 py-0" variant={s.status === 'LOCKED' || s.status === 'SIGNED' ? 'success' : 'warning'}>
                          {s.status}
                        </Badge>
                      </p>
                      <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl shadow-xs group hover:shadow-xs transition-all cursor-pointer">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-sm text-slate-900">Speech Therapy Session ({s.cptCode})</h4>
                        </div>
                        {s.soapNote ? (
                          <div className="text-xs text-slate-600 mt-2 space-y-1.5 leading-relaxed">
                            <p><strong>S:</strong> {s.soapNote.subjective || 'No subjective record'}</p>
                            <p><strong>O:</strong> {s.soapNote.objective || 'No objective record'}</p>
                            <p><strong>A:</strong> {s.soapNote.assessment || 'No assessment record'}</p>
                            <p><strong>P:</strong> {s.soapNote.plan || 'No plan record'}</p>
                          </div>
                        ) : (
                          <p className="text-xs italic text-slate-400 mt-1">No SOAP notes recorded.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400 italic">No past sessions on record.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card className="rounded-xl border-slate-200 bg-white">
            <CardContent className="p-8 text-center space-y-4">
              <ShieldCheck className="h-12 w-12 mx-auto text-emerald-500" />
              <h4 className="font-bold text-slate-800">Secure Document Center</h4>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Clinical documents are encrypted. Download a freshly compiled, FERPA & HIPAA-compliant PDF progress summary containing goal histories.
              </p>
              <div className="pt-2">
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="shadow-xs">
                    <Download className="mr-2 h-4 w-4 text-primary" /> Download IEP Progress Report PDF
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}

export default PatientProfile
