import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  UserPlus, Search, Edit2, RotateCcw, Shield, Mail, Key, ShieldAlert,
  UserCheck, UserX, School, User, CheckCircle2, XCircle, Info
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const UserManagement = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // Password reset success modal state
  const [resetSuccessData, setResetSuccessData] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SLP',
    phone: '',
    specialty: '',
    licenseNo: '',
    credentials: 'CCC-SLP',
    department: '',
    schoolName: '',
    linkedPatientId: ''
  })

  // Queries
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.getAll().then(res => res)
  })

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-active'],
    queryFn: () => api.patients.getAll(undefined, false).then(res => res)
  })

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (data) => api.users.create(data),
    onSuccess: (res) => {
      toast.success('User created successfully')
      setIsCreateModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      // If temporary password returned, show it
      if (res.temporaryPassword) {
        setResetSuccessData({
          email: res.username,
          temporaryPassword: res.temporaryPassword,
          title: 'User Account Created'
        })
      }
      resetForm()
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create user')
    }
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => api.users.update(id, data),
    onSuccess: () => {
      toast.success('User updated successfully')
      setIsEditModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      resetForm()
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update user')
    }
  })

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.users.deactivate(id),
    onSuccess: () => {
      toast.success('User deactivated successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to deactivate user')
    }
  })

  const activateMutation = useMutation({
    mutationFn: (id) => api.users.activate(id),
    onSuccess: () => {
      toast.success('User activated successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to activate user')
    }
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => api.users.resetPassword(id),
    onSuccess: (res) => {
      setResetSuccessData({
        email: res.email || selectedUser?.email,
        temporaryPassword: res.temporaryPassword,
        title: 'Password Reset Successful'
      })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to reset password')
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'SLP',
      phone: '',
      specialty: '',
      licenseNo: '',
      credentials: 'CCC-SLP',
      department: '',
      schoolName: '',
      linkedPatientId: ''
    })
    setSelectedUser(null)
  }

  const handleEditClick = (user) => {
    setSelectedUser(user)
    const meta = user.metadata || {}
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Do not populate password for edits
      role: user.role || 'SLP',
      phone: meta.phone || '',
      specialty: user.clinician?.specialty || '',
      licenseNo: user.clinician?.licenseNo || '',
      credentials: user.clinician?.credentials || 'CCC-SLP',
      department: user.clinician?.department || '',
      schoolName: meta.schoolName || '',
      linkedPatientId: meta.linkedPatientId || ''
    })
    setIsEditModalOpen(true)
  }

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    createUserMutation.mutate(formData)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    // Do not send password on update unless filled
    const payload = { ...formData }
    if (!payload.password) delete payload.password
    updateUserMutation.mutate({ id: selectedUser.id, data: payload })
  }

  if (isLoadingUsers) return <LoadingScreen />

  // Filter logic
  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'ALL' && user.role !== roleFilter) return false
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      const matchesEmail = user.email.toLowerCase().includes(term)
      const matchesName = user.name?.toLowerCase().includes(term)
      const matchesClinician = user.clinician?.name?.toLowerCase().includes(term)
      if (!matchesEmail && !matchesName && !matchesClinician) return false
    }
    
    return true
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage system accounts, assign roles, reset credentials, and audit accounts.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateModalOpen(true); }} className="shadow-sm">
          <UserPlus className="mr-2 h-4 w-4" /> Create User
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-10 bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Administrator</option>
              <option value="SLP">Speech Therapist (SLP)</option>
              <option value="PARENT">Parent</option>
              <option value="SCHOOL_COORDINATOR">School Coordinator</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Email / Username</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Last Login</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredUsers.map((u) => {
                const displayName = u.clinician?.name || u.name || 'No Name Provided'
                const formattedDate = u.lastLogin 
                  ? new Date(u.lastLogin).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Never logged in'

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {displayName}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="h-3.5 w-3.5" />
                        {u.email}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="outline" className="font-normal capitalize border-slate-200">
                        {u.role.toLowerCase().replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      {u.isActive ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-500 font-medium text-xs">
                          <XCircle className="h-3.5 w-3.5" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {formattedDate}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditClick(u)}
                          title="Edit User"
                          id={`edit-user-${u.email.split('@')[0]}`}
                        >
                          <Edit2 className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setSelectedUser(u); resetPasswordMutation.mutate(u.id); }}
                          title="Reset Password"
                          className="hover:text-primary"
                          id={`reset-pwd-${u.email.split('@')[0]}`}
                        >
                          <Key className="h-4 w-4 text-slate-500 hover:text-primary" />
                        </Button>
                        {u.isActive ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deactivateMutation.mutate(u.id)}
                            title="Deactivate Account"
                            className="hover:text-destructive"
                            id={`deactivate-${u.email.split('@')[0]}`}
                          >
                            <UserX className="h-4 w-4 text-slate-500 hover:text-destructive" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => activateMutation.mutate(u.id)}
                            title="Activate Account"
                            className="hover:text-emerald-600"
                            id={`activate-${u.email.split('@')[0]}`}
                          >
                            <UserCheck className="h-4 w-4 text-slate-500 hover:text-emerald-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No users found matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-950">Create New User Account</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Full Name</label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="e.g. Dr. Meera Kulkarni"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Email / Username</label>
                  <Input 
                    type="email"
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    placeholder="name@speechsync.in"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Initial Password</label>
                  <Input 
                    type="password"
                    value={formData.password} 
                    onChange={e => setFormData({ ...formData, password: e.target.value })} 
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Role Type</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                    id="create-role-select"
                  >
                    <option value="SLP">Speech Therapist (SLP)</option>
                    <option value="PARENT">Parent</option>
                    <option value="SCHOOL_COORDINATOR">School Coordinator</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Phone Number</label>
                  <Input 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                    placeholder="9999999999"
                  />
                </div>
              </div>

              {/* Conditional Fields based on Role selection */}
              {formData.role === 'SLP' && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-primary" /> Clinical Staff Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Credentials</label>
                      <Input 
                        value={formData.credentials} 
                        onChange={e => setFormData({ ...formData, credentials: e.target.value })} 
                        placeholder="e.g. CCC-SLP"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">License Number</label>
                      <Input 
                        value={formData.licenseNo} 
                        onChange={e => setFormData({ ...formData, licenseNo: e.target.value })} 
                        placeholder="e.g. SLP-1234"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Specialty</label>
                      <Input 
                        value={formData.specialty} 
                        onChange={e => setFormData({ ...formData, specialty: e.target.value })} 
                        placeholder="e.g. Articulation, Feeding, Aphasia"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Department</label>
                      <Input 
                        value={formData.department} 
                        onChange={e => setFormData({ ...formData, department: e.target.value })} 
                        placeholder="e.g. Pediatric Speech Pathology"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.role === 'PARENT' && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary" /> Parent Portal Association
                  </h4>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Linked Child / Patient</label>
                    <select
                      value={formData.linkedPatientId}
                      onChange={e => setFormData({ ...formData, linkedPatientId: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden"
                      id="parent-child-select"
                    >
                      <option value="">-- Select Child --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {formData.role === 'SCHOOL_COORDINATOR' && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <School className="h-4 w-4 text-primary" /> School Coordinator Details
                  </h4>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">School / District Name</label>
                    <Input 
                      value={formData.schoolName} 
                      onChange={e => setFormData({ ...formData, schoolName: e.target.value })} 
                      placeholder="e.g. Greenfield Public School"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending} id="submit-create-user-btn">
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-950">Edit User Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Full Name</label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="e.g. Dr. Meera Kulkarni"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Email / Username</label>
                  <Input 
                    type="email"
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Phone Number</label>
                  <Input 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                    placeholder="9999999999"
                  />
                </div>

                <div className="col-span-2">
                  <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs text-slate-500 flex items-start gap-1.5">
                    <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>To reset or update password credentials, use the <strong>Reset Password (Key)</strong> button directly in the action controls list.</span>
                  </div>
                </div>
              </div>

              {/* Conditional Fields based on Role selection */}
              {formData.role === 'SLP' && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-primary" /> Clinical Staff Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Credentials</label>
                      <Input 
                        value={formData.credentials} 
                        onChange={e => setFormData({ ...formData, credentials: e.target.value })} 
                        placeholder="e.g. CCC-SLP"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">License Number</label>
                      <Input 
                        value={formData.licenseNo} 
                        onChange={e => setFormData({ ...formData, licenseNo: e.target.value })} 
                        placeholder="e.g. SLP-1234"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Specialty</label>
                      <Input 
                        value={formData.specialty} 
                        onChange={e => setFormData({ ...formData, specialty: e.target.value })} 
                        placeholder="e.g. Articulation, Feeding, Aphasia"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Department</label>
                      <Input 
                        value={formData.department} 
                        onChange={e => setFormData({ ...formData, department: e.target.value })} 
                        placeholder="e.g. Pediatric Speech Pathology"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.role === 'PARENT' && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary" /> Parent Portal Association
                  </h4>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Linked Child / Patient</label>
                    <select
                      value={formData.linkedPatientId}
                      onChange={e => setFormData({ ...formData, linkedPatientId: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden"
                      id="edit-parent-child-select"
                    >
                      <option value="">-- Select Child --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {formData.role === 'SCHOOL_COORDINATOR' && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <School className="h-4 w-4 text-primary" /> School Coordinator Details
                  </h4>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">School / District Name</label>
                    <Input 
                      value={formData.schoolName} 
                      onChange={e => setFormData({ ...formData, schoolName: e.target.value })} 
                      placeholder="e.g. Greenfield Public School"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending} id="submit-edit-user-btn">
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset / Create Credentials Alert Modal */}
      {resetSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                  <Key className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{resetSuccessData.title}</h3>
              </div>
              
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Username / Email</span>
                  <p className="font-mono text-sm text-slate-800 font-semibold mt-0.5">{resetSuccessData.email}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Temporary Password</span>
                  <p className="font-mono text-base text-primary font-bold mt-0.5 bg-white border border-slate-100 px-3 py-1.5 rounded-sm select-all">
                    {resetSuccessData.temporaryPassword}
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-xs flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>Make sure to copy these login credentials. The temporary password will not be shown again.</span>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end border-t border-slate-100">
              <Button onClick={() => setResetSuccessData(null)} id="close-credentials-modal-btn">
                Close & Done
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default UserManagement
