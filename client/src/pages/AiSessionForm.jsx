// client/src/pages/AiSessionForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AiSessionForm.css';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

const STEP_LABELS = ['', 'Patient & Session', 'Exercises Done', 'Clinician Notes', 'Plan & Output Type', 'Review Output'];
import { api } from '../services/api';

const EXERCISE_LIST = [
  { name: 'R articulation drill', type: 'Articulation' },
  { name: 'Picture naming', type: 'Expressive Language' },
  { name: 'Sentence repetition', type: 'Language' },
  { name: 'Easy onset practice', type: 'Fluency' },
  { name: 'Vocabulary matching', type: 'Receptive Language' },
  { name: 'Following directions', type: 'Receptive Language' },
  { name: 'Story retell', type: 'Narrative Language' },
  { name: 'Phonological awareness', type: 'Phonology' },
];

export default function AiSessionForm({ embedded }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId');

  // Real Database Patients
  const { data: realPatients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.patients.getAll()
  });

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const diff = Date.now() - new Date(dobString).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  // State
  const [step, setStep] = useState(1);
  const [patientId, setPatientId] = useState(initialPatientId || '');
  const [sessionType, setSessionType] = useState('Individual Therapy');
  const [duration, setDuration] = useState(45);
  const [sessionNumber, setSessionNumber] = useState(8);
  const [frequency, setFrequency] = useState('2x per week');
  const [cpt, setCpt] = useState('92507');
  
  const [exercises, setExercises] = useState(['R articulation drill', 'Picture naming']);
  const [accuracyData, setAccuracyData] = useState({
    'R articulation drill': { accuracy: 78, previous: 65, trials: 50 },
    'Picture naming': { accuracy: 85, previous: 70, trials: 40 }
  });

  const [behavior, setBehavior] = useState('Cooperative and attentive throughout session');
  const [cueingLevel, setCueingLevel] = useState('Moderate verbal cues throughout session');
  const [caregiverReport, setCaregiverReport] = useState('Parent reports consistent home practice with target sounds');
  const [nextFocus, setNextFocus] = useState('Advance to phrase-level production tasks');
  const [homePractice, setHomePractice] = useState('Practice target word list for 10 minutes daily');

  const [endpoint, setEndpoint] = useState('generate-soap'); // generate-soap | recommend-goals

  // Loading & Results
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [toast, setToast] = useState(null);
  
  const [activeTab, setActiveTab] = useState('output');
  const [rawJson, setRawJson] = useState('');
  
  // Results Data
  const [soapData, setSoapData] = useState({ s: '', o: '', a: '', p: '' });
  const [goalsHtml, setGoalsHtml] = useState('');

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const toggleExercise = (name) => {
    setExercises(prev => {
      if (prev.includes(name)) {
        return prev.filter(e => e !== name);
      } else {
        const next = [...prev, name];
        setAccuracyData(d => ({
          ...d,
          [name]: d[name] || { accuracy: 0, previous: 0, trials: 30 }
        }));
        return next;
      }
    });
  };

  const updateAccuracy = (ex, field, val) => {
    setAccuracyData(prev => ({
      ...prev,
      [ex]: { ...prev[ex], [field]: parseFloat(val) || 0 }
    }));
  };

  const buildJSON = () => {
    // If no patientId is selected, and we have realPatients, default to first or just wait
    const p = realPatients.find(pat => pat.id === patientId) || realPatients[0];
    if (!p) return {};

    const age = p.dob ? calculateAge(p.dob) : (p.age || 'Unknown');
    const diag = p.diagnoses || [];
    const pGoals = p.goals || [];

    const exercisesFormatted = exercises.map(ex => {
      const d = accuracyData[ex] || { accuracy: 0, previous: 0, trials: 30 };
      return { activity: ex, accuracy: d.accuracy, previous_accuracy: d.previous, trials: d.trials, cueing: cueingLevel, target_accuracy: 80 };
    });

    return {
      patient: { name: p.name, age: age, diagnosis: diag },
      session: { type: sessionType, duration, frequency, session_number: sessionNumber },
      clinician_notes: {
        behavior,
        cueing_level: cueingLevel,
        caregiver_report: caregiverReport,
        patient_response: null
      },
      goals: pGoals,
      exercises: exercisesFormatted,
      plan_details: {
        next_session_focus: nextFocus,
        home_practice: homePractice,
        frequency
      },
      assessment: p.assessments || {},
      currentPerformance: Object.fromEntries(
        exercises.map(ex => [ex.toLowerCase().replace(/ /g, '_') + '_accuracy', (accuracyData[ex] || {}).accuracy || 0])
      ),
      existingGoals: pGoals.map(g => ({ goal: g.goalText || g.description, current: g.current || 0, target: g.target_accuracy || 80, status: g.status || 'In Progress' })),
      sessionHistory: []
    };
  };

  const currentJson = buildJSON();

  const handleGenerateAI = async () => {
    const body = buildJSON();

    setStep(5);
    setLoading(true);
    setLoadingText('Building JSON from form selections...');

    setTimeout(() => setLoadingText('Sending to Groq LLaMA 3.3 70B...'), 600);

    try {
      let responseBody;
      if (endpoint === 'generate-soap') {
        responseBody = await api.ai.generateSoap(body);
      } else {
        responseBody = await api.ai.recommendGoals(body);
      }
      
      setRawJson(JSON.stringify(responseBody, null, 2));
      const data = responseBody.data;
      
      if (endpoint === 'generate-soap') {
        if (data) {
          setSoapData({
            s: data.subjective || '',
            o: data.objective || '',
            a: data.assessment || '',
            p: data.plan || ''
          });
        }
        showToast('SOAP Note Generated!');
      } else {
        if (data) {
          let html = '';
          if (data.clinicalSummary) {
            html += `<div style="background:var(--blue-l);border-radius:var(--r);padding:14px 16px;margin-bottom:16px;border-left:4px solid var(--blue)">
              <div style="font-size:11px;font-weight:700;color:var(--blue);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px">Clinical Summary</div>
              <div style="font-size:13px;color:var(--navy);line-height:1.6">${data.clinicalSummary}</div>
            </div>`;
          }
          
          if (data.goalAdvancements && data.goalAdvancements.length > 0) {
            html += `<h3 style="font-size:15px;font-weight:700;margin-bottom:12px;margin-top:20px;display:flex;align-items:center;gap:8px"><span style="font-size:18px">🚀</span> Goal Advancements</h3>`;
            data.goalAdvancements.forEach(g => {
              html += `<div class="goal-card" style="border-left:4px solid var(--purple)">
                <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Previous Goal: ${g.previousGoal}</div>
                <div class="goal-text" style="color:var(--purple);font-weight:700">${g.newGoal}</div>
                <div style="font-size:12px;color:var(--navy);margin-top:6px">${g.reason}</div>
              </div>`;
            });
          }

          if (data.nextFocusAreas && data.nextFocusAreas.length > 0) {
            html += `<h3 style="font-size:15px;font-weight:700;margin-bottom:12px;margin-top:20px;display:flex;align-items:center;gap:8px"><span style="font-size:18px">🔭</span> Next Focus Areas</h3>`;
            html += `<div style="display:flex;flex-direction:column;gap:10px;">`
            data.nextFocusAreas.forEach(area => {
              html += `<div style="background:white;padding:12px;border-radius:8px;border:1px solid var(--border)">
                <div style="font-weight:600;font-size:14px;color:var(--navy);margin-bottom:4px">${area.area}</div>
                <div style="font-size:12px;color:var(--muted)">${area.reason}</div>
              </div>`
            });
            html += `</div>`
          }

          if (data.recommendedGoals && data.recommendedGoals.length > 0) {
            html += `<h3 style="font-size:15px;font-weight:700;margin-bottom:12px;margin-top:20px;display:flex;align-items:center;gap:8px"><span style="font-size:18px">🎯</span> Recommended New Goals</h3>`;
            data.recommendedGoals.forEach(g => {
              html += `<div class="goal-card">
                <div class="goal-meta">
                  <span class="badge badge-blue">${g.domain}</span>
                  <span class="badge badge-amber">Target: ${g.target}%</span>
                  <span class="badge badge-green">${g.targetDate}</span>
                </div>
                <div class="goal-text">${g.goal}</div>
                <div style="font-size:12px;color:var(--muted);margin-top:6px"><strong>Rationale:</strong> ${g.reason}</div>
              </div>`;
            });
          }
          setGoalsHtml(html);
        } else {
          setGoalsHtml('<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;background:var(--surface);border-radius:var(--r)">No goals generated by this endpoint</div>');
        }
        showToast('Goals Generated!');
      }

      setActiveTab('output');
    } catch (e) {
      console.error(e);
      showToast('Error connecting to AI backend: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyNote = () => {
    if (activeTab === 'output') {
      let text = '';
      if (endpoint === 'generate-soap') {
        text = `S: ${soapData.s}\n\nO: ${soapData.o}\n\nA: ${soapData.a}\n\nP: ${soapData.p}`;
      } else {
        text = "Goal Recommendations Generated.";
      }
      navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    }
  };

  const pData = realPatients.find(pat => pat.id === patientId) || realPatients[0];
  const activeDiagnoses = pData?.diagnoses && Array.isArray(pData.diagnoses) ? pData.diagnoses : [];

  return (
    <div className="ai-session-wrapper">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? '✓ ' : '⚠ '} {toast.msg}
        </div>
      )}

      {/* Loading Overlay */}
      <div className={`loading-overlay ${loading ? 'show' : ''}`}>
        <div className="spinner"></div>
        <div className="loading-text">Generating Clinical Output</div>
        <div className="loading-sub">{loadingText}</div>
      </div>

      <div className="app-layout">
        {/* SIDEBAR */}
        {!embedded && (
          <aside className="sidebar">
            <div className="logo">
            <div className="logo-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/></svg>
            </div>
            <div>
              <div className="logo-name">SpeechSync</div>
              <div className="logo-sub">AI Assistant</div>
            </div>
          </div>

          <div className="step-nav">
            {[1, 2, 3, 4, 5].map((n) => (
              <button 
                key={n}
                className={`step-btn ${step === n ? 'active' : ''} ${step > n ? 'done' : ''}`}
                onClick={() => setStep(n)}
              >
                <span className="step-num">{n === 5 ? '✦' : n}</span>
                <div>
                  <div>{STEP_LABELS[n]}</div>
                </div>
              </button>
            ))}
          </div>

        </aside>
        )}

        {/* MAIN */}
        <main className="main-content">
          <div className="page-header">
            <h1>AI Clinical Assistant</h1>
            <p>Fill in session details to automatically generate data-driven clinical notes and goals</p>
            <div className="step-indicator">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`step-dot ${step === n ? 'active' : ''} ${step > n ? 'done' : ''}`}></div>
              ))}
              <span className="step-label">Step {step} of 5 — {STEP_LABELS[step]}</span>
            </div>
          </div>

          {/* STEP 1: Patient & Session */}
          {step === 1 && (
            <div className="form-section visible">
              <div className="section-card">
                <div className="section-title-bar"><span className="step-badge">1</span><h2>Patient & Session Info</h2></div>

                <div className="field-row">
                  <div className="field-col">
                    <label className="field-label">Patient</label>
                    {isPatientsLoading ? (
                      <div className="text-sm text-slate-500 py-2">Loading patients from database...</div>
                    ) : (
                      <select className="text-input" value={patientId} onChange={e => setPatientId(e.target.value)}>
                        <option value="" disabled>Select a patient</option>
                        {realPatients.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.dob ? calculateAge(p.dob) : 'N/A'}yrs
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="field-col">
                    <label className="field-label">Session Type</label>
                    <select className="text-input" value={sessionType} onChange={e => setSessionType(e.target.value)}>
                      <option>Individual Therapy</option>
                      <option>Group Therapy</option>
                      <option>Evaluation</option>
                      <option>Re-evaluation</option>
                      <option>Consultation</option>
                    </select>
                  </div>
                </div>

                <div className="field-row">
                  <div className="field-col">
                    <label className="field-label">Duration (minutes)</label>
                    <select className="text-input" value={duration} onChange={e => setDuration(parseInt(e.target.value))}>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>
                  <div className="field-col">
                    <label className="field-label">Session Number</label>
                    <input className="text-input" type="number" value={sessionNumber} onChange={e => setSessionNumber(parseInt(e.target.value))} min="1" max="999" />
                  </div>
                </div>

                <div className="field-row">
                  <div className="field-col">
                    <label className="field-label">Session Frequency</label>
                    <select className="text-input" value={frequency} onChange={e => setFrequency(e.target.value)}>
                      <option>1x per week</option>
                      <option>2x per week</option>
                      <option>3x per week</option>
                      <option>Daily</option>
                    </select>
                  </div>
                  <div className="field-col">
                    <label className="field-label">CPT Code</label>
                    <select className="text-input" value={cpt} onChange={e => setCpt(e.target.value)}>
                      <option value="92507">92507 — Speech/Language Treatment</option>
                      <option value="92508">92508 — Group Therapy</option>
                      <option value="92521">92521 — Fluency Evaluation</option>
                      <option value="92523">92523 — Language Evaluation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="field-label">Active Diagnoses</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px', background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                    {activeDiagnoses.map(d => (
                      <span key={d} className="badge badge-blue">{d}</span>
                    ))}
                    {activeDiagnoses.length === 0 && <span className="text-sm text-slate-500 italic">No active diagnoses documented</span>}
                  </div>
                </div>
              </div>

              <div className="nav-bar">
                <span></span>
                <button className="btn btn-primary" onClick={() => setStep(2)}>Next: Exercises →</button>
              </div>
            </div>
          )}

          {/* STEP 2: Exercises */}
          {step === 2 && (
            <div className="form-section visible">
              <div className="section-card">
                <div className="section-title-bar"><span className="step-badge">2</span><h2>Exercises Completed</h2></div>
                <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '16px' }}>Select all exercises done this session, then enter accuracy %</p>

                <label className="field-label">Select Activities</label>
                <div className="check-grid">
                  {EXERCISE_LIST.map(ex => {
                    const selected = exercises.includes(ex.name);
                    return (
                      <div key={ex.name} className={`check-opt ${selected ? 'selected' : ''}`} onClick={() => toggleExercise(ex.name)}>
                        <div className="check-box">
                          <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        </div>
                        <div>
                          <div className="check-text">{ex.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{ex.type}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="section-card">
                <h3>Accuracy & Trial Data</h3>
                <p>Enter results for each selected exercise</p>
                <div className="accuracy-grid">
                  {exercises.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px', fontSize: '13px' }}>Select at least one exercise above</div>
                  ) : (
                    exercises.map(ex => {
                      const d = accuracyData[ex] || { accuracy: 0, previous: 0, trials: 30 };
                      return (
                        <div key={ex} className="accuracy-row">
                          <div className="accuracy-name">{ex}</div>
                          <div>
                            <div className="accuracy-label">Current %</div>
                            <input className="accuracy-input" type="number" min="0" max="100" value={d.accuracy} onChange={e => updateAccuracy(ex, 'accuracy', e.target.value)} />
                          </div>
                          <div>
                            <div className="accuracy-label">Previous %</div>
                            <input className="accuracy-input" type="number" min="0" max="100" value={d.previous} onChange={e => updateAccuracy(ex, 'previous', e.target.value)} />
                          </div>
                          <div>
                            <div className="accuracy-label">Trials</div>
                            <input className="accuracy-input" type="number" min="1" max="999" value={d.trials} onChange={e => updateAccuracy(ex, 'trials', e.target.value)} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="nav-bar">
                <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>Next: Clinician Notes →</button>
              </div>
            </div>
          )}

          {/* STEP 3: Clinician Notes */}
          {step === 3 && (
            <div className="form-section visible">
              <div className="section-card">
                <div className="section-title-bar"><span className="step-badge">3</span><h2>Clinician Observations</h2></div>

                <label className="field-label" style={{ marginBottom: '10px' }}>Patient Behavior During Session</label>
                <div className="radio-group">
                  {[
                    ['Cooperative and attentive throughout session', 'Cooperative and attentive', 'Stayed on task, followed all directions'],
                    ['Cooperative with occasional redirection required', 'Cooperative with occasional redirection', 'Generally on task, minor prompting needed'],
                    ['Distracted — required frequent redirection throughout session', 'Distracted — frequent redirection needed', 'Off-task behavior impacted performance'],
                    ['Uncooperative — session goals modified accordingly', 'Uncooperative — session modified', 'Goals adjusted, reduced session effectiveness']
                  ].map(([val, label, sub]) => (
                    <label key={val} className={`radio-opt ${behavior === val ? 'selected' : ''}`} onClick={() => setBehavior(val)}>
                      <div className="radio-dot"></div>
                      <div><div className="radio-text">{label}</div><div className="radio-sub">{sub}</div></div>
                    </label>
                  ))}
                </div>

                <div className="divider"></div>

                <label className="field-label">Cueing Level Required</label>
                <div className="radio-group">
                  {[
                    ['Independent — no cueing required', 'Independent', 'No cues needed — performed without assistance'],
                    ['Minimal verbal cues', 'Minimal verbal cues', 'Occasional brief reminders only'],
                    ['Moderate verbal cues throughout session', 'Moderate verbal cues', 'Regular verbal prompts required throughout'],
                    ['Maximal verbal and visual cues required', 'Maximal verbal and visual cues', 'Extensive support needed for task completion'],
                    ['Physical + verbal cues required throughout session', 'Physical + verbal cues', 'Hands-on guidance combined with verbal prompts']
                  ].map(([val, label, sub]) => (
                    <label key={val} className={`radio-opt ${cueingLevel === val ? 'selected' : ''}`} onClick={() => setCueingLevel(val)}>
                      <div className="radio-dot"></div>
                      <div><div className="radio-text">{label}</div><div className="radio-sub">{sub}</div></div>
                    </label>
                  ))}
                </div>

                <div className="divider"></div>

                <label className="field-label">Caregiver Report</label>
                <div className="radio-group">
                  {[
                    ['Parent reports consistent home practice with target sounds', 'Parent reports consistent home practice', 'Target skills practiced regularly at home'],
                    ['Parent reports improvement noticed in natural settings', 'Parent reports improvement noticed at home', 'Generalization to natural environment observed'],
                    ['Parent reports limited home practice this week', 'Limited home practice this week', 'Practice schedule not consistently followed'],
                    ['No caregiver present — report not available', 'No caregiver present — report not available', 'Caregiver update not obtained this session']
                  ].map(([val, label, sub]) => (
                    <label key={val} className={`radio-opt ${caregiverReport === val ? 'selected' : ''}`} onClick={() => setCaregiverReport(val)}>
                      <div className="radio-dot"></div>
                      <div><div className="radio-text">{label}</div><div className="radio-sub">{sub}</div></div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="nav-bar">
                <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>Next: Treatment Plan & Output Type →</button>
              </div>
            </div>
          )}

          {/* STEP 4: Plan & Output Selection */}
          {step === 4 && (
            <div className="form-section visible">
              <div className="section-card">
                <div className="section-title-bar"><span className="step-badge">4</span><h2>Treatment Plan & Output Selection</h2></div>

                <label className="field-label">Next Session Focus</label>
                <div className="radio-group">
                  {[
                    ['Continue word-level targets at current complexity', 'Continue current level', 'Maintain focus at same complexity'],
                    ['Increase accuracy target with reduced cueing support', 'Increase accuracy target', 'Raise expectations, reduce support'],
                    ['Advance to phrase-level production tasks', 'Advance to phrase level', 'Target sounds in phrase contexts'],
                    ['Advance to sentence-level production in structured tasks', 'Advance to sentence level', 'Target sounds in sentence contexts'],
                    ['Generalize skills to conversational speech contexts', 'Generalize to conversation', 'Natural speech in unstructured contexts']
                  ].map(([val, label, sub]) => (
                    <label key={val} className={`radio-opt ${nextFocus === val ? 'selected' : ''}`} onClick={() => setNextFocus(val)}>
                      <div className="radio-dot"></div>
                      <div><div className="radio-text">{label}</div><div className="radio-sub">{sub}</div></div>
                    </label>
                  ))}
                </div>

                <div className="divider"></div>

                <label className="field-label">Home Practice Assignment</label>
                <div className="radio-group">
                  {[
                    ['Practice target word list for 10 minutes daily', 'Word list practice — 10 min daily', 'Review provided word cards at home'],
                    ['Read aloud for 10 minutes daily using easy onset technique', 'Read aloud practice — 10 min daily', 'Oral reading with fluency strategies'],
                    ['Review vocabulary flashcard set 5 minutes daily', 'Vocabulary flashcards — 5 min daily', 'Name each picture card twice'],
                    ['No home practice assigned this session', 'No home practice this session', 'Rest week or parent unavailable']
                  ].map(([val, label, sub]) => (
                    <label key={val} className={`radio-opt ${homePractice === val ? 'selected' : ''}`} onClick={() => setHomePractice(val)}>
                      <div className="radio-dot"></div>
                      <div><div className="radio-text">{label}</div><div className="radio-sub">{sub}</div></div>
                    </label>
                  ))}
                </div>
                
                <div className="divider"></div>

                <label className="field-label">Choose AI Documentation Type</label>
                <div className="endpoint-grid">
                  {[
                    ['generate-soap', '📋', 'SOAP Note Only', 'Clinical documentation'],
                    ['recommend-goals', '🎯', 'Goal Recommendations', 'SMART goal suggestions']
                  ].map(([ep, icon, title, desc]) => (
                    <div key={ep} className={`ep-card ${endpoint === ep ? 'selected' : ''}`} onClick={() => setEndpoint(ep)}>
                      <div className="ep-icon">{icon}</div>
                      <div className="ep-name">{title}</div>
                      <div className="ep-desc">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="nav-bar">
                <button className="btn btn-secondary" onClick={() => setStep(3)}>← Back</button>
                <button className="btn btn-success" onClick={handleGenerateAI}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/></svg>
                  Generate {endpoint === 'generate-soap' ? 'SOAP Note' : 'Goal Recommendations'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Results */}
          {step === 5 && (
            <div className="form-section visible">
              <div className="result-panel visible">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Generated {endpoint === 'generate-soap' ? 'SOAP Note' : 'Goal Recommendations'}</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={copyNote}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                      Copy Output
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                      Finish & Exit
                    </button>
                  </div>
                </div>

                <div className="result-tabs">
                  <button className={`result-tab ${activeTab === 'output' ? 'active' : ''}`} onClick={() => setActiveTab('output')}>Output</button>
                  <button className={`result-tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>Raw JSON</button>
                </div>

                {activeTab === 'output' && endpoint === 'generate-soap' && (
                  <div>
                    <div className="soap-grid">
                      <div className="soap-section s"><div className="soap-section-label">S — Subjective</div><textarea className="soap-text" value={soapData.s} onChange={e => setSoapData({ ...soapData, s: e.target.value })} placeholder="Generating..."></textarea></div>
                      <div className="soap-section o"><div className="soap-section-label">O — Objective</div><textarea className="soap-text" value={soapData.o} onChange={e => setSoapData({ ...soapData, o: e.target.value })} placeholder="Generating..."></textarea></div>
                      <div className="soap-section a"><div className="soap-section-label">A — Assessment</div><textarea className="soap-text" value={soapData.a} onChange={e => setSoapData({ ...soapData, a: e.target.value })} placeholder="Generating..."></textarea></div>
                      <div className="soap-section p"><div className="soap-section-label">P — Plan</div><textarea className="soap-text" value={soapData.p} onChange={e => setSoapData({ ...soapData, p: e.target.value })} placeholder="Generating..."></textarea></div>
                    </div>
                  </div>
                )}

                {activeTab === 'output' && endpoint === 'recommend-goals' && (
                  <div dangerouslySetInnerHTML={{ __html: goalsHtml }}></div>
                )}

                {activeTab === 'json' && (
                  <div style={{ background: '#0D1117', borderRadius: 'var(--r)', padding: '20px' }}>
                    <pre style={{ fontFamily: "'Fira Code',monospace", fontSize: '11px', color: '#7EE787', lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                      {rawJson}
                    </pre>
                  </div>
                )}
              </div>

              <div className="nav-bar">
                <button className="btn btn-secondary" onClick={() => setStep(4)}>← Back to Form</button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={() => { setEndpoint(endpoint === 'generate-soap' ? 'recommend-goals' : 'generate-soap'); setStep(4); }}>
                    Switch to {endpoint === 'generate-soap' ? 'Goal Recommendations' : 'SOAP Note'}
                  </button>
                  <button className="btn btn-primary" onClick={handleGenerateAI}>
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
