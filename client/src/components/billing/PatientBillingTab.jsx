import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { toast } from 'react-hot-toast'
import useAuthStore, { ROLES } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Calendar, FileText, CheckCircle2, AlertTriangle,
  RefreshCw, Info, Eye, X, Receipt, Download
} from 'lucide-react'

const PRESET_DESCRIPTIONS = [
  'Speech Therapy Session',
  'Assessment',
  'Teletherapy Session',
  'Home Program',
  'Consultation'
]

export default function PatientBillingTab({ patient }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  
  // Invoice Form states
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [gstRate, setGstRate] = useState(18)
  const [items, setItems] = useState([{ description: 'Speech Therapy Session', quantity: 1, rate: 1500 }])

  // Fetch billing data for this specific patient
  const { data: billingData = { invoices: [], payments: [], outstandingBalance: 0 }, isLoading, error, refetch } = useQuery({
    queryKey: ['patient-billing', patient.id],
    queryFn: () => api.patients.getBilling(patient.id),
    enabled: !!patient.id
  })

  const invoices = billingData.invoices || []
  const payments = billingData.payments || []
  const outstandingFromApi = billingData.outstandingBalance || 0

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (invoiceData) => api.invoices.create(invoiceData),
    onSuccess: () => {
      toast.success('Invoice created successfully!')
      queryClient.invalidateQueries({ queryKey: ['patient-billing', patient.id] })
      setIsAddOpen(false)
      resetCreateForm()
    },
    onError: (err) => {
      toast.error('Failed to create invoice: ' + err.message)
    }
  })

  const resetCreateForm = () => {
    setInvoiceDate(new Date().toISOString().split('T')[0])
    const d = new Date()
    d.setDate(d.getDate() + 14)
    setDueDate(d.toISOString().split('T')[0])
    setNotes('')
    setGstRate(18)
    setItems([{ description: 'Speech Therapy Session', quantity: 1, rate: 1500 }])
  }

  // Items manipulation
  const handleAddItem = () => {
    setItems([...items, { description: 'Speech Therapy Session', quantity: 1, rate: 1500 }])
  }

  const handleRemoveItem = (index) => {
    if (items.length === 1) return
    setItems(items.filter((_, idx) => idx !== index))
  }

  const handleUpdateItem = (index, field, value) => {
    const updated = [...items]
    updated[index][field] = value
    setItems(updated)
  }

  // Calculation helpers
  const getSubtotal = () => items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
  const getTax = () => getSubtotal() * (gstRate / 100)
  const getTotal = () => getSubtotal() + getTax()

  const handleSaveInvoice = (e) => {
    e.preventDefault()
    if (items.some(i => !i.description || i.quantity <= 0 || i.rate <= 0)) {
      toast.error('Please fill in all item fields with valid positive values')
      return
    }

    createInvoiceMutation.mutate({
      patientId: patient.id,
      invoiceDate,
      dueDate,
      notes,
      gstRate,
      items
    })
  }

  // Compute summary metrics
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
  const outstanding = outstandingFromApi

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-500 text-white font-semibold border-none">🟢 PAID</Badge>
      case 'PARTIALLY_PAID':
        return <Badge className="bg-blue-400 text-white font-semibold border-none">🔵 PARTIAL</Badge>
      case 'PENDING':
        return <Badge className="bg-amber-500 text-white font-semibold border-none">🟡 PENDING</Badge>
      case 'OVERDUE':
        return <Badge className="bg-rose-500 text-white font-semibold border-none">🔴 OVERDUE</Badge>
      case 'DRAFT':
        return <Badge className="bg-slate-400 text-white font-semibold border-none">DRAFT</Badge>
      case 'CANCELLED':
        return <Badge className="bg-slate-300 text-white font-semibold border-none">CANCELLED</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const isAdmin = user?.role === ROLES.ADMIN

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <span className="ml-3 text-slate-500 text-sm">Loading invoices...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Title & Actions Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-xl font-bold text-slate-900">Billing & Invoices</h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage bills, invoice publications, and transaction histories for {patient.name}.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddOpen(true)} className="shadow-xs bg-slate-900 hover:bg-slate-800 text-white font-medium">
            <Plus className="mr-1.5 h-4 w-4" /> Add Bill
          </Button>
        )}
      </div>

      {/* Main Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Billed</p>
              <h4 className="text-2xl font-bold text-slate-800 mt-1">₹{totalBilled.toLocaleString('en-IN')}</h4>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Paid</p>
              <h4 className="text-2xl font-bold text-emerald-600 mt-1">₹{totalPaid.toLocaleString('en-IN')}</h4>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Outstanding</p>
              <h4 className={`text-2xl font-bold mt-1 ${outstanding > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                ₹{outstanding.toLocaleString('en-IN')}
              </h4>
            </div>
            <div className={`p-2.5 rounded-lg border ${outstanding > 0 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bill Table */}
      <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
        <div className="overflow-x-auto">
          {invoices.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-5">Invoice Number</th>
                  <th className="py-4 px-5">Date</th>
                  <th className="py-4 px-5">Due Date</th>
                  <th className="py-4 px-5 text-right">Amount</th>
                  <th className="py-4 px-5 text-right">Paid</th>
                  <th className="py-4 px-5 text-right">Balance</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {invoices.map((inv) => {
                  const billDate = new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                  const dueDateVal = new Date(inv.dueDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="py-4 px-5 font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap text-slate-500 text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {billDate}
                        </div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap text-slate-500 text-xs">
                        {dueDateVal}
                      </td>
                      <td className="py-4 px-5 text-right font-extrabold text-slate-900">
                        ₹{inv.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-5 text-right font-semibold text-emerald-600">
                        ₹{inv.paidAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-5 text-right font-bold text-slate-800">
                        ₹{inv.balanceAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-5 text-center">
                        {getStatusBadge(inv.status)}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <Button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 rounded-md"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 bg-white space-y-4">
              <FileText className="h-10 w-10 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-700">No Billing Invoices</h4>
                <p className="text-xs text-slate-400 mt-1">There are no PostgreSQL invoices published for this patient yet.</p>
              </div>
              {isAdmin && (
                <Button onClick={() => setIsAddOpen(true)} variant="outline" size="sm" className="mt-2">
                  Create First Invoice
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Payments History Table */}
      <div className="space-y-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-slate-900">Payment & Receipt History</h3>
          <p className="text-xs text-slate-500 mt-0.5">Track all payments processed for this patient and download receipts.</p>
        </div>
        <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
          <div className="overflow-x-auto">
            {payments.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-5">Receipt ID</th>
                    <th className="py-4 px-5">Date</th>
                    <th className="py-4 px-5">Method</th>
                    <th className="py-4 px-5">Transaction ID</th>
                    <th className="py-4 px-5 text-right">Amount</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {payments.map((p) => {
                    const isRefund = p.amount < 0
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/40 transition-colors group">
                        <td className="py-4 px-5 font-mono text-xs text-slate-600">
                          {p.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-500">
                          {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td className="py-4 px-5 text-xs">
                          <Badge variant={isRefund ? 'destructive' : 'secondary'} className="text-[10px]">
                            {isRefund ? 'Refund' : p.paymentMethod}
                          </Badge>
                        </td>
                        <td className="py-4 px-5 text-xs font-mono text-slate-500">
                          {p.transactionId || 'N/A'}
                        </td>
                        <td className={`py-4 px-5 text-right font-bold ${isRefund ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isRefund ? '-' : ''}₹{Math.abs(p.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-5 text-right">
                          {!isRefund && (
                            <Button
                              onClick={async () => {
                                try {
                                  await api.invoices.downloadReceipt(p.id, `Receipt-${p.id.slice(0, 8)}.pdf`);
                                  toast.success('Payment receipt downloaded successfully');
                                } catch (err) {
                                  toast.error('Failed to download receipt: ' + err.message);
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 rounded-md"
                            >
                              <Download className="mr-1 h-3.5 w-3.5" /> Receipt PDF
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500 bg-white space-y-2">
                <CreditCard className="h-10 w-10 text-slate-300 mx-auto animate-pulse" />
                <h4 className="font-bold text-slate-700">No Payments Recorded</h4>
                <p className="text-xs text-slate-400">No transactions have been processed for this patient.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Invoice Creator Drawer / Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                  <Receipt className="h-5 w-5 text-primary" /> Create Patient Invoice
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Publish a clinical invoice directly to patient profile account.</p>
              </div>
              <button onClick={() => { setIsAddOpen(false); resetCreateForm(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveInvoice} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Patient */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Patient Name
                  </label>
                  <Input value={patient.name} disabled className="bg-slate-50 text-slate-500 font-semibold border-slate-200" />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Invoice Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    required
                    className="border-slate-200"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    required
                    className="border-slate-200"
                  />
                </div>
              </div>

              {/* Dynamic Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Invoice Items <span className="text-rose-500">*</span>
                  </label>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2 border-slate-200"
                  >
                    + Add Item Row
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2.5 items-end bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      
                      {/* Description input */}
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
                        <input
                          type="text"
                          list="patient-descriptions-list"
                          value={item.description}
                          onChange={e => handleUpdateItem(idx, 'description', e.target.value)}
                          placeholder="E.g. Assessment"
                          required
                          className="w-full h-8 px-2 rounded-md border border-slate-200 text-xs bg-white focus:outline-hidden"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="w-20">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          min="1"
                          onChange={e => handleUpdateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                          required
                          className="w-full h-8 px-2 rounded-md border border-slate-200 text-xs focus:outline-hidden"
                        />
                      </div>

                      {/* Rate */}
                      <div className="w-28">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Rate (₹)</label>
                        <input
                          type="number"
                          value={item.rate}
                          min="0"
                          onChange={e => handleUpdateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                          required
                          className="w-full h-8 px-2 rounded-md border border-slate-200 text-xs focus:outline-hidden"
                        />
                      </div>

                      {/* Line Amount */}
                      <div className="w-24 text-right px-2 py-1.5 font-bold text-slate-700 text-sm">
                        ₹{(item.quantity * item.rate).toLocaleString('en-IN')}
                      </div>

                      {/* Delete item button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 rounded-md disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>

                    </div>
                  ))}
                  
                  <datalist id="patient-descriptions-list">
                    {PRESET_DESCRIPTIONS.map(desc => (
                      <option key={desc} value={desc} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Calculations Block */}
              <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row gap-6 justify-between items-start">
                
                {/* Notes */}
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Invoice terms / Notes</label>
                  <textarea
                    placeholder="Enter any additional invoice comments, bank transfer details, or compliance notes..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full text-xs border border-slate-200 rounded-md p-2.5 focus:outline-hidden"
                  />
                </div>

                {/* GST & Totals */}
                <div className="w-full md:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Subtotal:</span>
                    <span className="text-xs font-bold text-slate-800">₹{getSubtotal().toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      GST Rate:
                      <select
                        value={gstRate}
                        onChange={e => setGstRate(parseInt(e.target.value, 10))}
                        className="bg-white border border-slate-200 text-[10px] font-bold rounded-sm h-5 px-1 focus:outline-hidden"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </span>
                    <span className="text-xs font-bold text-slate-800">₹{getTax().toLocaleString('en-IN')}</span>
                  </div>

                  <hr className="border-slate-200" />

                  <div className="flex items-center justify-between text-base">
                    <span className="font-extrabold text-slate-900">Total Amount:</span>
                    <span className="font-black text-primary">₹{getTotal().toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsAddOpen(false); resetCreateForm(); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  {createInvoiceMutation.isPending ? 'Saving...' : 'Save & Publish Invoice'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
