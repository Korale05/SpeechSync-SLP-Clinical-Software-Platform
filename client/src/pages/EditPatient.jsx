import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserCheck, ArrowLeft, Loader2 } from 'lucide-react'
import LoadingScreen from '../components/LoadingScreen'


const patientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date of birth'
  }),
  gender: z.string().optional(),
  age: z.coerce.number().min(0, 'Age must be 0 or greater').optional(),
  guardianName: z.string().min(2, 'Guardian Name must be at least 2 characters'),
  guardianPhone: z.string().min(8, 'Phone number must be at least 8 digits'),
  guardianEmail: z.string().email('Please enter a valid email address').or(z.literal('')),
  insuranceCarrier: z.string().optional(),
  insurancePolicy: z.string().optional(),
  diagnoses: z.string().min(2, 'Please enter at least one primary diagnosis'),
  assignedSlpId: z.string().min(1, 'Please select an assigned SLP'),
  createParentPortalAccount: z.boolean().optional(),
  createSchoolPortalAccount: z.boolean().optional(),
  schoolName: z.string().optional(),
  schoolCoordinatorName: z.string().optional(),
  schoolEmail: z.string().optional(),
  schoolPhone: z.string().optional(),
})

const EditPatient = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch patient profile
  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.patients.getById(id).then((res) => res),
    enabled: !!id
  })

  // Fetch clinicians list
  const { data: clinicians = [], isLoading: isLoadingClinicians } = useQuery({
    queryKey: ['clinicians'],
    queryFn: () => api.patients.getClinicians().then((res) => res)
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(patientSchema)
  })

  // Populate form values when patient is loaded
  React.useEffect(() => {
    if (patient) {
      // Format DOB from ISO date to yyyy-mm-dd for input field
      const formattedDob = patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : ''
      const genderVal = patient.metadata?.gender || 'Male'
      const ageVal = patient.metadata?.age || 0
      
      reset({
        name: patient.name || '',
        dob: formattedDob,
        gender: genderVal,
        age: ageVal,
        guardianName: patient.guardianName || '',
        guardianPhone: patient.guardianPhone || '',
        guardianEmail: patient.guardianEmail || '',
        insuranceCarrier: patient.insuranceCarrier || '',
        insurancePolicy: patient.insurancePolicy || '',
        diagnoses: patient.diagnoses ? patient.diagnoses.join(', ') : '',
        assignedSlpId: patient.assignedSlpId || '',
        createParentPortalAccount: false,
        createSchoolPortalAccount: false,
        schoolName: '',
        schoolCoordinatorName: '',
        schoolEmail: '',
        schoolPhone: '',
      })
    }
  }, [patient, reset])

  // Watch dob to auto-calculate age
  const dobWatch = watch('dob')
  React.useEffect(() => {
    if (dobWatch) {
      const birthDate = new Date(dobWatch)
      if (!isNaN(birthDate.getTime())) {
        const ageDiff = Date.now() - birthDate.getTime()
        const ageDate = new Date(ageDiff)
        const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970)
        setValue('age', calculatedAge)
      }
    }
  }, [dobWatch, setValue])

  // Update patient mutation
  const updatePatientMutation = useMutation({
    mutationFn: (data) => {
      const diagnosesArray = data.diagnoses
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.length > 0)

      return api.patients.update(id, {
        ...data,
        diagnoses: diagnosesArray,
      })
    },
    onSuccess: (data) => {
      toast.success('Patient details updated successfully')

      if (data?.parentAccount || data?.schoolAccount) {
        toast((t) => (
          <div className="flex flex-col gap-2">
            {data?.parentAccount && (
              <>
                <p className="font-bold">Parent Account Created!</p>
                <p className="text-sm">Username: {data.parentAccount.email}</p>
                <p className="text-sm font-mono bg-slate-100 p-1 rounded">Password: {data.parentAccount.temporaryPassword}</p>
              </>
            )}
            {data?.schoolAccount && (
              <>
                <p className="font-bold mt-2">School Account Created!</p>
                <p className="text-sm">Username: {data.schoolAccount.email}</p>
                <p className="text-sm font-mono bg-slate-100 p-1 rounded">Password: {data.schoolAccount.temporaryPassword}</p>
              </>
            )}
            <Button size="sm" className="mt-2" onClick={() => toast.dismiss(t.id)}>Dismiss</Button>
          </div>
        ), { duration: 15000 })
      }

      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient', id] })
      navigate('/patients')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update patient')
    }
  })

  const onSubmit = (data) => {
    updatePatientMutation.mutate(data)
  }

  if (isLoadingPatient) {
    return <LoadingScreen />
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/patients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Edit Patient Profile</h1>
          <p className="text-slate-500">Update medical and contact records for {patient?.name}.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" /> Demographics
            </CardTitle>
            <CardDescription>Basic identifier and age details</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Patient Name *</label>
              <Input
                {...register('name')}
                placeholder="Full Name"
                className={errors.name ? 'border-destructive' : 'border-slate-200'}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Date Of Birth *</label>
              <Input
                type="date"
                {...register('dob')}
                className={errors.dob ? 'border-destructive' : 'border-slate-200'}
              />
              {errors.dob && <p className="text-xs text-destructive">{errors.dob.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Gender</label>
              <select
                {...register('gender')}
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Calculated Age</label>
              <Input
                type="number"
                {...register('age')}
                disabled
                className="bg-slate-50 border-slate-200"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Guardian Details</CardTitle>
            <CardDescription>Primary contact information for scheduling and consent</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Guardian Name *</label>
              <Input
                {...register('guardianName')}
                placeholder="Guardian Full Name"
                className={errors.guardianName ? 'border-destructive' : 'border-slate-200'}
              />
              {errors.guardianName && <p className="text-xs text-destructive">{errors.guardianName.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Guardian Phone *</label>
              <Input
                {...register('guardianPhone')}
                placeholder="+1 (555) 000-0000"
                className={errors.guardianPhone ? 'border-destructive' : 'border-slate-200'}
              />
              {errors.guardianPhone && <p className="text-xs text-destructive">{errors.guardianPhone.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Guardian Email</label>
              <Input
                type="email"
                {...register('guardianEmail')}
                placeholder="guardian@example.com"
                className={errors.guardianEmail ? 'border-destructive' : 'border-slate-200'}
              />
              {errors.guardianEmail && <p className="text-xs text-destructive">{errors.guardianEmail.message}</p>}
            </div>

            {!patient?.parentUserId && (
              <div className="space-y-2 md:col-span-3 mt-2 border-t border-slate-100 pt-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('createParentPortalAccount')}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  Create/Link Parent Portal Account
                </label>
                <p className="text-xs text-slate-500 pl-6">
                  If checked, an account will be automatically generated (or linked if email exists). Guardian email is required.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">School Integration</CardTitle>
            <CardDescription>Link this patient to a school portal account for IEP tracking</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">School Name</label>
              <Input
                {...register('schoolName')}
                placeholder="e.g. Lincoln Elementary"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Coordinator Name</label>
              <Input
                {...register('schoolCoordinatorName')}
                placeholder="e.g. Ms. Sarah Jenkins"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">School Email</label>
              <Input
                type="email"
                {...register('schoolEmail')}
                placeholder="school@example.com"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">School Phone</label>
              <Input
                {...register('schoolPhone')}
                placeholder="+1 (555) 000-0000"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2 md:col-span-2 mt-2 border-t border-slate-100 pt-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  {...register('createSchoolPortalAccount')}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                Create/Link School Portal Account
              </label>
              <p className="text-xs text-slate-500 pl-6">
                If checked, an account will be automatically generated (or linked if email exists). School email is required.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Insurance & Billing</CardTitle>
            <CardDescription>Required credentials for automated NCCI billing</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Insurance Carrier</label>
              <Input
                {...register('insuranceCarrier')}
                placeholder="e.g. BlueCross BlueShield"
                className="border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Policy Number</label>
              <Input
                {...register('insurancePolicy')}
                placeholder="Policy # / Group #"
                className="border-slate-200"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Clinical Information</CardTitle>
            <CardDescription>Primary clinician assignments and diagnostic labels</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Diagnoses (comma separated) *</label>
              <Input
                {...register('diagnoses')}
                placeholder="e.g. Speech Sound Disorder, Expressive Language Disorder"
                className={errors.diagnoses ? 'border-destructive' : 'border-slate-200'}
              />
              {errors.diagnoses && <p className="text-xs text-destructive">{errors.diagnoses.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Assigned SLP *</label>
              {isLoadingClinicians ? (
                <div className="flex items-center gap-2 h-10 text-slate-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading SLPs...
                </div>
              ) : (
                <select
                  {...register('assignedSlpId')}
                  className={`w-full h-10 px-3 rounded-md border bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-ring ${
                    errors.assignedSlpId ? 'border-destructive' : 'border-slate-200'
                  }`}
                >
                  <option value="">Select Clinician</option>
                  {clinicians.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.credentials})
                    </option>
                  ))}
                </select>
              )}
              {errors.assignedSlpId && <p className="text-xs text-destructive">{errors.assignedSlpId.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/patients')}>
            Cancel
          </Button>
          <Button type="submit" disabled={updatePatientMutation.isPending}>
            {updatePatientMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save Patient'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EditPatient
