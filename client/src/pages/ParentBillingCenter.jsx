import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, DollarSign, FileText, CheckCircle } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../services/api'
import LoadingScreen from '../components/LoadingScreen'

const ParentBillingCenter = () => {
  const { user } = useAuthStore()

  // Fetch Parent Dashboard Data (which includes billing sum) or just fetch patients directly
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: () => api.get('/parent/dashboard').then(res => res.data)
  })

  // To get detailed invoices, we can query each patient's billing route or use the dashboard data if we included it
  // Wait, in parentRoutes.js we didn't include invoices array in the summary. We included outstandingBillsTotal.
  // For the sake of this center, let's fetch /patients/:id/billing for the first patient.
  const childId = dashboardData?.patients?.[0]?.id;

  const { data: billingData, isLoading: isBillingLoading } = useQuery({
    queryKey: ['patient-billing', childId],
    queryFn: () => api.get(`/patients/${childId}/billing`).then(res => res.data),
    enabled: !!childId
  })

  if (isLoading || (childId && isBillingLoading)) return <LoadingScreen />

  if (!dashboardData || dashboardData.patients.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 italic max-w-xl mx-auto mt-20 bg-white border border-slate-200 rounded-2xl p-12">
        <h3 className="font-bold text-lg text-slate-800">No Linked Child Found</h3>
        <p className="text-slate-400 text-sm mt-1">Please contact your administrator.</p>
      </div>
    )
  }

  const { invoices = [], payments = [], outstandingBalance = 0 } = billingData || {};
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-[calc(100vh-theme(spacing.20))] bg-slate-50 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Billing Center</h1>
          <p className="text-slate-600 mt-2 text-lg">Manage invoices and payments for {dashboardData.patients[0].name}.</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-2xl shadow-sm border-slate-200 bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl">
                <DollarSign className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Due</p>
                <p className="text-2xl font-bold text-slate-900">${outstandingBalance.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl shadow-sm border-slate-200 bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Paid</p>
                <p className="text-2xl font-bold text-slate-900">${totalPaid.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-slate-200 bg-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Invoices</p>
                <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices List */}
        <Card className="rounded-2xl shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Your billing history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.length > 0 ? invoices.map((inv) => (
                <div key={inv.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Invoice {inv.invoiceNumber}</p>
                      <p className="text-sm text-slate-500">Date: {new Date(inv.invoiceDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4 sm:mt-0">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">${inv.totalAmount.toFixed(2)}</p>
                      <p className="text-xs text-slate-400">Balance: ${inv.balanceAmount.toFixed(2)}</p>
                    </div>
                    <Badge variant="outline" className={
                      inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                      inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700 border-red-200' : 
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }>
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              )) : (
                <p className="text-center text-slate-500 py-4">No invoices found.</p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export default ParentBillingCenter
