import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { toast } from 'react-hot-toast'
import {
  Plus, Search, Filter, FileText, IndianRupee,
  CheckCircle, AlertCircle, Clock, Eye, Trash2, Calendar, HelpCircle, X, Receipt
} from 'lucide-react'
import LoadingScreen from '../components/LoadingScreen'

const PRESET_DESCRIPTIONS = [
  'Speech Therapy Session',
  'Assessment',
  'Teletherapy Session',
  'Home Program',
  'Consultation'
]

export default function AdminBilling() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Invoice creation form states
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [gstRate, setGstRate] = useState(18)
  const [items, setItems] = useState([{ description: 'Speech Therapy Session', quantity: 1, rate: 1500 }])

  // Fetch all invoices
  const { data: invoices = [], isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.invoices.getAll()
  })

  // Fetch patients for invoice creation dropdown
  const { data: patients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.patients.getAll()
  })

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (invoiceData) => api.invoices.create(invoiceData),
    onSuccess: () => {
      toast.success('Invoice created successfully!')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err) => {
      toast.error('Failed to create invoice: ' + err.message)
    }
  })

  const resetCreateForm = () => {
    setSelectedPatientId('')
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

  // Calculation helpers for creation form
  const getSubtotal = () => items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
  const getTax = () => getSubtotal() * (gstRate / 100)
  const getTotal = () => getSubtotal() + getTax()

  const handleSaveInvoice = (e) => {
    e.preventDefault()
    if (!selectedPatientId) {
      toast.error('Please select a patient')
      return
    }
    if (items.some(i => !i.description || i.quantity <= 0 || i.rate <= 0)) {
      toast.error('Please fill in all item fields with valid positive values')
      return
    }

    createInvoiceMutation.mutate({
      patientId: selectedPatientId,
      invoiceDate,
      dueDate,
      notes,
      gstRate,
      items
    })
  }

  if (isInvoicesLoading || isPatientsLoading) return <LoadingScreen />

  // Compute overall KPI card values
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
  const totalPending = invoices.reduce((sum, inv) => inv.status === 'PENDING' ? sum + inv.balanceAmount : sum, 0)
  const totalOverdue = invoices.reduce((sum, inv) => inv.status === 'OVERDUE' ? sum + inv.balanceAmount : sum, 0)

  // Status badge utility
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold border-none">🟢 PAID</Badge>
      case 'PARTIALLY_PAID':
        return <Badge className="bg-blue-400 hover:bg-blue-500 text-white font-semibold border-none">🔵 PARTIAL</Badge>
      case 'PENDING':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold border-none">🟡 PENDING</Badge>
      case 'OVERDUE':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-semibold border-none">🔴 OVERDUE</Badge>
      case 'DRAFT':
        return <Badge className="bg-slate-400 hover:bg-slate-500 text-white font-semibold border-none">⚪ DRAFT</Badge>
      case 'CANCELLED':
        return <Badge className="bg-slate-300 hover:bg-slate-400 text-white font-semibold border-none">CANCELLED</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Filter and search logic
  const filteredInvoices = invoices.filter(inv => {
    const patientName = inv.patient?.name?.toLowerCase() || ''
    const invNum = inv.invoiceNumber?.toLowerCase() || ''
    const matchesSearch = patientName.includes(searchTerm.toLowerCase()) || invNum.includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 bg-slate-50 min-h-full">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Billing & Invoicing</h1>
          <p className="text-slate-500 text-sm">Create clinical invoices, track payments, and review outstanding revenue balances.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/reports/billing')} variant="outline" className="border-slate-200 shadow-xs">
            <FileText className="mr-1.5 h-4 w-4 text-slate-600" /> Revenue Reports
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-xs">
            <Plus className="mr-1.5 h-4 w-4" /> Create Invoice
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Revenue</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">₹{totalBilled.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Total invoiced billing</p>
            </div>
            <div className="p-3 bg-slate-100/50 border border-slate-100 rounded-xl text-slate-700">
              <IndianRupee className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Collected Revenue</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">₹{totalCollected.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-emerald-600/80 mt-1">Total payments received</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Revenue</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">₹{totalPending.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-amber-600/80 mt-1">Due within term limit</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Overdue Revenue</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">₹{totalOverdue.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-rose-600/80 mt-1">Passed due term date</p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main invoices list Card */}
      <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
        {/* Filters */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3 justify-between items-center bg-slate-50/50">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search patient or invoice no..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-white border-slate-200 focus:border-slate-400 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          {filteredInvoices.length > 0 ? (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Invoice Number</th>
                  <th className="py-3.5 px-6">Patient</th>
                  <th className="py-3.5 px-6">Invoice Date</th>
                  <th className="py-3.5 px-6">Due Date</th>
                  <th className="py-3.5 px-6 text-right">Total Amount</th>
                  <th className="py-3.5 px-6 text-right">Paid</th>
                  <th className="py-3.5 px-6 text-right">Balance</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredInvoices.map((inv) => {
                  const balance = inv.balanceAmount;
                  const isOverdue = new Date(inv.dueDate) < new Date() && balance > 0 && inv.status !== 'PAID';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-800">
                        {inv.patient?.name || 'Unknown'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-slate-500 text-xs">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-slate-500 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                            {new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        ₹{inv.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-emerald-600 whitespace-nowrap">
                        ₹{inv.paidAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₹{inv.balanceAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {getStatusBadge(inv.status)}
                      </td>
                      <td className="py-4 px-6 text-right">
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
            <div className="py-16 text-center text-slate-500 space-y-3">
              <FileText className="h-12 w-12 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-700 text-base">No Invoices Found</h4>
                <p className="text-xs text-slate-400 mt-0.5">Try altering your search filters or create a new invoice.</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Invoice Creator Slideover / Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                  <Receipt className="h-5 w-5 text-primary" /> Create New Clinic Invoice
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Set up clinical services billing, quantities, taxes, and terms.</p>
              </div>
              <button onClick={() => { setIsCreateOpen(false); resetCreateForm(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveInvoice} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Patient */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Patient <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={e => setSelectedPatientId(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">-- Select Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
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
                    <div key={idx} className="flex gap-2.5 items-end bg-slate-50 p-2.5 rounded-lg border border-slate-200 animate-in slide-in-from-top-1">
                      
                      {/* Description select / input */}
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
                        <input
                          type="text"
                          list="descriptions-list"
                          value={item.description}
                          onChange={e => handleUpdateItem(idx, 'description', e.target.value)}
                          placeholder="E.g. Assessment"
                          required
                          className="w-full h-8 px-2 rounded-md border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-400"
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
                        className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="h-4 w-4" />
                      </button>

                    </div>
                  ))}
                  
                  {/* Preset list for datalist */}
                  <datalist id="descriptions-list">
                    {PRESET_DESCRIPTIONS.map(desc => (
                      <option key={desc} value={desc} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Calculations Block */}
              <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row gap-6 justify-between items-start">
                
                {/* Notes input */}
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Invoice terms / Notes</label>
                  <textarea
                    placeholder="Enter any additional invoice comments, bank transfer details, or compliance notes..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full text-xs border border-slate-200 rounded-md p-2.5 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* GST rates & computed totals */}
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
                  onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs font-semibold"
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
