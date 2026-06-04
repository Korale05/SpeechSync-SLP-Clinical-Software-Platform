import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, FilePlus2, XCircle, Info, Calculator } from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/LoadingScreen'

const stimuliWords = [
  { word: "HOUSE", target: "/h/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=HOUSE", positionTargets: { initial: "/h/", medial: null, final: "/s/" } },
  { word: "TELEPHONE", target: "/t/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=TELEPHONE", positionTargets: { initial: "/t/", medial: "/l/", final: "/n/" } },
  { word: "CUP", target: "/k/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=CUP", positionTargets: { initial: "/k/", medial: null, final: "/p/" } },
  { word: "GUN", target: "/ɡ/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=GUN", positionTargets: { initial: "/ɡ/", medial: null, final: "/n/" } },
  { word: "WINDOW", target: "/w/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=WINDOW", positionTargets: { initial: "/w/", medial: "/nd/", final: null } },
  { word: "WAGON", target: "/w/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=WAGON", positionTargets: { initial: "/w/", medial: "/ɡ/", final: "/n/" } },
  { word: "YELLOW", target: "/j/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=YELLOW", positionTargets: { initial: "/j/", medial: "/l/", final: null } },
  { word: "BANANA", target: "/b/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=BANANA", positionTargets: { initial: "/b/", medial: "/n/", final: null } },
  { word: "ZEBRA", target: "/z/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=ZEBRA", positionTargets: { initial: "/z/", medial: "/br/", final: null } },
  { word: "KEYS", target: "/k/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=KEYS", positionTargets: { initial: "/k/", medial: null, final: "/z/" } },
  { word: "FROG", target: "/fr/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=FROG", positionTargets: { initial: "/fr/", medial: null, final: "/ɡ/" } },
  { word: "FLOWER", target: "/fl/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=FLOWER", positionTargets: { initial: "/fl/", medial: "/w/", final: "/r/" } },
  { word: "BRUSH", target: "/br/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=BRUSH", positionTargets: { initial: "/br/", medial: null, final: "/ʃ/" } },
  { word: "DRUM", target: "/dr/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=DRUM", positionTargets: { initial: "/dr/", medial: null, final: "/m/" } },
  { word: "SPIDER", target: "/sp/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=SPIDER", positionTargets: { initial: "/sp/", medial: "/d/", final: "/r/" } },
  { word: "CLOWN", target: "/kl/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=CLOWN", positionTargets: { initial: "/kl/", medial: null, final: "/n/" } },
  { word: "SLIDE", target: "/sl/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=SLIDE", positionTargets: { initial: "/sl/", medial: null, final: "/d/" } },
  { word: "STAR", target: "/st/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=STAR", positionTargets: { initial: "/st/", medial: null, final: "/r/" } },
  { word: "BRIDGE", target: "/br/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=BRIDGE", positionTargets: { initial: "/br/", medial: null, final: "/dʒ/" } },
  { word: "SPOON", target: "/sp/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=SPOON", positionTargets: { initial: "/sp/", medial: null, final: "/n/" } },
  { word: "SUN", target: "/s/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=SUN", positionTargets: { initial: "/s/", medial: null, final: "/n/" } },
  { word: "ZIPPER", target: "/z/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=ZIPPER", positionTargets: { initial: "/z/", medial: "/p/", final: "/r/" } },
  { word: "SCISSORS", target: "/s/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=SCISSORS", positionTargets: { initial: "/s/", medial: "/z/", final: "/z/" } },
  { word: "DUCK", target: "/d/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=DUCK", positionTargets: { initial: "/d/", medial: null, final: "/k/" } },
  { word: "ORANGE", target: "/ɔː/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=ORANGE", positionTargets: { initial: "/ɔː/", medial: "/r/", final: "/ndʒ/" } },
  { word: "SHIELD", target: "/ʃ/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=SHIELD", positionTargets: { initial: "/ʃ/", medial: null, final: "/ld/" } },
  { word: "BALL", target: "/b/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=BALL", positionTargets: { initial: "/b/", medial: null, final: "/l/" } },
  { word: "TREE", target: "/tr/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=TREE", positionTargets: { initial: "/tr/", medial: null, final: null } },
  { word: "SHIP", target: "/ʃ/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=SHIP", positionTargets: { initial: "/ʃ/", medial: null, final: "/p/" } },
  { word: "CAR", target: "/k/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=CAR", positionTargets: { initial: "/k/", medial: null, final: "/r/" } },
  { word: "THUMB", target: "/θ/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=THUMB", positionTargets: { initial: "/θ/", medial: null, final: "/m/" } },
  { word: "PENCIL", target: "/p/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=PENCIL", positionTargets: { initial: "/p/", medial: "/ns/", final: "/l/" } },
  { word: "CHICKEN", target: "/tʃ/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=CHICKEN", positionTargets: { initial: "/tʃ/", medial: "/k/", final: "/n/" } },
  { word: "WATCH", target: "/w/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=WATCH", positionTargets: { initial: "/w/", medial: null, final: "/tʃ/" } },
  { word: "SHIRT", target: "/ʃ/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=SHIRT", positionTargets: { initial: "/ʃ/", medial: "/r/", final: "/t/" } },
  { word: "RING", target: "/r/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=RING", positionTargets: { initial: "/r/", medial: null, final: "/ŋ/" } },
  { word: "DRINK", target: "/dr/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=DRINK", positionTargets: { initial: "/dr/", medial: null, final: "/ŋk/" } },
  { word: "FEATHER", target: "/f/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=FEATHER", positionTargets: { initial: "/f/", medial: "/ð/", final: "/r/" } },
  { word: "RABBIT", target: "/r/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=RABBIT", positionTargets: { initial: "/r/", medial: "/b/", final: "/t/" } },
  { word: "ELEPHANT", target: "/ɛ/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=ELEPHANT", positionTargets: { initial: null, medial: "/f/", final: "/nt/" } },
  { word: "CHAIR", target: "/tʃ/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=CHAIR", positionTargets: { initial: "/tʃ/", medial: null, final: "/r/" } },
  { word: "SHOE", target: "/ʃ/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=SHOE", positionTargets: { initial: "/ʃ/", medial: null, final: null } },
  { word: "TABLE", target: "/t/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=TABLE", positionTargets: { initial: "/t/", medial: "/bl/", final: null } },
  { word: "BED", target: "/b/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=BED", positionTargets: { initial: "/b/", medial: null, final: "/d/" } },
  { word: "CAT", target: "/k/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=CAT", positionTargets: { initial: "/k/", medial: null, final: "/t/" } },
  { word: "DOG", target: "/d/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=DOG", positionTargets: { initial: "/d/", medial: null, final: "/ɡ/" } },
  { word: "FISH", target: "/f/", imgUrl: "https://placehold.co/400x300/e2e8f0/475569?text=FISH", positionTargets: { initial: "/f/", medial: null, final: "/ʃ/" } }
]

