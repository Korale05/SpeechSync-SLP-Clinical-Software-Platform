import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, FileCheck2, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const cptCodes = [
  { code: '92507', desc: 'Individual Speech Therapy', rate: '$85.53' },
  { code: '92508', desc: 'Group Speech Therapy', rate: '$20.79–$80.88' },
  { code: '92521', desc: 'Fluency Evaluation', rate: '$150.00' },
  { code: '92522', desc: 'Speech Sound Evaluation', rate: '$165.00' },
  { code: '92523', desc: 'Comprehensive Language Evaluation', rate: '$210.00' },
  { code: '97550', desc: 'Caregiver Training (30 min)', rate: '$65.00' },
]

const Billing = () => {
  const queryClient = useQueryClient()
  const [scrubAlert, setScrubAlert] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  // Fetch billing records
  const { data: billing = [], isLoading: isBillingLoading } = useQuery({
    queryKey: ['billing'],
    queryFn: () => api.billing.getAll().then(res => res)
  })

  // Fetch patients
  const { data: patients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.patients.getAll().then(res => res)
  })

  // Update claim mutation
  const updateClaimMutation = useMutation({
    mutationFn: ({ id, data }) => api.billing.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      setSuccessMsg(`Successfully applied Modifier ${variables.data.modifiers[0]} to Claim #${variables.id}. Status changed to SUBMITTED.`)
      setScrubAlert(null)
      toast.success('Claim updated successfully!')
    },
    onError: (err) => {
      toast.error(`Failed to update claim: ${err.message}`)
    }
  })

  if (isBillingLoading || isPatientsLoading) return <LoadingScreen />

  // Calculate stats based on billing data
  const totalBilled = billing.reduce((acc, curr) => acc + (curr.billedAmount || 0), 0)
  const pendingCount = billing.filter(b => b.status === 'PENDING' || b.status === 'SUBMITTED').length
  const collectionsRate = "87.4%"

  // Calculate Medicare cap spend for patients dynamically
  const currentYear = new Date().getFullYear()
  const capData = patients.map(p => {
    const patientClaims = billing.filter(b => b.patientId === p.id && new Date(b.dateOfService).getFullYear() === currentYear)
    const used = patientClaims.reduce((sum, c) => sum + (c.billedAmount || 0), 0)
    const cap = 2480
    let status = 'safe'
    if (used >= cap) {
      status = 'danger'
    } else if (used >= cap - 200) {
      status = 'warning'
    }
    return {
      id: p.id,
      name: p.name,
      used,
      cap,
      status
    }
  })

  const handleRunScrubber = async () => {
    setSuccessMsg('')
    setScrubAlert(null)
    
    const claimsToScrub = billing.filter(b => b.status === 'PENDING' || b.status === 'DENIED')
    
    if (claimsToScrub.length === 0) {
      setScrubAlert({
        details: `No active pending or denied claims in current batch to scrub.`,
        actionable: false
      })
      return
    }

    try {
      let foundConflict = false
      
      for (const claim of claimsToScrub) {
        const result = await api.billing.scrub({
          patientId: claim.patientId,
          cptCodes: claim.cptCodes,
          icd10Codes: claim.icd10Codes
        })

        if (!result.clean) {
          foundConflict = true
          const patient = patients.find(p => p.id === claim.patientId) || { name: 'Unknown Patient' }
          setScrubAlert({
            claimId: claim.id,
            patientName: patient.name,
            details: result.flags.join(' ') + ' ' + (result.suggestions.length > 0 ? 'Suggestions: ' + result.suggestions.join(' ') : ''),
            actionable: true
          })
          break
        }
      }

      if (!foundConflict) {
        setScrubAlert({
          details: `All ${claimsToScrub.length} pending claims successfully audited. No billing code conflicts or threshold warnings found.`,
          actionable: false
        })
      }
    } catch (error) {
      console.error('Failed to scrub claims:', error)
      toast.error(`Failed to scrub claims: ${error.message}`)
    }
  }

  const applyModifier = (modifier) => {
    if (!scrubAlert || !scrubAlert.claimId) return

    updateClaimMutation.mutate({
      id: scrubAlert.claimId,
      data: {
        modifiers: [modifier],
        status: 'SUBMITTED',
        billedAmount: 180.00
      }
    })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 bg-slate-50 min-h-full">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Billing & Revenue</h1>
          <p className="text-slate-500">HIPAA compliant financial audits, modifier checks, and Medicare tracking.</p>
        </div>
        <Button className="shadow-sm bg-primary hover:bg-primary/95 text-white" onClick={handleRunScrubber}>
          <FileCheck2 className="mr-2 h-4 w-4" /> Run Claim Scrubber
        </Button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-2 shadow-xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Claim Scrubber Panel */}
      {scrubAlert && (
        <div className={`rounded-xl border-2 p-6 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4 duration-300 ${
          scrubAlert.actionable ? 'border-destructive/20 bg-destructive/5' : 'border-emerald-200 bg-emerald-50/50'
        }`}>
          <div className={`p-2 rounded-full ${scrubAlert.actionable ? 'bg-destructive/10 text-destructive' : 'bg-emerald-100 text-emerald-700'}`}>
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className={`font-bold text-lg ${scrubAlert.actionable ? 'text-red-950' : 'text-emerald-950'}`}>
              {scrubAlert.actionable ? 'Claim Scrubber: NCCI Edit Conflict Detected' : 'Claim Scrubber: Audit Passed'}
            </h4>
            <p className={`mt-1 text-sm ${scrubAlert.actionable ? 'text-red-800' : 'text-emerald-800'}`}>
              {scrubAlert.actionable ? (
                <span>Claim <strong>#{scrubAlert.claimId}</strong> for Patient <strong>{scrubAlert.patientName}</strong> contains bundled codes. {scrubAlert.details}</span>
              ) : (
                <span>{scrubAlert.details}</span>
              )}
            </p>
            {scrubAlert.actionable && (
              <div className="mt-4 flex gap-3">
                <Button variant="destructive" size="sm" onClick={() => applyModifier('59')} className="shadow-sm" disabled={updateClaimMutation.isPending}>
                  Apply Modifier 59
                </Button>
                <Button variant="outline" size="sm" onClick={() => setScrubAlert(null)} className="border-red-200 text-red-700 hover:bg-red-50">
                  Dismiss Alert
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Total Billed (Batch)</p>
            <h3 className="text-3xl font-bold font-heading text-slate-900">${totalBilled.toFixed(2)}</h3>
            <p className="text-xs text-accent mt-2 font-semibold">↑ 14.2% vs last batch</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-warning/20 bg-warning/5">
          <CardContent className="p-6">
            <p className="text-xs text-amber-800 uppercase font-semibold mb-2 flex justify-between">Denial Rate <AlertCircle className="h-4 w-4" /></p>
            <h3 className="text-3xl font-bold font-heading text-amber-900">11.2%</h3>
            <p className="text-xs text-amber-700 mt-2 font-medium">National SLP average: 10-15%</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Pending Claims</p>
            <h3 className="text-3xl font-bold font-heading text-slate-900">{pendingCount}</h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">Requires submission/review</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Collections Rate</p>
            <h3 className="text-3xl font-bold font-heading text-primary">{collectionsRate}</h3>
            <p className="text-xs text-accent mt-2 font-semibold">Healthy financial status</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Medicare Threshold Tracker */}
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-xl">Medicare Therapy Cap Tracker (2026)</CardTitle>
            <CardDescription>Combined PT/OT/SLP billing cap: <strong>$2,480</strong>. Track KX modifier limits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {capData.map((p, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    {p.status === 'warning' && <Badge variant="warning" className="text-[10px] h-5">KX Modifier Required Soon</Badge>}
                    {p.status === 'danger' && <Badge variant="destructive" className="text-[10px] h-5">Cap Exceeded</Badge>}
                  </div>
                  <span className="text-xs font-bold text-slate-600">${p.used} / ${p.cap}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${p.status === 'warning' ? 'bg-warning' : p.status === 'danger' ? 'bg-destructive' : 'bg-primary'}`} 
                    style={{ width: `${Math.min((p.used / p.cap) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* CPT Codes */}
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-xl">CPT Fee Schedule Reference</CardTitle>
            <CardDescription>Active SLP code rules and rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-xs uppercase">CPT</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase">Description</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cptCodes.map((code, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{code.code}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{code.desc}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{code.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claims Batch Table */}
      <Card className="shadow-xs border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="text-xl">Active Billing Batch</CardTitle>
          <CardDescription>List of current CPT claims in queue.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Claim ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">CPT Codes</th>
                  <th className="px-6 py-4">ICD-10</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Modifiers</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {billing.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-950">#{claim.id.substring(0, 8)}</td>
                    <td className="px-6 py-4">{new Date(claim.dateOfService).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4">
                      {claim.cptCodes.map((c, i) => (
                        <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-semibold mr-1">
                          {c}
                        </Badge>
                      ))}
                    </td>
                    <td className="px-6 py-4">
                      {claim.icd10Codes.map((icd, i) => (
                        <Badge key={i} variant="outline" className="mr-1">{icd}</Badge>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">
                      {claim.billedAmount ? `$${claim.billedAmount.toFixed(2)}` : 'Varies'}
                    </td>
                    <td className="px-6 py-4">
                      {claim.modifiers.length > 0 ? (
                        claim.modifiers.map((m, i) => <Badge key={i} className="bg-accent text-white">{m}</Badge>)
                      ) : (
                        <span className="text-slate-400 italic text-xs">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        claim.status === 'PAID' ? 'success' :
                        claim.status === 'PENDING' ? 'warning' :
                        claim.status === 'DENIED' ? 'destructive' : 'default'
                      }>
                        {claim.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

export default Billing
