import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import { ArrowLeft, TrendingUp, DollarSign, Calendar, PieChart as PieIcon, Activity, User } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts'

const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

export default function AdminBillingReports() {
  const navigate = useNavigate()

  // Fetch report data
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['revenue-report'],
    queryFn: () => api.invoices.getRevenueReport()
  })

  if (isLoading) return <LoadingScreen />

  if (error || !report) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Error Loading Reports</h3>
        <p className="text-slate-500 text-sm">{error?.message || 'Report details not found.'}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const { monthlyRevenue = [], paidVsPending = [], topPatients = [], revenueByService = [] } = report

  // Standardize paid vs pending cell mapping colors
  const statusColors = {
    'Collected': '#10B981',
    'Pending': '#F59E0B'
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 bg-slate-50 min-h-full">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800 -ml-2">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Billing
            </Button>
          </div>
          <h1 className="font-heading text-3xl font-bold text-slate-900 mt-2">Revenue Reports</h1>
          <p className="text-slate-500 text-sm">Monthly collections breakdown, service categories, and financial compliance metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Revenue Chart */}
        <Card className="border-slate-200 shadow-xs bg-white lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-600" /> Monthly Revenue & Collections
            </CardTitle>
            <CardDescription>Comparison of total billed invoices vs payments collected.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="billed" name="Billed Amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected Amount" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
                No monthly billing records found.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paid vs Pending Pie Chart */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-slate-600" /> Collections Split
            </CardTitle>
            <CardDescription>Distribution of collected vs outstanding balances.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col justify-between items-center pb-6">
            {paidVsPending.some(p => p.value > 0) ? (
              <>
                <div className="w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paidVsPending}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paidVsPending.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={statusColors[entry.name] || PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend list */}
                <div className="flex gap-6 text-xs mt-2">
                  {paidVsPending.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-xs" style={{ backgroundColor: statusColors[entry.name] || PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="font-semibold text-slate-700">{entry.name}:</span>
                      <span className="text-slate-500 font-bold">₹{entry.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
                No active collections recorded.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Service Category */}
        <Card className="border-slate-200 shadow-xs bg-white lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-600" /> Revenue by Service Category
            </CardTitle>
            <CardDescription>Billed revenue categorized by clinical service description.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {revenueByService.some(s => s.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByService} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                  <YAxis type="category" dataKey="service" stroke="#9CA3AF" fontSize={11} width={100} />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
                No service categories billed.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Paying Patients */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-600" /> Top Paying Patients
            </CardTitle>
            <CardDescription>Highest revenue contributions by patient account.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topPatients.length > 0 ? (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4 text-right">Billed</th>
                      <th className="py-3 px-4 text-right">Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {topPatients.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20">
                        <td className="py-3 px-4 font-semibold text-slate-800">{p.name}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-500">₹{p.totalBilled.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">₹{p.totalPaid.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No patient transaction history found.
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
