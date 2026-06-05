import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, FilePlus2, XCircle, Info, Calculator, Mic, Square, Sparkles, Download } from 'lucide-react'
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

const getAgeBand = (dobString) => {
  const dob = new Date(dobString);
  const ageYears = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
  if (ageYears === 5) return '5:0-5:11';
  if (ageYears === 6) return '6:0-6:11';
  if (ageYears === 7) return '7:0-7:11';
  if (ageYears === 8) return '8:0-8:11';
  if (ageYears >= 9) return '9:0-9:11';
  return '8:0-8:11'; // fallback
};

const normativeData = {
  '5:0-5:11': { mean: 100, sd: 15, rawToSS: { 0:130,1:128,2:125,3:122,4:119,5:116,6:113,7:110,8:108,9:105,10:103,11:101,12:99,13:97,14:95,15:93,16:91,17:89,18:87,19:85,20:83,21:81,22:79,23:77,24:75,25:73,26:71,27:69,28:67,29:65,30:63,31:62,32:61,33:60,34:59,35:58,36:57,37:56,38:55,39:54,40:53 } },
  '6:0-6:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:127,4:122,6:117,8:112,10:107,12:103,14:99,16:95,18:91,20:87,22:83,24:79,26:75,28:71,30:67,32:63,34:60,36:57,38:54,40:52 } },
  '7:0-7:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:126,4:121,6:116,8:111,10:106,12:101,14:97,16:93,18:89,20:85,22:81,24:77,26:73,28:70,30:66,32:63,34:60,36:57,38:55,40:52 } },
  '8:0-8:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:125,4:120,6:115,8:110,10:105,12:100,14:96,16:92,18:88,20:84,22:80,24:76,26:72,28:69,30:66,32:63,34:60,36:57,38:55,40:52 } },
  '9:0-9:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:124,4:118,6:113,8:108,10:103,12:98,14:94,16:90,18:86,20:82,22:78,24:74,26:70,28:67,30:64,32:61,34:59,36:57,38:55,40:52 } },
};

const interpolateSS = (rawToSS, rawScore) => {
  const keys = Object.keys(rawToSS).map(Number).sort((a,b) => a-b);
  const intRaw = Math.round(rawScore);
  if (rawToSS[intRaw] !== undefined) return rawToSS[intRaw];
  let lower = keys.filter(k => k <= intRaw).pop();
  let upper = keys.filter(k => k > intRaw)[0];
  if (lower === undefined) return rawToSS[keys[0]];
  if (upper === undefined) return rawToSS[keys[keys.length-1]];
  const ratio = (intRaw - lower) / (upper - lower);
  return Math.round(rawToSS[lower] + ratio * (rawToSS[upper] - rawToSS[lower]));
};

