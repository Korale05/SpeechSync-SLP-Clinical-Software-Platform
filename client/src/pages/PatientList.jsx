import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search, Plus, Calendar, TrendingUp, User, ShieldAlert, Edit, Trash2, RotateCcw, 
  Filter, Eye, MoreHorizontal, UserCheck, AlertCircle, AlertTriangle 
} from 'lucide-react'
import useAuthStore, { ROLES } from '../store/authStore'
import LoadingScreen from '../components/LoadingScreen'
import { toast } from 'react-hot-toast'

const PatientList = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // State filters
  const [searchTerm, setSearchTerm] = useState('')
  const [slpFilter, setSlpFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ACTIVE') // 'ACTIVE', 'ARCHIVED', 'ALL'
  const [ageFilter, setAgeFilter] = useState('ALL') // 'ALL', 'TODDLER', 'CHILD', 'TEEN', 'ADULT'

  // Custom confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: 'Cancel',
    onConfirm: () => {},
    variant: 'danger' // 'danger' | 'primary'
  })

  // Fetch all patients
  const { data: patients = [], isLoading: isLoadingPatients, error: patientError } = useQuery({
    queryKey: ['patients', statusFilter],
    queryFn: () => api.patients.getAll(undefined, statusFilter === 'ARCHIVED' || statusFilter === 'ALL').then(res => res)
  })

  // Fetch clinicians list
  const { data: clinicians = [], isLoading: isLoadingClinicians } = useQuery({
    queryKey: ['clinicians'],
    queryFn: () => api.patients.getClinicians().then(res => res)
  })

  // Archive mutation (soft delete)
  const archiveMutation = useMutation({
    mutationFn: (id) => api.patients.delete(id),
    onSuccess: () => {
      toast.success('Patient archived successfully')
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to archive patient')
    }
  })

  // Restore mutation (patch isArchived: false)
  const restoreMutation = useMutation({
    mutationFn: (id) => api.patients.update(id, { isArchived: false }),
    onSuccess: () => {
      toast.success('Patient restored successfully')
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to restore patient')
    }
  })

  if (isLoadingPatients || isLoadingClinicians) return <LoadingScreen />

  if (patientError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-bold text-slate-800">Error loading patients</h3>
        <p className="text-slate-500 mt-1">{patientError.message}</p>
      </div>
    )
  }

  // Calculate age helper
  const calculateAge = (dob) => {
    if (!dob) return 0
    const birthDate = new Date(dob)
    const ageDiff = Date.now() - birthDate.getTime()
    const ageDate = new Date(ageDiff)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  // SLP name lookup map
  const slpMap = {}
  clinicians.forEach(c => {
    slpMap[c.id] = `${c.name} (${c.credentials})`
  })

  // Filter logic
  const filteredPatients = patients.filter(patient => {
    // 1. Status Filter (Active vs Archived)
    if (statusFilter === 'ACTIVE' && patient.isArchived) return false
    if (statusFilter === 'ARCHIVED' && !patient.isArchived) return false

    // 2. SLP Filter
    if (slpFilter !== 'ALL' && patient.assignedSlpId !== slpFilter) return false

    // 3. Search Filter (Name, Diagnoses, Guardian)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      const matchesName = patient.name.toLowerCase().includes(term)
      const matchesGuardian = patient.guardianName?.toLowerCase().includes(term)
      const matchesDiagnosis = patient.diagnoses?.some(d => d.toLowerCase().includes(term))
      if (!matchesName && !matchesGuardian && !matchesDiagnosis) return false
    }

    // 4. Age Group Filter
    if (ageFilter !== 'ALL') {
      const age = calculateAge(patient.dob)
      if (ageFilter === 'TODDLER' && (age < 0 || age > 3)) return false
      if (ageFilter === 'CHILD' && (age < 4 || age > 12)) return false
      if (ageFilter === 'TEEN' && (age < 13 || age > 19)) return false
      if (ageFilter === 'ADULT' && age < 20) return false
    }

    return true
  })

  const triggerArchiveConfirm = (id, name) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Archive Patient',
      message: `Are you sure you want to archive ${name}? This soft-deletes the patient but preserves all their session history and reports in the system.`,
      confirmText: 'Archive Patient',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: () => {
        archiveMutation.mutate(id)
        setConfirmConfig(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const triggerRestoreConfirm = (id, name) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Restore Patient',
      message: `Do you want to restore ${name} back to active caseload status?`,
      confirmText: 'Restore Patient',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: () => {
        restoreMutation.mutate(id)
        setConfirmConfig(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 relative">
      
      {/* Premium Custom Confirmation Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${confirmConfig.variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}`}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{confirmConfig.title}</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{confirmConfig.message}</p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                id="modal-cancel-btn"
              >
                {confirmConfig.cancelText}
              </Button>
              <Button 
                variant={confirmConfig.variant === 'danger' ? 'destructive' : 'default'}
                onClick={confirmConfig.onConfirm}
                id="modal-confirm-btn"
              >
                {confirmConfig.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Clinical Caseload</h1>
          <p className="text-slate-500 mt-1">Manage, evaluate, and track progress for your assigned patients.</p>
        </div>
        {(user.role === ROLES.SLP || user.role === ROLES.ADMIN) && (
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/patients/new')} className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Add Patient
            </Button>
            <Button onClick={() => navigate('/assessments/new')} variant="outline" className="shadow-sm border-slate-200">
              Run Assessment
            </Button>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, guardian, diagnosis..."
              className="pl-10 bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={slpFilter}
              onChange={(e) => setSlpFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All Clinicians</option>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
              id="status-filter-select"
            >
              <option value="ACTIVE">Active Patients</option>
              <option value="ARCHIVED">Archived Patients</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
              id="age-filter-select"
            >
              <option value="ALL">All Ages</option>
              <option value="TODDLER">Toddler (0-3 yrs)</option>
              <option value="CHILD">Child (4-12 yrs)</option>
              <option value="TEEN">Teen (13-19 yrs)</option>
              <option value="ADULT">Adult (20+ yrs)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Patient ID</th>
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Age</th>
                <th className="py-4 px-6">Diagnosis</th>
                <th className="py-4 px-6">Assigned SLP</th>
                <th className="py-4 px-6">Next Appointment</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredPatients.map((patient) => {
                const age = calculateAge(patient.dob)
                const nextAppt = patient.appointments?.[0]
                const formattedDate = nextAppt 
                  ? new Date(nextAppt.startTime).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'None scheduled'

                return (
                  <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-slate-400">
                      {patient.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {patient.name}
                      {patient.isArchived && (
                        <Badge variant="destructive" className="ml-2 bg-red-100 text-red-700 hover:bg-red-100 text-[10px] px-1.5 py-0">
                          Archived
                        </Badge>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {age} yrs
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {patient.diagnoses.map((diag, i) => (
                          <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-normal">
                            {diag}
                          </Badge>
                        ))}
                        {patient.diagnoses.length === 0 && (
                          <span className="text-xs text-slate-400 italic">No diagnosis</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {slpMap[patient.assignedSlpId] || 'Unassigned'}
                    </td>
                    <td className="py-4 px-6">
                      {nextAppt ? (
                        <span className="flex items-center gap-1.5 text-primary font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          {formattedDate}
                        </span>
                      ) : (
                        <span className="text-slate-400">{formattedDate}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => navigate(`/patients/${patient.id}`)}
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => navigate(`/patients/${patient.id}/edit`)}
                          title="Edit Patient"
                          id={`edit-patient-${patient.id.slice(0, 8)}`}
                        >
                          <Edit className="h-4 w-4 text-slate-500" />
                        </Button>
                        {patient.isArchived ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => triggerRestoreConfirm(patient.id, patient.name)}
                            title="Restore Patient"
                            className="hover:text-emerald-600"
                            id={`restore-patient-${patient.id.slice(0, 8)}`}
                          >
                            <RotateCcw className="h-4 w-4 text-slate-500 hover:text-emerald-600" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => triggerArchiveConfirm(patient.id, patient.name)}
                            title="Archive Patient"
                            className="hover:text-destructive"
                            id={`archive-patient-${patient.id.slice(0, 8)}`}
                          >
                            <Trash2 className="h-4 w-4 text-slate-500 hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No patients found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default PatientList
