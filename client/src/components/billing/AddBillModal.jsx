import React, { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from 'react-hot-toast'
import { Sparkles, HelpCircle, Check, X, AlertCircle } from 'lucide-react'

const CPT_OPTIONS = [
  { code: '92507', label: 'Individual Speech Therapy', defaultRate: 1500 },
  { code: '92508', label: 'Group Speech Therapy', defaultRate: 1000 },
  { code: '92521', label: 'Fluency Evaluation', defaultRate: 2000 },
  { code: '92522', label: 'Speech Sound Evaluation', defaultRate: 2000 },
  { code: '92523', label: 'Comprehensive Evaluation', defaultRate: 3000 },
  { code: '92526', label: 'Swallowing Treatment', defaultRate: 1800 },
  { code: '97550', label: 'Caregiver Training (30 min)', defaultRate: 1200 },
  { code: '97551', label: 'Caregiver Training Add-on', defaultRate: 800 }
]

const MODIFIER_OPTIONS = ['GN', 'KX', '52', '59']

export default function AddBillModal({ isOpen, onClose, patient, onSuccess, existingBill = null }) {
  const [dateOfService, setDateOfService] = useState(
    existingBill
      ? new Date(existingBill.dateOfService).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [selectedSession, setSelectedSession] = useState(existingBill?.sessionId || '')
  const [selectedCpts, setSelectedCpts] = useState(existingBill?.cptCodes || [])
  const [icd10Input, setIcd10Input] = useState('')
  const [icd10Codes, setIcd10Codes] = useState(existingBill?.icd10Codes || [])
  const [billedAmount, setBilledAmount] = useState(existingBill?.billedAmount || '')
  const [selectedModifiers, setSelectedModifiers] = useState(existingBill?.modifiers || [])
  const [notes, setNotes] = useState(existingBill?.notes || '')
  const [status, setStatus] = useState(existingBill?.status || 'PENDING')
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubResults, setScrubResults] = useState(null)
  const [cptSearch, setCptSearch] = useState('')

  // Automatically compute amount based on selected CPTs if not manually edited yet
  useEffect(() => {
    if (!existingBill && selectedCpts.length > 0) {
      const total = selectedCpts.reduce((sum, code) => {
        const option = CPT_OPTIONS.find(o => o.code === code)
        return sum + (option ? option.defaultRate : 0)
      }, 0)
      setBilledAmount(total)
    }
  }, [selectedCpts, existingBill])

  // Run scrubber
  const handleScrubClaims = async () => {
    if (selectedCpts.length === 0) {
      toast.error('Please select at least one CPT code first')
      return
    }
    setIsScrubbing(true)
    try {
      const res = await api.billing.scrub({
        cptCodes: selectedCpts,
        icd10Codes,
        modifiers: selectedModifiers,
        patientId: patient.id
      })
      setScrubResults(res)
      if (res.passed) {
        toast.success('Claim scrubber passed successfully!')
      } else {
        toast.error('Scrubber detected issues in billing setup.')
      }
    } catch (err) {
      toast.error('Failed to run scrubber: ' + err.message)
    } finally {
      setIsScrubbing(false)
    }
  }

  const handleAddIcd10 = () => {
    const code = icd10Input.trim().toUpperCase()
    if (!code) return
    if (icd10Codes.includes(code)) {
      toast.error('ICD-10 code already added')
      return
    }
    setIcd10Codes([...icd10Codes, code])
    setIcd10Input('')
  }

  const handleRemoveIcd10 = (code) => {
    setIcd10Codes(icd10Codes.filter(c => c !== code))
  }

  const toggleCpt = (code) => {
    if (selectedCpts.includes(code)) {
      setSelectedCpts(selectedCpts.filter(c => c !== code))
    } else {
      setSelectedCpts([...selectedCpts, code])
    }
  }

  const toggleModifier = (mod) => {
    if (selectedModifiers.includes(mod)) {
      setSelectedModifiers(selectedModifiers.filter(m => m !== mod))
    } else {
      setSelectedModifiers([...selectedModifiers, mod])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedCpts.length === 0) {
      toast.error('Please select at least one CPT Code')
      return
    }
    if (!billedAmount || Number(billedAmount) <= 0) {
      toast.error('Please enter a valid Billed Amount')
      return
    }

    const payload = {
      patientId: patient.id,
      sessionId: selectedSession || null,
      dateOfService,
      cptCodes: selectedCpts,
      icd10Codes,
      billedAmount: parseInt(billedAmount, 10),
      modifiers: selectedModifiers,
      notes,
      status
    }

    try {
      if (existingBill) {
        await api.billing.update(existingBill.id, payload)
        toast.success(`Bill updated for ${patient.name}`)
      } else {
        await api.billing.create(payload)
        toast.success(`Bill of ₹${parseInt(billedAmount).toLocaleString('en-IN')} added for ${patient.name}`)
      }
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to save billing record')
    }
  }

  if (!isOpen) return null

  const filteredCpts = CPT_OPTIONS.filter(opt =>
    opt.code.includes(cptSearch) || opt.label.toLowerCase().includes(cptSearch.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {existingBill ? 'Edit Bill Record' : 'Create New Bill'}
            </h3>
            <p className="text-xs text-slate-500">Patient: <strong className="text-slate-700">{patient.name}</strong></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient (Read only) */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Patient</label>
              <Input value={patient.name} disabled className="bg-slate-50 border-slate-200 text-slate-600" />
            </div>

            {/* Date of Service */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Date of Service</label>
              <Input
                type="date"
                value={dateOfService}
                onChange={e => setDateOfService(e.target.value)}
                required
                className="border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Session association */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Link to Session <span className="text-[10px] text-slate-400 capitalize">(Optional)</span>
              </label>
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Direct Billing / Not Linked to Session --</option>
                {patient.sessions && patient.sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.dateOfService).toLocaleDateString('en-IN')} — {s.cptCode} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CPT Codes Selection with search */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              CPT Code(s) <span className="text-rose-500">*</span>
            </label>
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
              <Input
                type="text"
                placeholder="Search CPT codes..."
                value={cptSearch}
                onChange={e => setCptSearch(e.target.value)}
                className="h-8 text-xs border-slate-200 bg-white"
              />
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {filteredCpts.map(opt => {
                  const isChecked = selectedCpts.includes(opt.code)
                  return (
                    <div
                      key={opt.code}
                      onClick={() => toggleCpt(opt.code)}
                      className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'border-primary/30 bg-primary/5 text-primary font-medium'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>
                        <strong className="font-semibold text-slate-900">{opt.code}</strong> — {opt.label}
                      </span>
                      <span className="text-slate-400">₹{opt.defaultRate}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ICD-10 Codes */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              ICD-10 Code(s)
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Enter code (e.g. F80.2)"
                value={icd10Input}
                onChange={e => setIcd10Input(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddIcd10())}
                className="border-slate-200"
              />
              <Button type="button" onClick={handleAddIcd10} variant="outline" className="px-4">Add</Button>
            </div>
            {icd10Codes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                {icd10Codes.map(code => (
                  <span key={code} className="inline-flex items-center gap-1 bg-white text-slate-800 text-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-xs font-medium">
                    {code}
                    <button type="button" onClick={() => handleRemoveIcd10(code)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No ICD-10 codes added. Enter and click Add.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Billed Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Billed Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <Input
                  type="number"
                  value={billedAmount}
                  onChange={e => setBilledAmount(e.target.value)}
                  placeholder="0"
                  required
                  className="pl-7 border-slate-200 focus:border-primary"
                />
              </div>
            </div>

            {/* Modifiers */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Modifiers</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {MODIFIER_OPTIONS.map(mod => {
                  const isChecked = selectedModifiers.includes(mod)
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModifier(mod)}
                      className={`h-9 px-3.5 rounded-md border text-xs font-semibold transition-all ${
                        isChecked
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {mod}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="E.g. Parent requests physical receipt. Billed under corporate plan."
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-md p-3 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Claim Scrubber Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" /> Clinical Claim Scrubber
              </span>
              <Button
                type="button"
                onClick={handleScrubClaims}
                variant="outline"
                size="sm"
                disabled={isScrubbing}
                className="h-7 text-[10px] px-2 bg-white"
              >
                {isScrubbing ? 'Scrubbing...' : 'Run Scrubber Checks'}
              </Button>
            </div>

            {scrubResults && (
              <div className="text-xs space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                {scrubResults.passed ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-50/50 p-1.5 rounded-md border border-emerald-100">
                    <Check className="h-3.5 w-3.5" /> All standard compliance checks passed! Ready for claim submission.
                  </div>
                ) : (
                  <div className="space-y-1 bg-rose-50/50 p-2 rounded-md border border-rose-100">
                    {scrubResults.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-start gap-1 text-rose-700">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{issue.message}</span>
                      </div>
                    ))}
                    {scrubResults.suggestedModifiers?.length > 0 && (
                      <div className="text-slate-600 pt-1">
                        Suggested modifiers to add: <strong className="text-slate-800">{scrubResults.suggestedModifiers.join(', ')}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Radio Option */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Claim status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="PENDING"
                  checked={status === 'PENDING'}
                  onChange={e => setStatus(e.target.value)}
                  className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                />
                Pending Claim
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="SUBMITTED"
                  checked={status === 'SUBMITTED'}
                  onChange={e => setStatus(e.target.value)}
                  className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                />
                Submitted Claim
              </label>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="shadow-sm">
              {existingBill ? 'Save Changes' : 'Save Bill'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
