import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldCheck, History, User, Calendar, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import LoadingScreen from '../components/LoadingScreen'

const AuditLogs = () => {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter],
    queryFn: () => api.get(`/audit-logs?page=${page}&limit=15${actionFilter ? `&action=${actionFilter}` : ''}`).then(res => res.data)
  })

  if (isLoading) return <LoadingScreen />

  const logs = data?.logs || []
  const totalPages = data?.totalPages || 1

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Security Audit Logs</h1>
          <p className="text-slate-500 mt-1">HIPAA-compliant, immutable system action logs and PHI access trails.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold">Active HIPAA Shield Enabled</span>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Action</span>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-64"
        >
          <option value="">All Actions</option>
          <option value="EXPORT">EXPORT (PDF Reports)</option>
          <option value="SIGN_SOAP_NOTE">SIGN_SOAP_NOTE</option>
          <option value="CREATE_PATIENT">CREATE_PATIENT</option>
          <option value="CREATE_APPOINTMENT">CREATE_APPOINTMENT</option>
          <option value="UPDATE_GOAL_PROGRESS">UPDATE_GOAL_PROGRESS</option>
          <option value="ASSIGN_EXERCISE">ASSIGN_EXERCISE</option>
        </select>
      </div>

      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Event Activity Log
          </CardTitle>
          <CardDescription>Records are stored securely and signed to prevent tampering.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase bg-slate-50/50">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Resource</th>
                  <th className="py-3.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {log.user?.email || 'System'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                        {log.user?.role || 'SYSTEM'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={log.action === 'EXPORT' ? 'destructive' : 'default'} className="text-[10px] font-bold">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-semibold text-xs">
                      {log.resource}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-2 py-1 rounded max-w-md truncate">
                        <Info className="h-3 w-3 shrink-0 text-slate-400" />
                        {JSON.stringify(log.details)}
                      </span>
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      No logs found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AuditLogs