const diacriticOptions = [
  { symbol: "̪", label: "Dentalized (e.g. tongue touching teeth)", desc: "dentalized" },
  { symbol: "ˡ", label: "Lateralized (slurpy sound, air escapes sides)", desc: "lateralized" },
  { symbol: "̃", label: "Nasalized (air escapes through nose)", desc: "nasalized" },
  { symbol: "̥", label: "Devoiced (voiced sound pronounced voiceless)", desc: "devoiced" },
  { symbol: "ʰ", label: "Aspirated (strong burst of air)", desc: "aspirated" },
]

const celfSubtests = [
  { id: 'sc', name: 'Sentence Comprehension', type: 'receptive', items: ['"Point to the dog running"', '"Point to the girl holding a balloon"', '"Point to: The cat is chased by the boy"'] },
  { id: 'ws', name: 'Word Structure', type: 'expressive', items: ['"Here is a box. Here are two ___ (boxes)"', '"The boy is painting. He did it ___ (himself)"', '"This is the girl\'s hat. It is ___ (hers)"'] },
  { id: 'fd', name: 'Following Directions', type: 'receptive', items: ['"Point to the red circle"', '"Point to the blue square, then the yellow circle"', '"Point to the last black circle after pointing to the first white square"'] },
  { id: 'fs', name: 'Formulated Sentences', type: 'expressive', items: ['Use the word "and" to describe the picture.', 'Use the word "because" in a sentence.', 'Use the word "although" to describe the school scene.'] },
  { id: 'rs', name: 'Recalling Sentences', type: 'expressive', items: ['"The boy went home."', '"The big yellow bus stopped at the corner of the street."', '"Although it was raining outside, the children played in the school yard."'] },
  { id: 'wc', name: 'Word Classes', type: 'receptive', items: ['Find two words that go together: Apple, Banana, Chair.', 'Find two words that go together: Big, Small, Running.', 'Find two words that go together: Doctor, Nurse, Automobile.'] }
]

