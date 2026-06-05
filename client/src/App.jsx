// client/src/App.jsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PatientList from './pages/PatientList'
import NewPatient from './pages/NewPatient'
import EditPatient from './pages/EditPatient'
import PatientProfile from './pages/PatientProfile'
import AssessmentNew from './pages/AssessmentNew'
import SOAPNote from './pages/SOAPNote'
import AiSessionForm from './pages/AiSessionForm'
import TeletherapyRoom from './pages/TeletherapyRoom'
import TeletherapyLanding from './pages/TeletherapyLanding'
import ClinicalWorkspace from './pages/ClinicalWorkspace'
import Goals from './pages/Goals'
import Billing from './pages/Billing'
import Portal from './pages/Portal'
import IEP from './pages/IEP'
import Scheduling from './pages/Scheduling'
import AuditLogs from './pages/AuditLogs'
import UserManagement from './pages/UserManagement'
import DoctorManagement from './pages/DoctorManagement'

import AdminBilling from './pages/AdminBilling'
import InvoiceDetails from './pages/InvoiceDetails'
import AdminBillingReports from './pages/AdminBillingReports'

import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './store/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Secure Layout Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />

              {/* SLP & Admin Access */}
              <Route element={<ProtectedRoute allowedRoles={[ROLES.SLP, ROLES.ADMIN]} />}>
                <Route path="/patients" element={<PatientList />} />
                <Route path="/patients/new" element={<NewPatient />} />
                <Route path="/patients/:id/edit" element={<EditPatient />} />
                <Route path="/patients/:id" element={<PatientProfile />} />
                <Route path="/patients/:id/goals" element={<Goals />} />
                <Route path="/assessments/new" element={<AssessmentNew />} />
                <Route path="/sessions/new" element={<SOAPNote />} />
                <Route path="/ai-session-form" element={<AiSessionForm />} />
                <Route path="/scheduling" element={<Scheduling />} />
              </Route>

              {/* Admin Only */}
              <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
                <Route path="/billing" element={<Billing />} />
                <Route path="/admin/billing" element={<AdminBilling />} />
                <Route path="/admin/reports/billing" element={<AdminBillingReports />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/doctors" element={<DoctorManagement />} />
              </Route>

              {/* Parent Only */}
              <Route element={<ProtectedRoute allowedRoles={[ROLES.PARENT]} />}>
                <Route path="/portal" element={<Portal />} />
              </Route>

              {/* School Coordinator & Admin */}
              <Route element={<ProtectedRoute allowedRoles={[ROLES.SCHOOL_COORDINATOR, ROLES.ADMIN]} />}>
                <Route path="/iep" element={<IEP />} />
              </Route>

              {/* Shared Protected Routes */}
              <Route path="/teletherapy" element={<TeletherapyLanding />} />
              <Route path="/teletherapy/:sessionId" element={<TeletherapyRoom />} />
              <Route path="/clinical-assistant/:sessionId" element={<ClinicalWorkspace />} />
              <Route path="/invoices/:id" element={<InvoiceDetails />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>

      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}

export default App