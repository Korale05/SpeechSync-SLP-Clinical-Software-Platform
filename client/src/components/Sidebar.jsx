// client/src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import useAuthStore, { ROLES } from '../store/authStore'
import { Home, Users, ClipboardList, FileText, Video, TrendingUp, CreditCard, Settings, LogOut, GraduationCap, KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'

const Sidebar = () => {
  const { user, logout } = useAuthStore()

  // Theme state
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark')
    }
  }, [])

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark')
      localStorage.theme = 'dark'
      setTheme('dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.theme = 'light'
      setTheme('light')
    }
  }

  // Change Password modal state
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  if (!user) return null

  let links = []

  switch (user.role) {
    case ROLES.SLP:
      links = [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/patients', icon: Users, label: 'Patients' },
        { to: '/scheduling', icon: ClipboardList, label: 'Scheduling' },
        { to: '/assessments/new', icon: FileText, label: 'Assessments' },
        { to: '/ai-session-form', icon: FileText, label: 'AI Assistant' },
        { to: '/teletherapy', icon: Video, label: 'Teletherapy' },
      ]
      break
    case ROLES.ADMIN:
      links = [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/patients', icon: Users, label: 'Patients' },
        { to: '/admin/doctors', icon: Users, label: 'Doctors' },
        { to: '/admin/users', icon: Settings, label: 'User Management' },
        { to: '/scheduling', icon: ClipboardList, label: 'Scheduling' },
        { to: '/admin/billing', icon: CreditCard, label: 'Billing' },
        { to: '/iep', icon: GraduationCap, label: 'Reports' },
        { to: '/audit-logs', icon: Settings, label: 'Audit Logs' },
      ]
      break
    case ROLES.PARENT:
      links = [
        { to: '/parent/dashboard', icon: Home, label: 'Parent Portal' },
        { to: '/parent/billing', icon: CreditCard, label: 'Billing Center' },
      ]
      break
    case ROLES.SCHOOL_COORDINATOR:
      links = [
        { to: '/school/dashboard', icon: Home, label: 'School Dashboard' },
        { to: '/iep', icon: GraduationCap, label: 'IEP Tracking' },
      ]
      break
    default:
      break
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    if (pwdForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.')
      return
    }

    setPwdLoading(true)
    try {
      await api.auth.changePassword(pwdForm.currentPassword, pwdForm.newPassword)
      toast.success('Password changed successfully!')
      setShowChangePassword(false)
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.message || 'Failed to change password.')
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <>
      <div className="flex h-screen w-64 flex-col bg-sidebar text-white shadow-xl transition-all duration-300">
        <div className="flex h-20 items-center justify-center border-b border-white/10 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 2v20"/><path d="M17 5v14"/><path d="M22 10v4"/><path d="M7 5v14"/><path d="M2 10v4"/></svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-heading">SpeechSync</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="mb-6 px-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Menu</p>
          </div>
          <nav className="flex flex-col gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary/20 text-primary shadow-sm" 
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/30 text-primary font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-white">{user.name}</span>
              <span className="truncate text-xs text-slate-400">{user.role}</span>
            </div>
          </div>
          <button 
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            {theme === 'light' ? (
              <><Moon className="h-5 w-5" /> Dark Mode</>
            ) : (
              <><Sun className="h-5 w-5" /> Light Mode</>
            )}
          </button>
          <button 
            onClick={() => setShowChangePassword(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            id="change-password-btn"
          >
            <KeyRound className="h-5 w-5" />
            Change Password
          </button>
          <button 
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
              </div>
              <button onClick={() => { setShowChangePassword(false); setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-6 space-y-5">
              {/* Current Password */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={pwdForm.currentPassword}
                    onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    required
                    className="w-full h-10 px-3 pr-10 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                    id="current-password-input"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={pwdForm.newPassword}
                    onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    className="w-full h-10 px-3 pr-10 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                    id="new-password-input"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={pwdForm.confirmPassword}
                  onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  required
                  minLength={6}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  id="confirm-password-input"
                />
                {pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Passwords do not match
                  </p>
                )}
              </div>

              {/* Security hint */}
              <div className="bg-slate-50 text-slate-500 p-3 rounded-md text-xs flex items-start gap-2 border border-slate-100">
                <KeyRound className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                <span>Choose a strong password with a mix of letters, numbers, and symbols. You will need to log in again with the new password next session.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setShowChangePassword(false); setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={pwdLoading || pwdForm.newPassword !== pwdForm.confirmPassword}
                  className="px-4 py-2 text-sm font-medium text-white rounded-md bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  id="submit-change-password-btn"
                >
                  {pwdLoading ? 'Updating...' : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