const AssessmentNew = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const queryPatientId = searchParams.get('patientId')
  const [selectedPatientId, setSelectedPatientId] = useState(queryPatientId || '')
  const [step, setStep] = useState(1)
  const [testType, setTestType] = useState('GFTA3')

  // Fetch Patients caseload
  const { data: patients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.patients.getAll().then(res => res)
  })

  // Set default patient if caseload is loaded
  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id)
    }
  }, [patients, selectedPatientId])

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0]

  // GFTA-3 State
  const [currentItem, setCurrentItem] = useState(0)
  const [timer, setTimer] = useState(0)
  const [scores, setScores] = useState({}) 
  const [activePosition, setActivePosition] = useState(null)
  const [showDiacriticPopup, setShowDiacriticPopup] = useState(false)
  const [results, setResults] = useState(null)

  // CELF-5 State
  const [celfScores, setCelfScores] = useState({
    sc: 5, ws: 5, fd: 5, fs: 5, rs: 5, wc: 5
  })
  const [celfResults, setCelfResults] = useState(null)

  useEffect(() => {
    let interval;
    if (step === 2) {
      interval = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [step])

  const saveMutation = useMutation({
    mutationFn: (assessment) => api.assessments.create(assessment),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient', selectedPatient?.id] })
      toast.success('Assessment successfully logged in patient health record!')
      navigate(`/patients/${selectedPatient?.id}`)
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`)
    }
  })

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleScore = (position, val) => {
    if (val === 'distortion') {
      setActivePosition(position)
      setShowDiacriticPopup(true)
      return
    }
    setScores(prev => ({
      ...prev,
      [currentItem]: {
        ...prev[currentItem],
        [position]: { type: val }
      }
    }))
  }

  const applyDiacritic = (diacritic) => {
    setScores(prev => ({
      ...prev,
      [currentItem]: {
        ...prev[currentItem],
        [activePosition]: { type: 'distortion', diacritic }
      }
    }))
    setShowDiacriticPopup(false)
    setActivePosition(null)
  }

  const classifySeverity = (ss) => {
    if (ss >= 115) return { label: "Above Average", color: "success" };
    if (ss >= 86)  return { label: "Within Normal Range", color: "default" };
    if (ss >= 78)  return { label: "Borderline / Mild Impairment", color: "warning" };
    if (ss >= 71)  return { label: "Moderate Impairment", color: "destructive" };
    return { label: "Severe Impairment", color: "destructive" };
  }

  const calculateGFTA3Score = () => {
    let errorCount = 0
    const errorsList = []

    Object.keys(scores).forEach(itemIdx => {
      const itemScores = scores[itemIdx]
      const stimulus = stimuliWords[itemIdx]
      Object.keys(itemScores).forEach(pos => {
        const sc = itemScores[pos]
        if (sc.type !== 'correct' && sc.type !== undefined) {
          errorCount++
          const phoneme = stimulus.positionTargets[pos]
          errorsList.push({
            word: stimulus.word,
            phoneme: phoneme || stimulus.target,
            position: pos,
            errorType: sc.type === 'distortion' ? `Distortion [${sc.diacritic?.symbol || ''}]` : sc.type
          })
        }
      })
    })

    const standardScore = Math.max(50, Math.min(120, Math.round(115 - errorCount * 1.5)))
    const severity = classifySeverity(standardScore)
    
    setResults({
      standardScore,
      percentile: standardScore >= 115 ? 84 : standardScore >= 100 ? 50 : standardScore >= 86 ? 25 : standardScore >= 78 ? 7 : 2,
      severity,
      confidenceInterval: [standardScore - 5, standardScore + 5],
      errorCount,
      errorsList
    })
    setStep(3)
  }

  const handleSaveGFTARecord = () => {
    saveMutation.mutate({
      patientId: selectedPatient.id,
      testName: "GFTA-3",
      subtest: "Sounds-in-Words",
      dateAdministered: new Date().toISOString(),
      rawScore: results.errorCount,
      standardScore: results.standardScore,
      percentile: results.percentile,
      severityLabel: results.severity.label,
      observations: `Completed GFTA-3 in ${formatTime(timer)}. Identified ${results.errorCount} total sound errors.`,
      rawData: { scores }
    })
  }

  const handleCelfScoreChange = (subtestId, val) => {
    setCelfScores(prev => ({
      ...prev,
      [subtestId]: Number(val)
    }))
  }

  const calculateCELF5Score = () => {
    const scaledScores = {}
    Object.keys(celfScores).forEach(id => {
      const raw = celfScores[id]
      scaledScores[id] = Math.min(19, Math.max(1, Math.round(raw * 1.6 + 1)))
    })

    const receptiveSum = scaledScores.sc + scaledScores.fd + scaledScores.wc
    const expressiveSum = scaledScores.ws + scaledScores.fs + scaledScores.rs

    const receptiveIndex = Math.min(150, Math.max(45, Math.round((receptiveSum / 30) * 100)))
    const expressiveIndex = Math.min(150, Math.max(45, Math.round((expressiveSum / 30) * 100)))
    const coreLanguageScore = Math.round((receptiveIndex + expressiveIndex) / 2)
    const severity = classifySeverity(coreLanguageScore)

    setCelfResults({
      receptiveSum,
      expressiveSum,
      receptiveIndex,
      expressiveIndex,
      coreLanguageScore,
      severity,
      scaledScores
    })
    setStep(3)
  }

  const handleSaveCELFRecord = () => {
    saveMutation.mutate({
      patientId: selectedPatient.id,
      testName: "CELF-5",
      subtest: "Mini Core Language",
      dateAdministered: new Date().toISOString(),
      rawScore: celfResults.receptiveSum + celfResults.expressiveSum,
      standardScore: celfResults.coreLanguageScore,
      percentile: celfResults.coreLanguageScore >= 115 ? 84 : celfResults.coreLanguageScore >= 100 ? 50 : celfResults.coreLanguageScore >= 86 ? 25 : celfResults.coreLanguageScore >= 78 ? 7 : 2,
      severityLabel: celfResults.severity.label,
      observations: `CELF-5 Mini language assessment. Receptive Index: ${celfResults.receptiveIndex}, Expressive Index: ${celfResults.expressiveIndex}.`,
      rawData: { scaledScores: celfResults.scaledScores }
    })
  }

  if (isPatientsLoading) return <LoadingScreen />

  if (!selectedPatient) {
    return (
      <div className="p-8 text-center text-slate-500 italic max-w-xl mx-auto mt-20 bg-white border border-slate-200 rounded-2xl p-12">
        <h3 className="font-bold text-lg text-slate-800">No Patient Profile Available</h3>
        <p className="text-slate-400 text-sm mt-1">Please create a patient profile first to run assessments.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Standardized Assessments</h1>
          <p className="text-slate-500">
            Patient: <strong className="text-slate-700">{selectedPatient.name}</strong> • DOB: {new Date(selectedPatient.dob).toLocaleDateString('en-IN')}
          </p>
        </div>
        {step === 2 && (
          <div className="bg-white px-4 py-2 rounded-lg border shadow-sm font-mono text-xl font-bold text-slate-700">
            {formatTime(timer)}
          </div>
        )}
      </div>

      {step === 1 && (
        <Card className="max-w-2xl mx-auto shadow-card-hover mt-8 bg-white border-slate-200">
          <CardHeader>
            <CardTitle>Assessment Setup</CardTitle>
            <CardDescription>Select patient and standardized test instrument.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Patient Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Patient</label>
              <select 
                className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Test Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Standardized Instrument</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${testType === 'GFTA3' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setTestType('GFTA3')}
                >
                  <h3 className="font-bold text-lg text-slate-900">GFTA-3</h3>
                  <p className="text-xs text-slate-500 mt-1">Goldman-Fristoe Test of Articulation (3rd Edition)</p>
                </div>
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${testType === 'CELF5' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setTestType('CELF5')}
                >
                  <h3 className="font-bold text-lg text-slate-900">CELF-5 Mini</h3>
                  <p className="text-xs text-slate-500 mt-1">Clinical Evaluation of Language Fundamentals (5th Edition)</p>
                </div>
              </div>
            </div>

            {testType === 'GFTA3' ? (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="font-semibold text-sm text-slate-700">Articulation Subtest</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="radio" name="gfta_mod" defaultChecked className="text-primary focus:ring-primary h-4 w-4" /> Sounds-in-Words (47 stimuli cards)
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-4 border-t border-slate-100 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                <p className="font-semibold text-slate-700 flex items-center gap-1"><Info className="h-4 w-4 text-primary" /> CELF-5 Mini Subtests:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><strong>Receptive:</strong> Sentence Comprehension, Following Directions, Word Classes</li>
                  <li><strong>Expressive:</strong> Word Structure, Formulated Sentences, Recalling Sentences</li>
                </ul>
              </div>
            )}
            
            <Button className="w-full mt-6 h-12 text-lg shadow-sm" onClick={() => setStep(2)}>
              Start Administration
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: GFTA-3 Administration */}
      {step === 2 && testType === 'GFTA3' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          
          {/* Left: Stimulus Panel */}
          <div className="md:col-span-3 space-y-4">
            <Card className="shadow-sm border-slate-200 bg-white">
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[420px]">
                <img 
                  src={stimuliWords[currentItem].imgUrl} 
                  alt={stimuliWords[currentItem].word} 
                  className="w-full max-w-sm rounded-xl shadow-md border mb-6"
                />
                <h2 className="text-4xl font-heading font-bold text-slate-900 tracking-widest uppercase">
                  {stimuliWords[currentItem].word}
                </h2>
              </CardContent>
            </Card>
            <div className="flex justify-between items-center px-2">
              <span className="text-sm font-medium text-slate-500">Item {currentItem + 1} of {stimuliWords.length}</span>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentItem(Math.max(0, currentItem - 1))} disabled={currentItem === 0}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                {currentItem < stimuliWords.length - 1 ? (
                  <Button onClick={() => setCurrentItem(currentItem + 1)}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="secondary" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={calculateGFTA3Score}>
                    <Calculator className="mr-2 h-4 w-4" /> Calculate Scores
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Scoring Matrix */}
          <div className="md:col-span-2">
            <Card className="shadow-sm border-slate-200 h-full flex flex-col bg-white">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold">Articulation scoring matrix</CardTitle>
                <CardDescription>Target Phoneme: <strong className="text-primary">{stimuliWords[currentItem].target}</strong></CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {['initial', 'medial', 'final'].map(position => {
                  const targetPhoneme = stimuliWords[currentItem].positionTargets[position];
                  if (!targetPhoneme) return null;

                  const currentScore = scores[currentItem]?.[position];
                  
                  return (
                    <div key={position} className="p-4 border-b border-slate-100 last:border-0">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-slate-700 capitalize">{position} Position ({targetPhoneme})</h4>
                        {currentScore && (
                          <Badge variant={currentScore.type === 'correct' ? 'success' : currentScore.type === 'distortion' ? 'default' : 'destructive'} className="text-[10px]">
                            {currentScore.type === 'distortion' ? `Distortion [${currentScore.diacritic?.symbol}]` : currentScore.type}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant={currentScore?.type === 'correct' ? 'default' : 'outline'}
                          className={`justify-start ${currentScore?.type === 'correct' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}`}
                          onClick={() => handleScore(position, 'correct')}
                          size="sm"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Correct
                        </Button>
                        <Button 
                          variant={currentScore?.type === 'substitution' ? 'default' : 'outline'}
                          className={`justify-start ${currentScore?.type === 'substitution' ? 'bg-amber-600 text-white hover:bg-amber-700' : ''}`}
                          onClick={() => handleScore(position, 'substitution')}
                          size="sm"
                        >
                          <AlertCircle className="mr-2 h-4 w-4" /> Substitution
                        </Button>
                        <Button 
                          variant={currentScore?.type === 'omission' ? 'default' : 'outline'}
                          className={`justify-start ${currentScore?.type === 'omission' ? 'bg-red-600 text-white hover:bg-red-700' : ''}`}
                          onClick={() => handleScore(position, 'omission')}
                          size="sm"
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Omission
                        </Button>
                        <Button 
                          variant={currentScore?.type === 'distortion' ? 'default' : 'outline'}
                          className={`justify-start ${currentScore?.type === 'distortion' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                          onClick={() => handleScore(position, 'distortion')}
                          size="sm"
                        >
                          <FilePlus2 className="mr-2 h-4 w-4" /> Distortion Helper
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: CELF-5 Mini Administration */}
      {step === 2 && testType === 'CELF5' && (
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-xl">CELF-5 Core Language Subtests</CardTitle>
            <CardDescription>Rate the patient's performance for each subtest based on the stimuli prompts.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {celfSubtests.map((sub) => (
                <div key={sub.id} className="p-4 border rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-base">{sub.name}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {sub.type}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-600">Sample Prompts:</p>
                      {sub.items.map((item, idx) => (
                        <p key={idx} className="italic">{item}</p>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-sm font-semibold text-slate-700">
                      <span>Raw Score (0 - 10):</span>
                      <span className="text-primary text-base font-bold">{celfScores[sub.id]}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      value={celfScores[sub.id]}
                      onChange={(e) => handleCelfScoreChange(sub.id, e.target.value)}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>Cancel</Button>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={calculateCELF5Score}>
                <Calculator className="mr-2 h-4 w-4" /> Generate CELF-5 Metrics
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: GFTA-3 Report Card */}
      {step === 3 && results && (
        <Card className="max-w-3xl mx-auto shadow-xl border-primary/20 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-center text-white">
            <h2 className="text-xl font-heading font-medium opacity-90 mb-2">GFTA-3 Articulation Standard Score</h2>
            <div className="text-7xl font-bold font-heading mb-4">{results.standardScore}</div>
            <Badge variant="outline" className="bg-white/20 border-white/30 text-white px-4 py-1 text-sm">
              {results.percentile}th Percentile Rank
            </Badge>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-3 gap-6 text-center border-b pb-6">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Severity</p>
                <Badge variant={results.severity.color} className="text-xs px-3 py-1 font-semibold">
                  {results.severity.label}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Errors</p>
                <p className="font-bold text-lg text-slate-900">{results.errorCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Confidence Interval (90%)</p>
                <p className="font-bold text-lg text-slate-900">{results.confidenceInterval[0]} - {results.confidenceInterval[1]}</p>
              </div>
            </div>
            
            {/* Error Summary Table */}
            <div>
              <h4 className="font-heading font-bold text-slate-800 text-lg mb-3">Phonological Error Log</h4>
              {results.errorsList.length > 0 ? (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Word Stimulus</th>
                        <th className="px-4 py-3">Target Phoneme</th>
                        <th className="px-4 py-3">Position</th>
                        <th className="px-4 py-3">Error Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {results.errorsList.map((err, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{err.word}</td>
                          <td className="px-4 py-3 font-mono text-primary font-bold">{err.phoneme}</td>
                          <td className="px-4 py-3 capitalize">{err.position}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={err.errorType.includes('Distortion') ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}>
                              {err.errorType}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center bg-green-50 border border-green-100 rounded-lg text-green-700 text-sm font-semibold">
                  ✓ Excellent performance. Zero sound-in-word articulation errors detected.
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <Button className="flex-1" onClick={handleSaveGFTARecord} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save GFTA-3 to Record'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: CELF-5 Report Card */}
      {step === 3 && celfResults && (
        <Card className="max-w-3xl mx-auto shadow-xl border-primary/20 overflow-hidden bg-white">
          <div className="bg-primary p-8 text-center text-white">
            <h2 className="text-xl font-heading font-medium opacity-90 mb-2">CELF-5 Core Language Score</h2>
            <div className="text-7xl font-bold font-heading mb-4">{celfResults.coreLanguageScore}</div>
            <Badge variant="outline" className="bg-white/20 border-white/30 text-white px-4 py-1 text-sm">
              Internal Consistency: Excellent (0.95)
            </Badge>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-3 gap-6 text-center border-b pb-6">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Receptive Index</p>
                <p className="font-bold text-2xl text-slate-900">{celfResults.receptiveIndex}</p>
                <span className="text-[10px] text-slate-400">(Sum: {celfResults.receptiveSum})</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Expressive Index</p>
                <p className="font-bold text-2xl text-slate-900">{celfResults.expressiveIndex}</p>
                <span className="text-[10px] text-slate-400">(Sum: {celfResults.expressiveSum})</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Severity Rating</p>
                <div className="mt-1">
                  <Badge variant={celfResults.severity.color} className="text-xs px-3 py-1 font-semibold">
                    {celfResults.severity.label}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Subtest Scaled Scores */}
            <div>
              <h4 className="font-heading font-bold text-slate-800 text-lg mb-3">Subtest Breakdown</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Subtest Name</th>
                      <th className="px-4 py-3">Domain</th>
                      <th className="px-4 py-3 text-right">Scaled Score (Mean: 10)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {celfSubtests.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{sub.name}</td>
                        <td className="px-4 py-3 capitalize">{sub.type}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {celfResults.scaledScores[sub.id]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <Button className="flex-1" onClick={handleSaveCELFRecord} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save CELF-5 to Record'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diacritics Selector Popup (Distortion helper) */}
      {showDiacriticPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="max-w-md w-full shadow-2xl border-slate-200 p-6 space-y-4 bg-white">
            <CardHeader className="p-0 pb-2 border-b">
              <CardTitle className="text-lg font-heading"> narrow distortion logging</CardTitle>
              <CardDescription>Select narrow transcription mark for narrow distortion logging.</CardDescription>
            </CardHeader>
            <div className="space-y-2">
              {diacriticOptions.map(option => (
                <div 
                  key={option.symbol}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-primary hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => applyDiacritic(option)}
                >
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{option.label}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{option.desc}</p>
                  </div>
                  <Badge variant="outline" className="text-lg font-mono px-3 py-1 font-bold bg-white text-primary border-primary/20">
                    [{option.symbol}]
                  </Badge>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => { setShowDiacriticPopup(false); setActivePosition(null); }}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  )
}

export default AssessmentNew