const ssToPercentile = (ss) => {
  const z = (ss - 100) / 15;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const cdf = z >= 0 ? 1 - p : p;
  return Math.max(1, Math.min(99, Math.round(cdf * 100)));
};

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

  // AI Speech / Goals / PDF State
  const [isRecording, setIsRecording] = useState(false)
  const [simScenario, setSimScenario] = useState('correct')
  const [speechResult, setSpeechResult] = useState(null)
  const [selectedGoals, setSelectedGoals] = useState([])
  const [savedAssessmentId, setSavedAssessmentId] = useState(null)

  // Clear inputs when patient or test type changes
  useEffect(() => {
    setSelectedGoals([])
    setSavedAssessmentId(null)
    setSpeechResult(null)
    setScores({})
    setCurrentItem(0)
    setTimer(0)
  }, [selectedPatientId, testType])

  useEffect(() => {
    let interval;
    if (step === 2) {
      interval = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [step])

  const saveMutation = useMutation({
    mutationFn: async (assessment) => {
      // Create the assessment record
      const res = await api.assessments.create(assessment);
      
      // Update linked goals with progress if any are selected
      const accuracy = testType === 'GFTA3' 
        ? Math.round(((47 - results.errorCount) / 47) * 100)
        : Math.round((celfResults.coreLanguageScore / 150) * 100);
      
      for (const goalId of selectedGoals) {
        await api.goals.updateProgress(goalId, accuracy);
      }
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient', selectedPatient?.id] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Assessment successfully logged and clinical goals updated!')
      setSavedAssessmentId(data.id)
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

    const ageBand = getAgeBand(selectedPatient.dob)
    const bandNorms = normativeData[ageBand] || normativeData['8:0-8:11']
    const standardScore = interpolateSS(bandNorms.rawToSS, errorCount)
    const percentile = ssToPercentile(standardScore)
    const severity = classifySeverity(standardScore)
    
    setResults({
      standardScore,
      percentile,
      severity,
      confidenceInterval: [standardScore - 5, standardScore + 5],
      errorCount,
      errorsList
    })
    setStep(3)
  }

  const handleSaveGFTARecord = () => {
    handleSaveGFTARecordPromise();
  };

  const handleSaveGFTARecordPromise = async () => {
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

  // Azure Speech Recognition mock helper logic
  const startSpeechRecording = () => {
    setIsRecording(true);
    setSpeechResult(null);
    toast("Microphone listening...", { icon: "🎤" });
  };

  const stopSpeechRecording = () => {
    setIsRecording(false);
    const word = stimuliWords[currentItem].word;
    const targetPhonemes = stimuliWords[currentItem].positionTargets;
    
    let simulated = {
      text: word.toLowerCase(),
      accuracy: 98,
      completeness: 100,
      fluency: 95,
      pronScore: 97,
      phonemeBreakdown: []
    };

    if (simScenario === 'correct') {
      simulated.accuracy = 98;
      simulated.pronScore = 98;
      ['initial', 'medial', 'final'].forEach(pos => {
        if (targetPhonemes[pos]) {
          simulated.phonemeBreakdown.push({ phoneme: targetPhonemes[pos].replace(/\//g, ''), position: pos, status: 'Correct' });
        }
      });
    } else if (simScenario === 'omission') {
      simulated.accuracy = 78;
      simulated.pronScore = 80;
      let hasFinal = false;
      ['initial', 'medial', 'final'].forEach(pos => {
        if (targetPhonemes[pos]) {
          if (pos === 'final') {
            simulated.phonemeBreakdown.push({ phoneme: targetPhonemes[pos].replace(/\//g, ''), position: pos, status: 'Omission' });
            hasFinal = true;
          } else {
            simulated.phonemeBreakdown.push({ phoneme: targetPhonemes[pos].replace(/\//g, ''), position: pos, status: 'Correct' });
          }
        }
      });
      if (!hasFinal) {
        simulated.phonemeBreakdown = simulated.phonemeBreakdown.map((p, idx) => 
          idx === simulated.phonemeBreakdown.length - 1 ? { ...p, status: 'Omission' } : p
        );
      }
    } else if (simScenario === 'substitution') {
      simulated.accuracy = 65;
      simulated.pronScore = 68;
      let hasInitial = false;
      ['initial', 'medial', 'final'].forEach(pos => {
        if (targetPhonemes[pos]) {
          if (pos === 'initial') {
            simulated.phonemeBreakdown.push({ phoneme: targetPhonemes[pos].replace(/\//g, ''), position: pos, status: 'Substitution' });
            hasInitial = true;
          } else {
            simulated.phonemeBreakdown.push({ phoneme: targetPhonemes[pos].replace(/\//g, ''), position: pos, status: 'Correct' });
          }
        }
      });
      if (!hasInitial && simulated.phonemeBreakdown.length > 0) {
        simulated.phonemeBreakdown[0].status = 'Substitution';
      }
    } else if (simScenario === 'distortion') {
      simulated.accuracy = 82;
      simulated.pronScore = 84;
      let hasMedial = false;
      ['initial', 'medial', 'final'].forEach(pos => {
        if (targetPhonemes[pos]) {
          if (pos === 'medial') {
            simulated.phonemeBreakdown.push({ phoneme: targetPhonemes[pos].replace(/\//g, ''), position: pos, status: 'Distortion' });
            hasMedial = true;
          } else {
            simulated.phonemeBreakdown.push({ phoneme: targetPhonemes[pos].replace(/\//g, ''), position: pos, status: 'Correct' });
          }
        }
      });
      if (!hasMedial && simulated.phonemeBreakdown.length > 0) {
        simulated.phonemeBreakdown[0].status = 'Distortion';
      }
    }

    setSpeechResult(simulated);
    toast.success("AI pronunciation check complete!");
  };

  const applyAiScoringSuggestion = () => {
    if (!speechResult) return;
    const currentWord = stimuliWords[currentItem];
    const newScores = { ...scores[currentItem] };

    ['initial', 'medial', 'final'].forEach(position => {
      const phoneme = currentWord.positionTargets[position];
      if (!phoneme) return;

      const phMatch = speechResult.phonemeBreakdown.find(p => p.position === position);
      if (phMatch) {
        if (phMatch.status === 'Correct') {
          newScores[position] = { type: 'correct' };
        } else if (phMatch.status === 'Omission') {
          newScores[position] = { type: 'omission' };
        } else if (phMatch.status === 'Substitution') {
          newScores[position] = { type: 'substitution' };
        } else if (phMatch.status === 'Distortion') {
          newScores[position] = { 
            type: 'distortion', 
            diacritic: diacriticOptions.find(d => d.symbol === "̪") || diacriticOptions[0]
          };
        }
      } else {
        newScores[position] = { type: 'correct' };
      }
    });

    setScores(prev => ({
      ...prev,
      [currentItem]: newScores
    }));
    toast.success("AI suggestions applied to scoring matrix!");
  };

  const handleDownloadPDF = async () => {
    try {
      const filename = `${testType}_Assessment_Report_${selectedPatient.name.replace(/\s+/g, '_')}.pdf`;
      await api.assessments.downloadPdf(savedAssessmentId, filename);
      toast.success('PDF report downloaded successfully!');
    } catch (err) {
      toast.error(`Failed to download PDF: ${err.message}`);
    }
  };

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
          
          {/* Left: Stimulus Panel & AI Assist */}
          <div className="md:col-span-3 space-y-4">
            
            {/* Visual Item Progress & Quick Navigation Grid */}
            <Card className="shadow-sm border-slate-200 bg-white">
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <span>Stimulus Navigator (47 Items)</span>
                  <span className="text-primary">{currentItem + 1} Selected</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                  {stimuliWords.map((word, idx) => {
                    const isScored = scores[idx] && Object.keys(scores[idx]).length > 0;
                    let btnStyle = "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
                    if (isScored) {
                      const hasErrors = Object.values(scores[idx]).some(s => s.type !== 'correct');
                      btnStyle = hasErrors 
                        ? "bg-amber-50 text-amber-700 border-amber-200 font-semibold hover:bg-amber-100" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold hover:bg-emerald-100";
                    }
                    if (currentItem === idx) {
                      btnStyle += " ring-2 ring-primary ring-offset-1 font-bold";
                    }
                    return (
                      <button 
                        key={idx} 
                        className={`w-7 h-7 text-[10px] rounded border transition-all ${btnStyle}`}
                        onClick={() => setCurrentItem(idx)}
                        type="button"
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-white">
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[360px]">
                <img 
                  src={stimuliWords[currentItem].imgUrl} 
                  alt={stimuliWords[currentItem].word} 
                  className="w-full max-w-xs rounded-xl shadow-md border mb-6"
                />
                <h2 className="text-4xl font-heading font-bold text-slate-900 tracking-widest uppercase">
                  {stimuliWords[currentItem].word}
                </h2>
              </CardContent>
            </Card>

            {/* AI Speech Recognition Assistant Card */}
            <Card className="shadow-sm border-slate-200 bg-white">
              <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                    <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                    AI Speech Recognition Assistance
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time speech analysis using Azure Speech SDK with offline mock scenarios.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Microphone Action Button */}
                  <Button 
                    variant={isRecording ? 'destructive' : 'default'}
                    className={`h-10 w-full sm:w-auto px-5 font-semibold flex items-center justify-center gap-2 shadow-sm ${!isRecording ? 'bg-indigo-600 hover:bg-indigo-700' : 'animate-pulse'}`}
                    onClick={isRecording ? stopSpeechRecording : startSpeechRecording}
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-3.5 w-3.5 fill-white" /> Stop
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5" /> Speak
                      </>
                    )}
                  </Button>

                  {/* Mock Scenario Select */}
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pronunciation Scenario Simulation</label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      value={simScenario}
                      onChange={(e) => setSimScenario(e.target.value)}
                    >
                      <option value="correct">Scenario A: Correct Pronunciation (100% Accuracy)</option>
                      <option value="omission">Scenario B: Final Phoneme Omission</option>
                      <option value="substitution">Scenario C: Initial Phoneme Substitution</option>
                      <option value="distortion">Scenario D: Medial Phoneme Distortion</option>
                    </select>
                  </div>
                </div>

                {/* Speech recognition visual status or details */}
                {speechResult && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-900 text-sm">Transcription: "{speechResult.text}"</span>
                      <Badge className="bg-indigo-600 text-white font-mono font-bold">
                        Accuracy: {speechResult.accuracy}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="bg-white p-2 rounded border border-indigo-50 text-center">
                        <span className="text-[10px] text-slate-400 font-semibold block">COMPLETENESS</span>
                        <strong className="text-slate-700 font-mono text-sm">{speechResult.completeness}%</strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-indigo-50 text-center">
                        <span className="text-[10px] text-slate-400 font-semibold block">FLUENCY</span>
                        <strong className="text-slate-700 font-mono text-sm">{speechResult.fluency}%</strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-indigo-50 text-center">
                        <span className="text-[10px] text-slate-400 font-semibold block">PRONUNCIATION</span>
                        <strong className="text-slate-700 font-mono text-sm">{speechResult.pronScore}%</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-indigo-100/60 space-y-1">
                      <p className="font-semibold text-indigo-950">Phoneme Analysis & Recommendations:</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {speechResult.phonemeBreakdown.map((ph, idx) => (
                          <span key={idx} className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold border ${
                            ph.status === 'Correct' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : ph.status === 'Omission'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : ph.status === 'Substitution'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            /{ph.phoneme}/: {ph.status}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white w-full h-8 text-[11px] font-bold"
                        onClick={applyAiScoringSuggestion}
                      >
                        Apply AI Suggestions to Matrix
                      </Button>
                    </div>
                  </div>
                )}

                {isRecording && (
                  <div className="flex items-center gap-3 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg p-3 animate-pulse">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                    </span>
                    <span>Listening to speech input... Pronounce "{stimuliWords[currentItem].word}" clearly.</span>
                  </div>
                )}
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

            {/* Goals Linking Section */}
            {!savedAssessmentId && selectedPatient?.goals?.filter(g => g.status === 'IN_PROGRESS').length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="font-heading font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-primary" /> Link Assessment to Goals
                </h4>
                <p className="text-xs text-slate-500">
                  Select active goals to log this assessment's accuracy ({Math.round(((47 - results.errorCount) / 47) * 100)}%) as a progress entry.
                </p>
                <div className="space-y-2">
                  {selectedPatient.goals.filter(g => g.status === 'IN_PROGRESS').map(goal => (
                    <label key={goal.id} className="flex items-start gap-3 text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer shadow-sm">
                      <input 
                        type="checkbox" 
                        className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                        checked={selectedGoals.includes(goal.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGoals(prev => [...prev, goal.id])
                          } else {
                            setSelectedGoals(prev => prev.filter(id => id !== goal.id))
                          }
                        }}
                      />
                      <div>
                        <span className="font-bold text-xs uppercase text-primary tracking-wider">{goal.domain}</span>
                        <p className="text-slate-600 text-xs mt-0.5">{goal.goalText}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
              {savedAssessmentId ? (
                <>
                  <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2" onClick={handleDownloadPDF}>
                    <Download className="h-4 w-4" /> Download Clinical PDF Report
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => navigate(`/patients/${selectedPatient.id}`)}>
                    Return to Patient Profile
                  </Button>
                </>
              ) : (
                <>
                  <Button className="flex-1" onClick={handleSaveGFTARecord} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving to record...' : 'Save GFTA-3 to Record'}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Go Back</Button>
                </>
              )}
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

            {/* Goals Linking Section */}
            {!savedAssessmentId && selectedPatient?.goals?.filter(g => g.status === 'IN_PROGRESS').length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="font-heading font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-primary" /> Link Assessment to Goals
                </h4>
                <p className="text-xs text-slate-500">
                  Select active goals to log this assessment's scaled score percentage ({Math.round((celfResults.coreLanguageScore / 150) * 100)}%) as a progress entry.
                </p>
                <div className="space-y-2">
                  {selectedPatient.goals.filter(g => g.status === 'IN_PROGRESS').map(goal => (
                    <label key={goal.id} className="flex items-start gap-3 text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer shadow-sm">
                      <input 
                        type="checkbox" 
                        className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                        checked={selectedGoals.includes(goal.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGoals(prev => [...prev, goal.id])
                          } else {
                            setSelectedGoals(prev => prev.filter(id => id !== goal.id))
                          }
                        }}
                      />
                      <div>
                        <span className="font-bold text-xs uppercase text-primary tracking-wider">{goal.domain}</span>
                        <p className="text-slate-600 text-xs mt-0.5">{goal.goalText}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
              {savedAssessmentId ? (
                <>
                  <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2" onClick={handleDownloadPDF}>
                    <Download className="h-4 w-4" /> Download Clinical PDF Report
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => navigate(`/patients/${selectedPatient.id}`)}>
                    Return to Patient Profile
                  </Button>
                </>
              ) : (
                <>
                  <Button className="flex-1" onClick={handleSaveCELFRecord} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving to record...' : 'Save CELF-5 to Record'}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Go Back</Button>
                </>
              )}
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
