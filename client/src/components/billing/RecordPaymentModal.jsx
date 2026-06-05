import React, { useState } from 'react'
import { api } from '../../services/api'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from 'react-hot-toast'
import { X, Calendar, DollarSign, CreditCard, User } from 'lucide-react'

const PAYMENT_MODES = [
  'Cash',
  'UPI',
  'Net Banking',
  'Insurance',
  'Cheque',
  'NEFT/RTGS'
]

export default function RecordPaymentModal({ isOpen, onClose, bill, onSuccess }) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [amountPaid, setAmountPaid] = useState(bill?.billedAmount || '')
  const [paymentMode, setPaymentMode] = useState('UPI')
  const [referenceId, setReferenceId] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !bill) return null

  // Auto reference summary helper
  const billDate = new Date(bill.dateOfService).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  const billReference = `${bill.cptCodes.join(', ')} — ${billDate} — ₹${bill.billedAmount.toLocaleString('en-IN')}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amountPaid || Number(amountPaid) <= 0) {
      toast.error('Please enter a valid amount paid')
      return
    }

    setIsSubmitting(true)
    try {
      const paymentDetails = {
        paymentDate,
        paymentMode,
        referenceId: referenceId.trim() || null,
        paidBy: paidBy.trim() || null,
        notes: notes.trim() || null
      }

      await api.billing.update(bill.id, {
        status: 'PAID',
        paidAmount: parseFloat(amountPaid),
        paymentDetails
      })

      toast.success('Payment successfully recorded!')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Reference: <strong className="text-slate-700">{billReference}</strong></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Payment Date */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Payment Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                required
                className="pl-10 border-slate-200"
              />
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Amount Paid (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
              <Input
                type="number"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder="Enter amount paid"
                required
                className="pl-7 border-slate-200"
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Payment Mode
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                {PAYMENT_MODES.map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Paid By */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Paid By
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                value={paidBy}
                onChange={e => setPaidBy(e.target.value)}
                placeholder="E.g. Parent name, insurance group"
                className="pl-10 border-slate-200"
              />
            </div>
          </div>

          {/* Transaction / Reference ID */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Transaction / Reference ID <span className="text-[10px] text-slate-400 capitalize">(Optional)</span>
            </label>
            <Input
              type="text"
              value={referenceId}
              onChange={e => setReferenceId(e.target.value)}
              placeholder="E.g. UPI Ref / Txn ID / Cheque No"
              className="border-slate-200"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Payment Notes <span className="text-[10px] text-slate-400 capitalize">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Enter any relevant payment comments..."
              rows={2}
              className="w-full text-xs border border-slate-200 rounded-md p-2.5 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="shadow-sm">
              {isSubmitting ? 'Recording...' : 'Confirm Payment'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
