import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { toast } from 'react-hot-toast'
import useAuthStore, { ROLES } from '../store/authStore'
import LoadingScreen from '../components/LoadingScreen'
import {
  FileText, ArrowLeft, Download, Plus, X,
  Calendar, Check, User, CreditCard, Receipt, ShieldAlert, AlertCircle
} from 'lucide-react'

const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Cheque'
]

export default function InvoiceDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)

  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [transactionId, setTransactionId] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentNotes, setPaymentNotes] = useState('')

  // Refund states
  const [isRefundOpen, setIsRefundOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundNotes, setRefundNotes] = useState('')

  // Fetch invoice details
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.invoices.getById(id)
  })

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: (paymentData) => api.invoices.recordPayment(paymentData),
    onSuccess: () => {
      toast.success('Payment recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setIsPaymentOpen(false)
      resetPaymentForm()
    },
    onError: (err) => {
      toast.error('Failed to record payment: ' + err.message)
    }
  })

  // Cancel invoice mutation
  const cancelInvoiceMutation = useMutation({
    mutationFn: () => api.invoices.update(id, { status: 'CANCELLED' }),
    onSuccess: () => {
      toast.success('Invoice cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (err) => {
      toast.error('Failed to cancel invoice: ' + err.message)
    }
  })

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: () => api.invoices.delete(id),
    onSuccess: () => {
      toast.success('Invoice deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      navigate('/admin/billing')
    },
    onError: (err) => {
      toast.error('Failed to delete invoice: ' + err.message)
    }
  })

  // Refund payment mutation
  const refundPaymentMutation = useMutation({
    mutationFn: ({ paymentId, data }) => api.invoices.refundPayment(paymentId, data),
    onSuccess: () => {
      toast.success('Refund processed successfully')
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setIsRefundOpen(false)
      setRefundAmount('')
      setRefundNotes('')
    },
    onError: (err) => {
      toast.error('Failed to process refund: ' + err.message)
    }
  })

  const resetPaymentForm = () => {
    setPaymentAmount('')
    setPaymentMethod('UPI')
    setTransactionId('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentNotes('')
  }

  const handleOpenPaymentModal = () => {
    if (invoice) {
      setPaymentAmount(invoice.balanceAmount)
      setIsPaymentOpen(true)
    }
  }

  const handleSavePayment = (e) => {
    e.preventDefault()
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid positive payment amount')
      return
    }

    recordPaymentMutation.mutate({
      invoiceId: id,
      amount: parseFloat(paymentAmount),
      paymentMethod,
      transactionId,
      paymentDate,
      notes: paymentNotes
    })
  }

  // PDF download trigger using secure token-bearing fetch
  const handleDownloadInvoicePdf = async () => {
    try {
      await api.downloadSecureFile(`/invoices/${id}/pdf`, `Invoice-${invoice?.invoiceNumber || id}.pdf`)
      toast.success('Invoice PDF downloaded successfully')
    } catch (err) {
      toast.error('Failed to download invoice PDF: ' + err.message)
    }
  }

  const handleDownloadReceiptPdf = async (paymentId) => {
    try {
      await api.downloadSecureFile(`/payments/${paymentId}/pdf`, `Receipt-${paymentId}.pdf`)
      toast.success('Receipt PDF downloaded successfully')
    } catch (err) {
      toast.error('Failed to download receipt PDF: ' + err.message)
    }
  }

  if (isLoading) return <LoadingScreen />

  if (error || !invoice) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800 text-lg">Error Loading Invoice</h3>
        <p className="text-slate-500 text-sm">{error?.message || 'Invoice details not found.'}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.balanceAmount > 0 && invoice.status !== 'PAID';
  const isAdmin = user?.role === ROLES.ADMIN;

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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 bg-slate-50 min-h-full">
      
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between">
        <Button onClick={() => navigate(-1)} variant="ghost" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button onClick={handleDownloadInvoicePdf} variant="outline" className="border-slate-200 bg-white shadow-xs">
            <Download className="mr-1.5 h-4 w-4 text-slate-600" /> Download PDF
          </Button>
          {isAdmin && invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
            <Button 
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this invoice?')) {
                  cancelInvoiceMutation.mutate()
                }
              }} 
              variant="outline" 
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              disabled={cancelInvoiceMutation.isPending}
            >
              Cancel Invoice
            </Button>
          )}
          {isAdmin && (
            <Button 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this invoice permanently? This action cannot be undone.')) {
                  deleteInvoiceMutation.mutate()
                }
              }} 
              variant="destructive"
              disabled={deleteInvoiceMutation.isPending}
            >
              Delete Invoice
            </Button>
          )}
          {isAdmin && invoice.balanceAmount > 0 && invoice.status !== 'CANCELLED' && (
            <Button onClick={handleOpenPaymentModal} className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs font-semibold">
              <Plus className="mr-1.5 h-4 w-4" /> Add Payment
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Layout */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        {/* Banner header */}
        <div className="bg-slate-900 text-white p-8 flex flex-col md:flex-row justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white uppercase">SpeechSync Clinic</h2>
            <p className="text-xs text-slate-300 mt-1">124 Clinical Complex, AGTech Road, Solapur</p>
            <p className="text-xs text-slate-300">GSTIN: 27AABCS1423D1Z4</p>
          </div>
          <div className="text-left md:text-right">
            <h1 className="text-3xl font-extrabold text-white">INVOICE</h1>
            <p className="text-sm font-semibold text-slate-200 mt-1">{invoice.invoiceNumber}</p>
            <div className="mt-2">{getStatusBadge(invoice.status)}</div>
          </div>
        </div>

        {/* Invoice details body */}
        <div className="p-8 space-y-8">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billing To:</p>
              <h4 className="font-bold text-slate-900 text-base">{invoice.patient?.name}</h4>
              <div className="text-slate-500 space-y-1 mt-1 text-xs">
                <p>Guardian: <strong>{invoice.patient?.guardianName || 'N/A'}</strong></p>
                <p>Phone: <strong>{invoice.patient?.guardianPhone || 'N/A'}</strong></p>
                <p>Insurance Carrier: <strong>{invoice.patient?.insuranceCarrier || 'Self Pay'}</strong></p>
                <p>Policy ID: <strong>{invoice.patient?.insurancePolicy || 'N/A'}</strong></p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase">Invoice Date:</span>
                <span className="font-medium text-slate-800">
                  {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase">Due Date:</span>
                <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                  {new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase">Created By:</span>
                <span className="font-medium text-slate-800 text-xs">{invoice.createdBy}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Service Line Items</p>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Rate</th>
                    <th className="py-3 px-4 text-right">Line Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoice.items && invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/20">
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.description}</td>
                      <td className="py-3 px-4 text-right">{item.quantity}</td>
                      <td className="py-3 px-4 text-right">₹{item.rate.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">₹{item.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals block */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 max-w-sm italic">
              {invoice.notes && <p><strong>Notes:</strong> {invoice.notes}</p>}
            </div>

            <div className="w-full md:w-80 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-800">₹{invoice.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>GST (18%):</span>
                <span className="font-medium text-slate-800">₹{invoice.taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                <span>Total Amount:</span>
                <span>₹{invoice.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold text-xs">
                <span>Amount Paid:</span>
                <span>₹{invoice.paidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-extrabold text-slate-900">
                <span>Balance Due:</span>
                <span className={invoice.balanceAmount > 0 ? 'text-amber-600' : 'text-slate-800'}>
                  ₹{invoice.balanceAmount.toLocaleString('en-IN')}
                </span>
              </div>
              {isAdmin && invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <Button
                    onClick={() => {
                      const amountStr = window.prompt('Enter discount amount in ₹:');
                      if (amountStr !== null) {
                        const amt = parseFloat(amountStr);
                        if (isNaN(amt) || amt < 0) {
                          toast.error('Invalid discount amount');
                        } else {
                          api.invoices.update(id, { discountAmount: amt })
                            .then(() => {
                              toast.success('Discount applied successfully');
                              queryClient.invalidateQueries({ queryKey: ['invoice', id] });
                            })
                            .catch(err => {
                              toast.error('Failed to apply discount: ' + err.message);
                            });
                        }
                      }
                    }}
                    variant="link"
                    size="sm"
                    className="text-xs text-primary font-semibold p-0 h-auto"
                  >
                    Apply Discount
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Payments list section */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Log</p>
              <div className="space-y-2">
                {invoice.payments.map((p) => {
                  const isRefund = p.amount < 0;
                  return (
                    <div key={p.id} className={`flex justify-between items-center border rounded-lg p-3.5 text-xs ${
                      isRefund ? 'bg-rose-50/30 border-rose-100 text-rose-700' : 'bg-emerald-50/20 border-emerald-100 text-slate-700'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isRefund ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {isRefund ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {isRefund ? `Refunded ₹${Math.abs(p.amount).toLocaleString('en-IN')}` : `Paid ₹${p.amount.toLocaleString('en-IN')}`}
                          </p>
                          <p className="text-slate-400 mt-0.5">
                            {new Date(p.paymentDate).toLocaleDateString('en-IN')} via {p.paymentMethod}
                            {p.transactionId && ` (Txn Ref: ${p.transactionId})`}
                          </p>
                          {p.notes && <p className="text-slate-500 italic mt-0.5">Note: {p.notes}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!isRefund && (
                          <Button
                            onClick={() => handleDownloadReceiptPdf(p.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 text-emerald-700 hover:bg-emerald-50/50 flex items-center font-bold"
                          >
                            <Download className="mr-1 h-3.5 w-3.5" /> Receipt PDF
                          </Button>
                        )}
                        {isAdmin && !isRefund && (
                          <Button
                            onClick={() => {
                              setSelectedPaymentId(p.id)
                              setRefundAmount(p.amount)
                              setIsRefundOpen(true)
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-8 text-rose-700 hover:bg-rose-50 flex items-center font-bold"
                          >
                            Refund
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </Card>

      {/* Record Payment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1">
                  <Receipt className="h-4 w-4 text-emerald-600" /> Record Patient Payment
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Reference: <strong className="text-slate-700">{invoice.invoiceNumber}</strong></p>
              </div>
              <button onClick={() => { setIsPaymentOpen(false); resetPaymentForm(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              {/* Payment Date */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Amount Paid (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount paid"
                    required
                    max={invoice.balanceAmount}
                    className="pl-7 border-slate-200"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  Max outstanding balance: ₹{invoice.balanceAmount.toLocaleString('en-IN')}
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Payment Method
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Transaction / Reference ID
                </label>
                <Input
                  type="text"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="E.g. UPI Ref / Cheque No / Txn ID"
                  className="border-slate-200"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Payment Notes
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="Enter any relevant transaction descriptions..."
                  rows={2}
                  className="w-full text-xs border border-slate-200 rounded-md p-2.5 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsPaymentOpen(false); resetPaymentForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={recordPaymentMutation.isPending} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                  {recordPaymentMutation.isPending ? 'Saving...' : 'Confirm Receipt'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {isRefundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4 text-rose-600" /> Process Payment Refund
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Invoice Reference: <strong className="text-slate-700">{invoice.invoiceNumber}</strong></p>
              </div>
              <button onClick={() => { setIsRefundOpen(false); setRefundAmount(''); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!refundAmount || parseFloat(refundAmount) <= 0) {
                toast.error('Please enter a valid refund amount');
                return;
              }
              refundPaymentMutation.mutate({
                paymentId: selectedPaymentId,
                data: {
                  amount: parseFloat(refundAmount),
                  notes: refundNotes
                }
              });
            }} className="p-5 space-y-4">
              {/* Amount to Refund */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Amount to Refund (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                  <Input
                    type="number"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    placeholder="Enter amount to refund"
                    required
                    className="pl-7 border-slate-200"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Reason / Notes
                </label>
                <textarea
                  value={refundNotes}
                  onChange={e => setRefundNotes(e.target.value)}
                  placeholder="Enter the reason for this refund..."
                  rows={2}
                  className="w-full text-xs border border-slate-200 rounded-md p-2.5 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsRefundOpen(false); setRefundAmount(''); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={refundPaymentMutation.isPending} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold">
                  {refundPaymentMutation.isPending ? 'Processing...' : 'Confirm Refund'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
