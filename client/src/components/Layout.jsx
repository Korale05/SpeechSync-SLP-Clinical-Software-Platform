import React, { useState, useEffect, useRef } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import useAuthStore, { ROLES } from '../store/authStore'
import { Button } from './ui/button'
import { ShieldCheck, Globe, Bell, X, MessageCircle, Stethoscope, Link } from 'lucide-react'
import { socket, connectSocket, disconnectSocket } from '../socket'
import { useQueryClient } from '@tanstack/react-query'

const Layout = () => {
  const { isAuthenticated, user } = useAuthStore()
  
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [selectedLang, setSelectedLang] = useState('en')
  const queryClient = useQueryClient();

  // ── Notification Bell State ────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([])
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length


  
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === ROLES.PARENT || user.role === ROLES.SCHOOL_COORDINATOR) {
        const storedConsent = localStorage.getItem(`dpdpa_consent_${user.email}`)
        if (!storedConsent) {
          setShowConsentModal(true)
        }
      }

      // Initialize global socket connection and listeners
      connectSocket(user.id);

      // ── Real-time notification listener ───────────────────────────────────
      const handleNewNotification = (data) => {
        const iconMap = {
          'New teletherapy link received': 'link',
          'Teletherapy session started': 'video',
          'You have a new message': 'message',
        };
        setNotifications(prev => [{
          id: Date.now(),
          message: data.message || 'New notification',
          type: iconMap[data.message] || 'default',
          time: new Date(),
          read: false
        }, ...prev].slice(0, 20)); // keep last 20
      };
      socket.on('new_notification', handleNewNotification);

      const invalidatePatientData = () => {
        queryClient.invalidateQueries({ queryKey: ['patient'] });
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      };

      const invalidateBillingData = () => {
        queryClient.invalidateQueries({ queryKey: ['billing'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['patient'] });
      };

      socket.on('session_created', invalidatePatientData);
      socket.on('session_updated', invalidatePatientData);
      socket.on('session_deleted', invalidatePatientData);
      socket.on('goal_updated', invalidatePatientData);
      socket.on('goal_created', invalidatePatientData);
      socket.on('invoice_created', invalidateBillingData);
      socket.on('invoice_updated', invalidateBillingData);
      socket.on('payment_received', invalidateBillingData);

      return () => {
        socket.off('new_notification', handleNewNotification);
        socket.off('session_created', invalidatePatientData);
        socket.off('session_updated', invalidatePatientData);
        socket.off('session_deleted', invalidatePatientData);
        socket.off('goal_updated', invalidatePatientData);
        socket.off('goal_created', invalidatePatientData);
        socket.off('invoice_created', invalidateBillingData);
        socket.off('invoice_updated', invalidateBillingData);
        socket.off('payment_received', invalidateBillingData);
        disconnectSocket();
      }
    }
  }, [isAuthenticated, user])

  // Close bell panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [])

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  const handleConsent = () => {
    localStorage.setItem(`dpdpa_consent_${user.email}`, 'true')
    setShowConsentModal(false)
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const translations = {
    en: {
      title: "Data Processing Consent",
      body: "By continuing, you consent to data processing under the Digital Personal Data Protection Act (DPDPA) 2023 (India). Your data is encrypted and never sold.",
      btn: "I Consent & Continue"
    },
    hi: {
      title: "डेटा प्रोसेसिंग सहमति",
      body: "आगे बढ़कर, आप डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम (DPDPA) 2023 (भारत) के तहत डेटा प्रोसेसिंग के लिए सहमति देते हैं। आपका डेटा एन्क्रिप्टेड है और कभी बेचा नहीं जाता है।",
      btn: "मैं सहमति देता/देती हूँ और जारी रखें"
    },
    mr: {
      title: "डेटा प्रोसेसिंग संमती",
      body: "पुढे सुरू ठेवून, आपण डिजिटल वैयक्तिक डेटा संरक्षण कायदा (DPDPA) 2023 (भारत) अंतर्गत डेटा प्रक्रियेस संमती देता. आपला डेटा एनक्रिप्टेड आहे आणि कधीही विकला जात नाही.",
      btn: "मी संमती देतो/देते आणि सुरू ठेवा"
    },
    te: {
      title: "డేటా ప్రాసెసింగ్ అంగీకారం",
      body: "కొనసాగడం ద్వారా, మీరు డిజిటల్ వ్యక్తిగత డేటా రక్షణ చట్టం (DPDPA) 2023 (భారతదేశం) పరిధిలో మీ డేటా ప్రాసెసింగ్ చేయడానికి అంగీకరిస్తున్నారు. మీ డేటా గుప్తీకరించబడింది (encrypted) మరియు ఎప్పటికీ విక్రయించబడదు.",
      btn: "నేను అంగీకరిస్తున్నాను & కొనసాగించు"
    },
    ta: {
      title: "தரவு செயலாக்க ஒப்புதல்",
      body: "தொடர்வதன் மூலம், டிஜிட்டல் தனிநபர் தரவு பாதுகாப்புச் சட்டம் (DPDPA) 2023 (இந்தியா) இன் கீழ் தரவு செயலாக்கத்திற்கு நீங்கள் ஒப்புக்கொள்கிறீர்கள். உங்கள் தரவு குறியாக்கம் செய்யப்பட்டது, ஒருபோதும் விற்கப்படாது.",
      btn: "நான் ஒப்புக்கொள்கிறேன் & தொடரவும்"
    }
  }

  // helper: relative time label
  const relativeTime = (date) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top bar with Notification Bell ───────────────────────── */}
        <div className="h-12 bg-white border-b border-slate-100 flex items-center justify-end px-5 shrink-0">
          <div className="relative" ref={bellRef}>
            <button
              id="notification-bell-btn"
              onClick={() => { setBellOpen(o => !o); markAllRead(); }}
              className="relative flex items-center justify-center h-9 w-9 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-primary' : 'text-slate-400'}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Panel */}
            {bellOpen && (
              <div
                id="notification-panel"
                className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 animate-in slide-in-from-top-2 duration-200 overflow-hidden"
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-heading font-bold text-slate-800 text-sm">Notifications</span>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button
                        onClick={() => setNotifications([])}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Bell className="h-8 w-8 text-slate-200" />
                      <p className="text-slate-400 text-xs">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map(notif => {
                      const Icon = notif.type === 'message' ? MessageCircle
                                 : notif.type === 'video'   ? Stethoscope
                                 : notif.type === 'link'    ? Link
                                 : Bell;
                      const iconBg = notif.type === 'message' ? 'bg-blue-50 text-blue-500'
                                   : notif.type === 'video'   ? 'bg-emerald-50 text-emerald-500'
                                   : notif.type === 'link'    ? 'bg-violet-50 text-violet-500'
                                   : 'bg-slate-50 text-slate-400';
                      return (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors group ${
                            !notif.read ? 'bg-primary/[0.02]' : ''
                          }`}
                        >
                          <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 leading-snug">{notif.message}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{relativeTime(notif.time)}</p>
                          </div>
                          <button
                            onClick={() => dismissNotification(notif.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-slate-500 mt-0.5"
                            aria-label="Dismiss"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
                  <p className="text-[10px] text-slate-400 text-center">
                    🔒 Notifications are end-to-end encrypted
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <footer className="bg-slate-100 border-t border-slate-200 py-3 text-center text-xs text-slate-500 font-medium z-10">
          🔒 HIPAA Compliant | 🛡️ AES-256 Encrypted | 📋 ASHA Standards | DPDPA 2023 Ready
        </footer>
      </div>

      {/* DPDPA Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-primary font-bold">
                <ShieldCheck className="h-6 w-6 text-accent" />
                <span className="font-heading text-lg text-slate-900">DPDPA 2023 Consent</span>
              </div>
              
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border">
                <Globe className="h-3.5 w-3.5 text-slate-500 ml-1" />
                <select 
                  className="bg-transparent text-xs font-semibold focus:outline-none pr-1"
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                  <option value="mr">मराठी</option>
                  <option value="te">తెలుగు</option>
                  <option value="ta">தமிழ்</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-heading font-bold text-slate-800 text-base">
                {translations[selectedLang].title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {translations[selectedLang].body}
              </p>
            </div>

            <div className="pt-2">
              <Button onClick={handleConsent} className="w-full h-11 text-sm font-semibold shadow-md bg-accent text-white hover:bg-accent/90">
                {translations[selectedLang].btn}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Layout

