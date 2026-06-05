// client/src/pages/PatientProfile.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, Activity, Download, ChevronRight, User, Sparkles, ShieldCheck, Receipt, CreditCard, CheckCircle2, Search, Upload, Trash2, File, X } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'
import PatientBillingTab from '../components/billing/PatientBillingTab'
import PatientProgressTab from '../components/patient/PatientProgressTab'
import PatientSoapNotesTab from '../components/patient/PatientSoapNotesTab'
import AiSessionForm from './AiSessionForm'

const PatientProfile = ({ overridePatientId, activeSessionId }) => {
  const { id: paramId } = useParams()
  const id = overridePatientId || paramId
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const queryClient = useQueryClient()

  // Fetch patient profile via React Query
  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.patients.getById(id),
    enabled: !!id
  })

  // Timeline Query
  const { data: timelineEvents = [], isLoading: isTimelineEventsLoading } = useQuery({
    queryKey: ['patient-timeline', id],
    queryFn: () => api.patients.getTimeline(id),
    enabled: !!id
  })

  // Progress Query
  const { data: progressData, isLoading: isProgressLoading } = useQuery({
    queryKey: ['patient-progress', id],
    queryFn: () => api.patients.getProgress(id),
    enabled: !!id
  })

  // SOAP Notes Query
  const { data: soapNotes = [], isLoading: isSoapNotesLoading } = useQuery({
    queryKey: ['patient-soap-notes', id],
    queryFn: () => api.soapNotes.getAll(id),
    enabled: !!id
  })

  // Assessments Query
  const { data: assessments = [], isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ['patient-assessments', id],
    queryFn: () => api.patients.getAssessments(id),
    enabled: !!id
  })

  // Goals Query
  const { data: goals = [], isLoading: isGoalsLoading } = useQuery({
    queryKey: ['patient-goals', id],
    queryFn: () => api.patients.getGoals(id),
    enabled: !!id
  })

  // Documents Query
  const { data: documents = [], isLoading: isDocsLoading, error: docsError } = useQuery({
    queryKey: ['patient-documents', id],
    queryFn: () => api.documents.getAll(id),
    enabled: !!id
  })

  // Invalidate queries on mount/id change to ensure fresh data on page load
  useEffect(() => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['patient', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-timeline', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-progress', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-soap-notes', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-assessments', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-goals', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-documents', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-billing', id] })
    }
  }, [id, queryClient])

  // Sessions Query
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ['patient-sessions', id],
    queryFn: () => api.patients.getSessions(id),
    enabled: !!id
  })

  // Documents state and queries
  const [docSearchQuery, setDocSearchQuery] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('All')
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedDocType, setSelectedDocType] = useState('Consent Form')
  const [isUploading, setIsUploading] = useState(false)

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => api.documents.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-documents', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-timeline', id] })
      toast.success('Document deleted successfully!')
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`)
    }
  })

  const [viewingAssessment, setViewingAssessment] = useState(null)
  const [linkingAssessment, setLinkingAssessment] = useState(null)

  const linkGoalMutation = useMutation({
    mutationFn: ({ goalId, progressValue }) => {
      return api.goals.updateProgress(goalId, progressValue);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-goals', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-timeline', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-assessments', id] })
      toast.success('Assessment linked and Goal progress updated successfully!')
      setLinkingAssessment(null)
    },
    onError: (err) => {
      toast.error('Failed to link goal: ' + err.message)
    }
  })

  const logProgressMutation = useMutation({
    mutationFn: ({ goalId, value }) => {
      return api.goals.updateProgress(goalId, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-goals', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-timeline', id] })
      toast.success('Goal progress updated successfully!')
    },
    onError: (err) => {
      toast.error('Failed to update goal progress: ' + err.message)
    }
  })

  const [expandedSessions, setExpandedSessions] = useState({})
  const toggleSessionExpand = (sessId) => {
    setExpandedSessions(prev => ({ ...prev, [sessId]: !prev[sessId] }))
  }

  const handleUploadDoc = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error('Please select a file to upload.')
      return
    }
    
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('patientId', id)
    formData.append('documentType', selectedDocType)

    try {
      await api.documents.upload(formData)
      toast.success('Document uploaded successfully!')
      setSelectedFile(null)
      // Reset file input element if needed
      const fileInput = document.getElementById('doc-file-input')
      if (fileInput) fileInput.value = ''
      queryClient.invalidateQueries({ queryKey: ['patient-documents', id] })
      queryClient.invalidateQueries({ queryKey: ['patient-timeline', id] })
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Timeline events are fetched directly from the GET /api/patients/:id/timeline endpoint

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
  const patientGoals = goals || []
  const patientAssessments = assessments || []
  const patientSessions = sessions || []

  // Format age from DOB
  const calculateAge = (dobString) => {
    if (!dobString) return 'N/A'
    const dob = new Date(dobString)
    const diffMs = Date.now() - dob.getTime()
    const ageDate = new Date(diffMs)
    return Math.abs(ageDate.getUTCFullYear() - 1970) + ' years old'
  }

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

      <Tabs 
        defaultValue="overview" 
        className="w-full"
        onValueChange={(val) => {
          // Refetch fresh data on tab switch
          queryClient.invalidateQueries({ queryKey: ['patient', id] })
          queryClient.invalidateQueries({ queryKey: ['patient-timeline', id] })
          queryClient.invalidateQueries({ queryKey: ['patient-progress', id] })
          queryClient.invalidateQueries({ queryKey: ['patient-soap-notes', id] })
          queryClient.invalidateQueries({ queryKey: ['patient-assessments', id] })
          queryClient.invalidateQueries({ queryKey: ['patient-goals', id] })
          queryClient.invalidateQueries({ queryKey: ['patient-sessions', id] })
          queryClient.invalidateQueries({ queryKey: ['patient-documents', id] })
          queryClient.invalidateQueries({ queryKey: ['patient-billing', id] })
        }}
      >
        <TabsList className="flex flex-wrap w-full mb-8 bg-slate-100/80 rounded-xl p-1 border border-slate-200/50 justify-start gap-1 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="soap-notes">SOAP Notes</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Demographics Card */}
            <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900">Demographics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Patient Name</p>
                  <p className="font-bold text-slate-800 mt-0.5">{patient.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Date of Birth (DOB)</p>
                  <p className="font-semibold text-slate-700 mt-0.5">{new Date(patient.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Age</p>
                  <p className="font-semibold text-slate-700 mt-0.5">{calculateAge(patient.dob)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Profile Created Date</p>
                  <p className="font-semibold text-slate-700 mt-0.5">{new Date(patient.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </CardContent>
            </Card>

            {/* Administrative & Contact Card */}
            <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900">Guardian & Administrative</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Guardian Name</p>
                  <p className="font-bold text-slate-800 mt-0.5">{patient.guardianName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Guardian Phone</p>
                  <p className="font-semibold text-slate-700 mt-0.5">{patient.guardianPhone || 'N/A'}</p>
                </div>
                {patient.guardianEmail && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-semibold">Guardian Email</p>
                    <p className="font-semibold text-slate-700 mt-0.5 block truncate">{patient.guardianEmail}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Insurance Carrier</p>
                  <p className="font-semibold text-slate-700 mt-0.5 flex items-center gap-2">
                    {patient.insuranceCarrier || 'Self Pay'}
                    {patient.insurancePolicy && <span className="text-xs text-slate-500 font-mono">({patient.insurancePolicy})</span>}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Clinical & SLP Assignment Card */}
            <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900">Clinical & SLP Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Assigned SLP (Clinician)</p>
                  <p className="font-bold text-primary mt-0.5">
                    {patient.assignedSlp?.name || 'Not Assigned'}
                    {patient.assignedSlp?.credentials && <span className="text-xs font-normal text-slate-500 ml-1">({patient.assignedSlp.credentials})</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold mb-1.5">Diagnoses & ICD-10 Groups</p>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.diagnoses.map((dx, i) => (
                      <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200">
                        {dx}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Quick Summary Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Active Goals */}
            <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900">Active Goals</CardTitle>
                <Badge variant="outline" className="text-xs bg-slate-50">{patientGoals.filter(g => g.status !== 'MET').length} Active</Badge>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {patientGoals.filter(g => g.status !== 'MET').slice(0, 3).map((g, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">{g.domain}</span>
                      <p className="text-xs font-semibold text-slate-700 leading-tight">{g.goalText}</p>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-xs font-bold text-slate-800">{g.current}%</span>
                      <span className="text-[10px] text-slate-400 block uppercase">Progress</span>
                    </div>
                  </div>
                ))}
                {patientGoals.filter(g => g.status !== 'MET').length === 0 && (
                  <p className="text-sm text-slate-400 italic text-center py-4">No active goals currently.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Sessions & Latest SOAP */}
            <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={() => {
                  const tabsTrigger = document.querySelector('[value="sessions"]');
                  if (tabsTrigger) tabsTrigger.click();
                }}>View All</Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {patientSessions.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-800">Session ({s.cptCode})</p>
                        <span className="text-[10px] font-semibold text-slate-400">{new Date(s.dateOfService).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-2">
                        {s.soapNote ? (
                          <span className="italic">"S: {s.soapNote.subjective || '--'} O: {s.soapNote.objective || '--'}"</span>
                        ) : (
                          <span className="italic text-slate-400">No SOAP note recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {patientSessions.length === 0 && (
                  <p className="text-sm text-slate-400 italic text-center py-4">No recent sessions found.</p>
                )}
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
                        <th className="px-6 py-4 font-semibold text-xs uppercase text-right">Actions</th>
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
                          <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md"
                              onClick={() => setViewingAssessment(a)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md"
                              onClick={() => api.assessments.downloadPdf(a.id, `Report_${a.testName.replace(/\s+/g, '_')}_${patient.name.replace(/\s+/g, '_')}.pdf`)}
                            >
                              <Download className="h-3.5 w-3.5 mr-1" /> PDF
                            </Button>
                            {(user?.role === 'SLP' || user?.role === 'ADMIN') && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2.5 border-primary/20 text-primary hover:bg-primary/5 text-xs font-semibold rounded-md"
                                onClick={() => setLinkingAssessment(a)}
                              >
                                Link Goal
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400 italic">No assessments administered yet.</div>
              )}

              {/* View Assessment Details Modal */}
              {viewingAssessment && (
                <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                  <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transform animate-in zoom-in-95 duration-200 text-left">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Assessment Details
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{viewingAssessment.testName}</p>
                      </div>
                      <button onClick={() => setViewingAssessment(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-slate-400 font-semibold uppercase block">Date Administered</span>
                          <span className="font-bold text-slate-800">{new Date(viewingAssessment.dateAdministered).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 font-semibold uppercase block">Severity</span>
                          <span className="font-bold text-slate-800">{viewingAssessment.severityLabel || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 font-semibold uppercase block">Raw Score</span>
                          <span className="font-bold text-slate-800">{viewingAssessment.rawScore ?? 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 font-semibold uppercase block">Standard Score</span>
                          <span className="font-bold text-slate-800">{viewingAssessment.standardScore ?? 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 font-semibold uppercase block">Percentile</span>
                          <span className="font-bold text-slate-800">{viewingAssessment.percentile ? `${viewingAssessment.percentile}th percentile` : 'N/A'}</span>
                        </div>
                      </div>
                      {viewingAssessment.observations && (
                        <div className="border-t border-slate-100 pt-3">
                          <span className="text-xs text-slate-400 font-semibold uppercase block mb-1">Clinical Observations</span>
                          <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/50">{viewingAssessment.observations}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <Button onClick={() => setViewingAssessment(null)}>Close</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Link Assessment to Goal Modal */}
              {linkingAssessment && (
                <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                  <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200 text-left">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Link Assessment to Goal
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Select a clinical goal to update with this assessment's accuracy.</p>
                      </div>
                      <button onClick={() => setLinkingAssessment(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                      <p className="text-xs text-slate-500 italic leading-relaxed">
                        Linking this assessment will update the goal's current accuracy percentage to the assessment's computed accuracy or raw standard percentage.
                      </p>
                      {patientGoals.length > 0 ? (
                        <div className="space-y-2">
                          {patientGoals.map((g) => {
                            // Compute accuracy value to assign
                            const pctValue = linkingAssessment.testName?.includes('GFTA')
                              ? Math.round(((linkingAssessment.rawScore || 40) / 47) * 100)
                              : (linkingAssessment.standardScore || 85);

                            return (
                              <div 
                                key={g.id} 
                                onClick={() => {
                                  if (confirm(`Link this assessment to this goal? This will set goal accuracy to ${pctValue}%.`)) {
                                    linkGoalMutation.mutate({ goalId: g.id, progressValue: pctValue });
                                  }
                                }}
                                className="p-3 border border-slate-200 rounded-xl hover:border-primary/50 hover:bg-slate-50/50 transition-all cursor-pointer flex justify-between items-center group"
                              >
                                <div className="space-y-1 pr-4">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{g.domain}</span>
                                  <p className="text-xs font-semibold text-slate-700 leading-tight group-hover:text-primary transition-colors">{g.goalText}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic text-center py-4">No goals found for this patient. Please create goals first.</p>
                      )}
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <Button variant="outline" onClick={() => setLinkingAssessment(null)}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SOAP Notes Tab */}
        <TabsContent value="soap-notes">
          {activeSessionId ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <AiSessionForm embedded={true} />
            </div>
          ) : (
            <PatientSoapNotesTab patient={patient} soapNotes={soapNotes} isLoading={isSoapNotesLoading} />
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <div className="space-y-4">
            {patientGoals.map((g, idx) => {
              const targetDateStr = g.targetDate 
                ? new Date(g.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'No Target Date';
              
              return (
                <Card key={idx} className="overflow-hidden border-slate-200 hover:shadow-sm transition-shadow bg-white">
                  <div className="flex border-l-4 border-primary">
                    <CardContent className="p-6 flex-1 space-y-4">
                      {/* Top Header */}
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                            {g.domain}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm md:text-base leading-relaxed mt-1">{g.goalText}</h4>
                        </div>
                        <Badge variant={g.status === 'MET' ? 'success' : 'warning'} className="ml-4 text-xs font-bold font-sans">
                          {g.status}
                        </Badge>
                      </div>

                      {/* Detail Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500 border-t border-b border-slate-100 py-3 my-2 bg-slate-50/50 rounded-lg px-3">
                        <div>
                          <span className="text-slate-400 uppercase font-semibold block text-[10px]">Baseline</span>
                          <span className="font-bold text-slate-700 text-sm">{g.baseline}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-semibold block text-[10px]">Target</span>
                          <span className="font-bold text-slate-700 text-sm">{g.target}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-semibold block text-[10px]">Current</span>
                          <span className="font-bold text-slate-700 text-sm">{g.current}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-semibold block text-[10px]">Target Date</span>
                          <span className="font-semibold text-slate-600 text-xs">{targetDateStr}</span>
                        </div>
                      </div>

                      {/* Progress bar container */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>Attainment Progress</span>
                          <span>{g.current}% / {g.target}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${g.status === 'MET' ? 'bg-emerald-500' : 'bg-primary'}`} 
                            style={{ width: `${Math.min(100, Math.max(0, (g.current / g.target) * 100))}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Interactive Logger (for SLP & Admin) */}
                      {(user?.role === 'SLP' || user?.role === 'ADMIN') && (
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 max-w-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block whitespace-nowrap">Interactive Update:</span>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={g.current}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                logProgressMutation.mutate({ goalId: g.id, value: val });
                              }}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="text-xs font-extrabold text-slate-700 w-8 text-right">{g.current}%</span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 italic">Drag slider to log progress directly</span>
                        </div>
                      )}

                    </CardContent>
                  </div>
                </Card>
              );
            })}
            {patientGoals.length === 0 && (
              <div className="text-center p-12 text-slate-400 italic bg-white border border-slate-200 rounded-2xl shadow-xs">
                No active clinical goals are established for this patient yet.
              </div>
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
                      <div 
                        onClick={() => toggleSessionExpand(s.id)}
                        className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl shadow-xs group hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-sm text-slate-900">Speech Therapy Session ({s.cptCode})</h4>
                            <p className="text-xs text-slate-450 mt-0.5">Clinician ID: {s.clinicianId}</p>
                          </div>
                          <span className="text-xs font-bold text-primary group-hover:underline">
                            {expandedSessions[s.id] ? 'Hide SOAP' : 'Show SOAP'}
                          </span>
                        </div>
                        {expandedSessions[s.id] && (
                          <div className="text-xs text-slate-600 mt-4 pt-3 border-t border-slate-200/50 space-y-2 leading-relaxed animate-in fade-in duration-200">
                            {s.soapNote ? (
                              <>
                                <p className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs"><strong>Subjective (S):</strong> {s.soapNote.subjective || 'No subjective record'}</p>
                                <p className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs"><strong>Objective (O):</strong> {s.soapNote.objective || 'No objective record'}</p>
                                <p className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs"><strong>Assessment (A):</strong> {s.soapNote.assessment || 'No assessment record'}</p>
                                <p className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs"><strong>Plan (P):</strong> {s.soapNote.plan || 'No plan record'}</p>
                              </>
                            ) : (
                              <p className="text-xs italic text-slate-400">No SOAP notes recorded.</p>
                            )}
                          </div>
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
        
        {/* History Timeline Tab */}
        <TabsContent value="timeline">
          <Card className="rounded-xl border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Aggregated Patient History</CardTitle>
              <CardDescription>A chronological timeline of sessions, assessments, billing transitions, and goal progress</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {timelineEvents.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 ml-6 pl-8 space-y-8 py-2">
                  {timelineEvents.map((evt) => {
                    const getIconAndColors = (type) => {
                      switch (type) {
                        case 'session':
                          return {
                            icon: <FileText className="h-5 w-5 text-blue-600" />,
                            bg: 'bg-blue-50 border-blue-200',
                            badgeColor: 'bg-blue-100 text-blue-800'
                          };
                        case 'assessment':
                          return {
                            icon: <Activity className="h-5 w-5 text-purple-600" />,
                            bg: 'bg-purple-50 border-purple-200',
                            badgeColor: 'bg-purple-100 text-purple-800'
                          };
                        case 'billing_invoice':
                          return {
                            icon: <Receipt className="h-5 w-5 text-amber-600" />,
                            bg: 'bg-amber-50 border-amber-200',
                            badgeColor: 'bg-amber-100 text-amber-800'
                          };
                        case 'billing_payment':
                          return {
                            icon: <CreditCard className="h-5 w-5 text-emerald-600" />,
                            bg: 'bg-emerald-50 border-emerald-200',
                            badgeColor: 'bg-emerald-100 text-emerald-800'
                          };
                        case 'billing_refund':
                          return {
                            icon: <X className="h-5 w-5 text-rose-600" />,
                            bg: 'bg-rose-50 border-rose-200',
                            badgeColor: 'bg-rose-100 text-rose-800'
                          };
                        case 'billing_paid':
                          return {
                            icon: <CheckCircle2 className="h-5 w-5 text-emerald-700" />,
                            bg: 'bg-emerald-100 border-emerald-300',
                            badgeColor: 'bg-emerald-600 text-white'
                          };
                        case 'goal_progress':
                          return {
                            icon: <Sparkles className="h-5 w-5 text-pink-600" />,
                            bg: 'bg-pink-50 border-pink-200',
                            badgeColor: 'bg-pink-100 text-pink-800'
                          };
                        default:
                          return {
                            icon: <Activity className="h-5 w-5 text-slate-600" />,
                            bg: 'bg-slate-50 border-slate-200',
                            badgeColor: 'bg-slate-100 text-slate-800'
                          };
                      }
                    };

                    const style = getIconAndColors(evt.type);

                    return (
                      <div key={evt.id} className="relative group transition-all duration-300 hover:translate-x-1">
                        {/* Timeline Marker icon */}
                        <div className={`absolute -left-[49px] top-1 h-9 w-9 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${style.bg}`}>
                          {style.icon}
                        </div>

                        {/* Event Card Content */}
                        <div className="bg-slate-50/40 border border-slate-200 hover:border-slate-300/80 p-5 rounded-2xl shadow-xs transition-all duration-300">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 font-sans">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(evt.date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <Badge className={`text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 border-none ${style.badgeColor}`}>
                              {evt.status || evt.type.replace('_', ' ')}
                            </Badge>
                          </div>

                          <h4 className="font-bold text-slate-800 text-base leading-tight font-heading">{evt.title}</h4>
                          <p className="text-sm font-medium text-slate-600 mt-1.5 leading-relaxed">{evt.description}</p>
                          <p className="text-xs font-semibold text-slate-400 mt-1.5 border-t border-slate-100 pt-2">{evt.details}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-12 text-slate-400 italic">
                  <Activity className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  No events found in this patient's history.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            {/* Upload form - Only for SLP / ADMIN */}
            {(user?.role === 'SLP' || user?.role === 'ADMIN' || user?.role?.toUpperCase() === 'SLP' || user?.role?.toLowerCase() === 'slp') && (
              <Card className="rounded-xl border-slate-200 bg-white lg:col-span-1 h-fit shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Upload Document</CardTitle>
                  <CardDescription>Attach forms, assessments, or medical notes</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadDoc} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Document Type</label>
                      <select 
                        value={selectedDocType}
                        onChange={e => setSelectedDocType(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <option value="Consent Form">Consent Form</option>
                        <option value="Assessment Report">Assessment Report</option>
                        <option value="Progress Report">Progress Report</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Prescription">Prescription</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select File</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors relative bg-slate-50/50">
                        <input 
                          type="file" 
                          id="doc-file-input"
                          onChange={e => setSelectedFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-xs font-medium text-slate-650 block truncate max-w-[200px] mx-auto">
                          {selectedFile ? selectedFile.name : 'Click or Drag File Here'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">PDF, Word, Images up to 10MB</span>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-10 shadow-sm"
                      disabled={isUploading || !selectedFile}
                    >
                      {isUploading ? 'Uploading...' : 'Upload File'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Document caselist */}
            <div className={`lg:col-span-${(user?.role === 'SLP' || user?.role === 'ADMIN' || user?.role?.toUpperCase() === 'SLP' || user?.role?.toLowerCase() === 'slp') ? '2' : '3'} space-y-4`}>
              {/* Search & Filter */}
              <Card className="rounded-xl border-slate-200 bg-white shadow-xs p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text"
                    value={docSearchQuery}
                    onChange={e => setDocSearchQuery(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    placeholder="Search files by name..."
                  />
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <select 
                    value={docTypeFilter}
                    onChange={e => setDocTypeFilter(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-none"
                  >
                    <option value="All">All Types</option>
                    <option value="Consent Form">Consent Form</option>
                    <option value="Assessment Report">Assessment Report</option>
                    <option value="Progress Report">Progress Report</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Other">Other</option>
                  </select>
                  
                  {/* IEP Progress Report Button */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-9 font-semibold text-xs border-primary/20 text-primary hover:bg-primary/5"
                    onClick={async () => {
                      try {
                        await api.downloadSecureFile(`/reports/iep/${patient.id}`, `${patient.name}-IEP-Progress-Report.pdf`);
                        toast.success('IEP Progress Report downloaded successfully');
                      } catch (err) {
                        toast.error('Failed to download progress report: ' + err.message);
                      }
                    }}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> IEP PDF Summary
                  </Button>
                </div>
              </Card>

              {/* List */}
              <Card className="rounded-xl border-slate-200 bg-white shadow-xs">
                <CardContent className="p-0">
                  {documents && documents.length > 0 ? (
                    (() => {
                      const filteredDocs = documents.filter(doc => {
                        const matchesSearch = doc.fileName.toLowerCase().includes(docSearchQuery.toLowerCase());
                        const matchesFilter = docTypeFilter === 'All' || doc.documentType === docTypeFilter;
                        return matchesSearch && matchesFilter;
                      });

                      if (filteredDocs.length === 0) {
                        return <div className="text-center p-8 text-slate-400 italic">No matching documents found.</div>;
                      }

                      return (
                        <div className="divide-y divide-slate-100">
                          {filteredDocs.map((doc) => (
                            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-slate-100/50 flex items-center justify-center text-slate-500 border border-slate-200">
                                  <File className="h-5 w-5 text-slate-400" />
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900 text-sm block leading-tight">{doc.fileName}</span>
                                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                    <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 bg-slate-50">
                                      {doc.documentType}
                                    </Badge>
                                    <span>&bull;</span>
                                    <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString('en-IN')}</span>
                                    <span>&bull;</span>
                                    <span>By: {doc.uploadedBy}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-primary hover:bg-primary/5"
                                  onClick={() => api.documents.download(doc.id, doc.fileName)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {(user?.role === 'SLP' || user?.role === 'ADMIN') && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-650"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this document?')) {
                                        deleteDocMutation.mutate(doc.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center p-12 text-slate-400 italic">No documents uploaded for this patient yet.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Billing Tab */}
        <TabsContent value="billing">
          <PatientBillingTab patient={patient} />
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress">
          <PatientProgressTab progressData={progressData} isLoading={isProgressLoading} />
        </TabsContent>

      </Tabs>
    </div>
  )
}

export default PatientProfile
