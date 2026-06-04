import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore, { ROLES } from '../store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  
  const [role, setRole] = useState(ROLES.SLP)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleDemoFill = () => {
    if (role === ROLES.SLP) { setEmail('slp@speechsync.in'); setPassword('slp123') }
    else if (role === ROLES.ADMIN) { setEmail('admin@speechsync.in'); setPassword('admin123') }
    else if (role === ROLES.PARENT) { setEmail('parent@speechsync.in'); setPassword('parent123') }
    else if (role === ROLES.SCHOOL_COORDINATOR) { setEmail('school@speechsync.in'); setPassword('school123') }
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await login(email, password)
    if (success) {
      if (role === ROLES.PARENT) navigate('/portal')
      else if (role === ROLES.SCHOOL_COORDINATOR) navigate('/iep')
      else navigate('/dashboard')
    } else {
      setError('Invalid credentials. Try the Demo Login button.')
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Panel */}
      <div className="hidden w-1/2 flex-col justify-center bg-primary p-12 text-white lg:flex relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5v14"/><path d="M22 10v4"/><path d="M7 5v14"/><path d="M2 10v4"/></svg>
          </div>
          <h1 className="mb-6 font-heading text-5xl font-bold leading-tight">
            Clinical clarity for every voice.
          </h1>
          <p className="text-lg text-primary-foreground/80">
            A purpose-built, production-grade platform for Speech-Language Pathology clinics. Streamline your workflow and focus on what matters most.
          </p>
        </div>

        {/* Animated Waveform Background */}
        <div className="absolute -bottom-24 -left-24 opacity-20">
          <motion.svg 
            width="800" height="400" viewBox="0 0 800 400" 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <path d="M0,200 C150,300 250,50 400,200 C550,350 650,100 800,200" fill="none" stroke="white" strokeWidth="4" />
            <path d="M0,250 C150,350 250,100 400,250 C550,400 650,150 800,250" fill="none" stroke="white" strokeWidth="2" />
            <path d="M0,150 C150,250 250,0 400,150 C550,300 650,50 800,150" fill="none" stroke="white" strokeWidth="1" />
          </motion.svg>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-16 lg:w-1/2 xl:px-32">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="font-heading text-3xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-600">Choose your role to continue to SpeechSync.</p>
          </div>

          <Tabs defaultValue={ROLES.SLP} onValueChange={setRole} className="mb-8">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100">
              <TabsTrigger value={ROLES.SLP}>SLP</TabsTrigger>
              <TabsTrigger value={ROLES.ADMIN}>Admin</TabsTrigger>
              <TabsTrigger value={ROLES.PARENT}>Parent</TabsTrigger>
              <TabsTrigger value={ROLES.SCHOOL_COORDINATOR}>School</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input 
                type="email" 
                placeholder="name@speechsync.in" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold shadow-md">
              Sign In
            </Button>
            
            <div className="mt-4">
              <Button type="button" variant="outline" className="w-full h-11 text-base border-primary/20 text-primary hover:bg-primary/5" onClick={handleDemoFill}>
                Use Demo Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
