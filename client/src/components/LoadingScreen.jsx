import React from 'react'
import { Activity } from 'lucide-react'

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="relative flex flex-col items-center max-w-sm text-center px-6">
        {/* Animated outer spinning accent ring */}
        <div className="absolute h-32 w-32 rounded-full border-4 border-t-accent border-r-transparent border-b-transparent border-l-transparent animate-spin duration-1000"></div>
        
        {/* Inner pulse ring and logo icon */}
        <div className="h-28 w-28 rounded-full border-4 border-slate-800 flex items-center justify-center shadow-lg bg-slate-950">
          <Activity className="h-10 w-10 text-accent animate-pulse" />
        </div>
        
        <h2 className="mt-8 font-heading text-2xl font-bold tracking-tight text-white">
          SpeechSync Clinical Platform
        </h2>
        
        <p className="mt-2 text-slate-400 text-sm leading-relaxed">
          Establishing secure connection and synchronizing clinical records from PostgreSQL...
        </p>
        
        {/* Secure compliance badge */}
        <div className="mt-6 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>HIPAA & DPDPA Compliant Channel</span>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
