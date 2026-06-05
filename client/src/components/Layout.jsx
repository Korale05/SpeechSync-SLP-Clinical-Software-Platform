import React, { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import useAuthStore, { ROLES } from '../store/authStore'
import { Button } from './ui/button'
import { ShieldCheck, Globe } from 'lucide-react'
import { socket, connectSocket, disconnectSocket } from '../socket'
import { useQueryClient } from '@tanstack/react-query'

const Layout = () => {
  const { isAuthenticated, user } = useAuthStore()
  
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [selectedLang, setSelectedLang] = useState('en')
  const queryClient = useQueryClient();


  
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

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
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

