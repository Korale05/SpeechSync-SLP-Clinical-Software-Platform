import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Users, Search, UserCheck, ShieldAlert, Award, FileText, CheckCircle2,
  XCircle, ListPlus, Edit, ClipboardList, ShieldAlert as AlertIcon
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const DoctorManagement = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedClinician, setSelectedClinician] = useState(null)
  
  // Caseload assignment selections
  const [selectedPatientIds, setSelectedPatientIds] = useState([])

  // Clinician profile edit states
  const [editForm, setEditForm] = useState({
    name: '',
    credentials: '',
    specialty: '',
    department: '',
    phone: ''
  })

  // Queries
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.getAll().then(res => res)
  })

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ['patients-all'],
    queryFn: () => api.patients.getAll(undefined, true).then(res => res) // include archived to show all
  })

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.sessions.getAll().then(res => res)
  })

  // Mutations
  const updateClinicianMutation = useMutation({
    mutationFn: ({ userId, data }) => api.users.update(userId, data),
    onSuccess: () => {
      toast.success('Clinician profile updated successfully')
      setIsEditModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update clinician')
    }
  })

  const assignCaseloadMutation = useMutation({
    mutationFn: ({ clinicianId, patientIds }) => api.users.assignPatients(clinicianId, patientIds),
    onSuccess: () => {
      toast.success('Caseload assigned successfully')
      setIsAssignModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['patients-all'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to assign caseload')
    }
  })

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.users.deactivate(id),
    onSuccess: () => {
      toast.success('Clinician deactivated successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to deactivate clinician')
    }
  })

  const activateMutation = useMutation({
    mutationFn: (id) => api.users.activate(id),
    onSuccess: () => {
      toast.success('Clinician activated successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to activate clinician')
    }
  })

  if (isLoadingUsers || isLoadingPatients || isLoadingSessions) return <LoadingScreen />

  // Extract SLP accounts
  const cliniciansList = users.filter(u => u.role === 'SLP')

  // Date helper: check if date is in the current month
  const isThisMonth = (dateString) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }

  // Filter clinicians
  const filteredClinicians = cliniciansList.filter(u => {
    const clinicianName = u.clinician?.name || u.name || ''
    return clinicianName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Open assignment modal helper
  const handleAssignClick = (clinician) => {
    setSelectedClinician(clinician)
    // Find patient IDs currently assigned to this clinician
    const clinicianId = clinician.clinician?.id
    const assignedIds = patients
      .filter(p => p.assignedSlpId === clinicianId && !p.isArchived)
      .map(p => p.id)
    setSelectedPatientIds(assignedIds)
    setIsAssignModalOpen(true)
  }

  // Open edit modal helper
  const handleEditClick = (u) => {
    setSelectedClinician(u)
    setEditForm({
      name: u.clinician?.name || u.name || '',
      credentials: u.clinician?.credentials || 'CCC-SLP',
      specialty: u.clinician?.specialty || '',
      department: u.clinician?.department || '',
      phone: u.clinician?.phone || ''
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    updateClinicianMutation.mutate({
      userId: selectedClinician.id,
      data: editForm
    })
  }

  const handleAssignSubmit = (e) => {
    e.preventDefault()
    assignCaseloadMutation.mutate({
      clinicianId: selectedClinician.clinician?.id,
      patientIds: selectedPatientIds
    })
  }

  const togglePatientSelection = (id) => {
    setSelectedPatientIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Clinician & Staff Management</h1>
          <p className="text-slate-500 mt-1">Review active therapists, assign active patient caseloads, and track SOAP logs.</p>
        </div>
      </div>

      {/* Search Filter */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clinician name or email..."
              className="pl-10 bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Clinician Name</th>
                <th className="py-4 px-6">Credentials</th>
                <th className="py-4 px-6">Active Caseload</th>
                <th className="py-4 px-6">Sessions (This Month)</th>
                <th className="py-4 px-6">Pending SOAP Notes</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredClinicians.map((u) => {
                const clinicianId = u.clinician?.id
                const assignedCount = patients.filter(p => p.assignedSlpId === clinicianId && !p.isArchived).length
                const monthlySessionsCount = sessions.filter(s => s.clinicianId === clinicianId && isThisMonth(s.dateOfService)).length
                const pendingSOAPCount = sessions.filter(s => s.clinicianId === clinicianId && s.status === 'DRAFT').length

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-slate-900">{u.clinician?.name || u.name || u.email.split('@')[0]}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 text-slate-600 font-medium">
                        <Award className="h-4 w-4 text-primary shrink-0" />
                        {u.clinician?.credentials || 'CCC-SLP'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                        {assignedCount} Patients
                      </Badge>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {monthlySessionsCount} Completed
                    </td>
                    <td className="py-4 px-6">
                      {pendingSOAPCount > 0 ? (
                        <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                          <AlertIcon className="h-4 w-4 shrink-0" />
                          {pendingSOAPCount} Drafts
                        </span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0" /> 0 Pending
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {u.isActive ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-500 font-medium text-xs">
                          <XCircle className="h-3.5 w-3.5" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleAssignClick(u)}
                          title="Assign Caseload"
                          className="hover:text-primary"
                          id={`assign-${u.email.split('@')[0]}`}
                        >
                          <ListPlus className="h-4 w-4 text-slate-500 hover:text-primary" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditClick(u)}
                          title="Edit Clinician Details"
                          id={`edit-slp-${u.email.split('@')[0]}`}
                        >
                          <Edit className="h-4 w-4 text-slate-500" />
                        </Button>
                        {u.isActive ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deactivateMutation.mutate(u.id)}
                            title="Deactivate Therapist"
                            className="hover:text-destructive"
                            id={`deactivate-slp-${u.email.split('@')[0]}`}
                          >
                            <XCircle className="h-4 w-4 text-slate-500 hover:text-destructive" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => activateMutation.mutate(u.id)}
                            title="Activate Therapist"
                            className="hover:text-emerald-600"
                            id={`activate-slp-${u.email.split('@')[0]}`}
                          >
                            <CheckCircle2 className="h-4 w-4 text-slate-500 hover:text-emerald-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredClinicians.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No therapists found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Caseload Assignment Modal */}
      {isAssignModalOpen && selectedClinician && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950 font-heading">Caseload Reassignment</h3>
                <p className="text-xs text-slate-500 mt-0.5">Therapist: {selectedClinician.clinician?.name || selectedClinician.name}</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Select Patients</span>
                <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
                  {patients.filter(p => !p.isArchived).map(p => {
                    const isSelected = selectedPatientIds.includes(p.id)
                    return (
                      <label key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => togglePatientSelection(p.id)}
                          className="h-4 w-4 text-primary border-slate-300 rounded-sm focus:ring-primary"
                          id={`assign-patient-chk-${p.name.replace(/\s+/g, '-')}`}
                        />
                        <div>
                          <span className="font-semibold text-sm text-slate-800">{p.name}</span>
                          {p.assignedSlpId && p.assignedSlpId !== selectedClinician.clinician?.id && (
                            <span className="text-[10px] text-amber-600 ml-2 font-normal">
                              (Currently assigned to another SLP)
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                  {patients.filter(p => !p.isArchived).length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">No active patients registered.</div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={assignCaseloadMutation.isPending} id="save-caseload-btn">
                  {assignCaseloadMutation.isPending ? 'Assigning...' : 'Save Caseload'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Clinician Profile Modal */}
      {isEditModalOpen && selectedClinician && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-950 font-heading">Edit Clinician Record</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Therapist Name</label>
                  <Input 
                    value={editForm.name} 
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                    placeholder="e.g. Dr. Meera Kulkarni"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Credentials</label>
                  <Input 
                    value={editForm.credentials} 
                    onChange={e => setEditForm({ ...editForm, credentials: e.target.value })} 
                    placeholder="e.g. CCC-SLP"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Specialty</label>
                  <Input 
                    value={editForm.specialty} 
                    onChange={e => setEditForm({ ...editForm, specialty: e.target.value })} 
                    placeholder="e.g. Speech Sound Disorders"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Department</label>
                  <Input 
                    value={editForm.department} 
                    onChange={e => setEditForm({ ...editForm, department: e.target.value })} 
                    placeholder="e.g. Pediatric Care"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Contact Phone</label>
                  <Input 
                    value={editForm.phone} 
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })} 
                    placeholder="9999999999"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateClinicianMutation.isPending} id="save-clinician-btn">
                  {updateClinicianMutation.isPending ? 'Saving...' : 'Save Details'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default DoctorManagement
