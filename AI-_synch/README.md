# 🧠 SpeechSync AI Service

> **AI-powered clinical intelligence layer for Speech Language Pathology documentation.**  
> Built for the SpeechSync hackathon — converts raw session data and video transcripts into professional SOAP notes and SMART therapy goals using Groq's LLaMA 3.3 70B model.

---

## 📋 Table of Contents

- [What Is This?](#-what-is-this)
- [Why It Exists](#-why-it-exists)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [The Two Body Types](#-the-two-body-types)
- [All 5 API Endpoints](#-all-5-api-endpoints)
  - [/generate-soap](#1-generate-soap)
  - [/recommend-goals](#2-recommend-goals)
  - [/analyze-session](#3-analyze-session)
  - [/extract-session](#4-extract-session)
  - [/transcript-to-soap](#5-transcript-to-soap)
- [Complete Body References](#-complete-body-references)
- [Response Reference](#-response-reference)
- [Setup & Running](#-setup--running)
- [Environment Variables](#-environment-variables)
- [Endpoint Decision Guide](#-endpoint-decision-guide)
- [Clinical Output Quality](#-clinical-output-quality)
- [Team Integration Guide](#-team-integration-guide)
- [Error Reference](#-error-reference)

---

## 🏥 What Is This?

SpeechSync AI Service is a **standalone Python/Flask microservice** that provides two core AI capabilities to the SpeechSync clinical platform:

| Capability | What it does |
|---|---|
| **SOAP Note Generation** | Converts structured session data into professional 4-section clinical notes |
| **Goal Recommendation** | Analyzes patient performance and recommends clinically appropriate SMART therapy goals |

This service has **no frontend and no database**. It is purely an AI API layer. The frontend and database are handled by separate teammates. This service exposes HTTP endpoints that any frontend or backend can call.

---

## 💡 Why It Exists

A Speech Language Pathologist sees **8–10 patients per day**. After every session, they must write a SOAP note — a structured clinical report. Writing this manually takes **15–20 minutes per patient**. That is up to **3 hours of documentation per day**.

SpeechSync AI Service automates this. A therapist fills a quick form (or the video call is transcribed automatically), clicks Generate, and receives a complete professional SOAP note in **under 5 seconds**.

**Without this service:**
```
Session ends at 3:00 PM
Therapist writes SOAP note manually
Done at 3:18 PM  ← 18 minutes wasted
```

**With this service:**
```
Session ends at 3:00 PM
Therapist clicks Generate
Done at 3:01 PM  ← 17 minutes saved per patient
```

---



---

## 📁 Project Structure

```
speechsync/
│
├── app.py                          ← Flask entry point, all routes registered here
├── .env                            ← API keys (never commit this file)
├── requirements.txt                ← All Python dependencies
├── README.md                       ← This file
│
└── app/
    ├── __init__.py
    │
    ├── routes/                     ← HTTP endpoint definitions
    │   ├── __init__.py
    │   ├── soap.py                 ← /generate-soap route
    │   ├── goals.py                ← /recommend-goals route
    │   ├── analyze.py              ← /analyze-session route
    │   └── extract.py              ← /extract-session and /transcript-to-soap routes
    │
    ├── services/                   ← Business logic, Groq API calls
    │   ├── __init__.py
    │   ├── groq_service.py         ← SOAP generation logic
    │   ├── goal_service.py         ← Goal recommendation logic
    │   └── extract_service.py      ← Transcript extraction + normalization
    │
    ├── prompts/                    ← All AI prompt engineering
    │   ├── __init__.py
    │   ├── soap_prompt.py          ← SOAP system prompt + user prompt builder
    │   ├── goal_prompt.py          ← Goal recommendation system prompt + builder
    │   └── extract_prompt.py       ← Transcript extraction system prompt + builder
    │
    ├── validators/                 ← Input validation
    │   ├── __init__.py
    │   └── session_validator.py    ← Validates incoming request bodies
    │
    └── utils/                      ← Shared utilities
        ├── __init__.py
        └── json_parser.py          ← Safe JSON parsing, key validation
```

---

## 📦 The Two Body Types

> **This is the most important concept. Read carefully.**

There are only **2 body formats** in this entire system. Every endpoint uses one of them.

---

### 🟢 Body Type A — Structured JSON
**Used when:** Therapist fills a manual form on the frontend  
**Used by:** `/generate-soap`, `/recommend-goals`, `/analyze-session`

```json
{
  "patient": {
    "name": "Aanya Sharma",
    "age": 8,
    "diagnosis": [
      "F80.0 Phonological Disorder",
      "F80.1 Expressive Language Disorder"
    ]
  },
  "session": {
    "type": "Individual Therapy",
    "duration": 45,
    "frequency": "2x per week",
    "session_number": 8
  },
  "clinician_notes": {
    "behavior": "cooperative and attentive",
    "cueing_level": "moderate verbal cues",
    "patient_response": "required repetition for novel words",
    "caregiver_report": "parent reports increased use of target sounds at home"
  },
  "goals": [
    {
      "description": "Produce /r/ in word initial position with 80% accuracy",
      "previous_accuracy": 65,
      "target_accuracy": 80,
      "status": "in progress"
    }
  ],
  "exercises": [
    {
      "activity": "R articulation drill",
      "accuracy": 78,
      "previous_accuracy": 65,
      "trials": 50,
      "cueing": "moderate verbal cueing",
      "target_accuracy": 80
    },
    {
      "activity": "Picture naming",
      "accuracy": 85,
      "previous_accuracy": 70,
      "trials": 40,
      "cueing": "minimal cueing",
      "target_accuracy": 80
    }
  ],
  "plan_details": {
    "next_session_focus": "generalize /r/ to phrase level",
    "home_practice": "practice /r/ word list 10 minutes daily",
    "frequency": "2x per week"
  },
  "assessment": {
    "test": "GFTA-3",
    "standardScore": 75,
    "severity": "Moderate Impairment",
    "percentile": 12
  },
  "currentPerformance": {
    "r_sound_accuracy": 78,
    "expressive_vocabulary_accuracy": 85
  },
  "existingGoals": [
    {
      "goal": "Produce /r/ in word initial position with 80% accuracy",
      "current": 78,
      "target": 80,
      "status": "In Progress"
    },
    {
      "goal": "Increase expressive vocabulary to 80% accuracy",
      "current": 85,
      "target": 80,
      "status": "Achieved"
    }
  ],
  "sessionHistory": [
    { "session": 1, "activity": "R articulation drill", "accuracy": 65 },
    { "session": 2, "activity": "R articulation drill", "accuracy": 70 },
    { "session": 3, "activity": "R articulation drill", "accuracy": 74 },
    { "session": 4, "activity": "R articulation drill", "accuracy": 78 }
  ]
}
```

---

### 🟣 Body Type B — Transcript
**Used when:** Azure Speech API converts video call audio to text  
**Used by:** `/extract-session`, `/transcript-to-soap`

```json
{
  "transcript": "Therapist: Good morning Aanya. How are you today?\nPatient: Good!\nTherapist: Mom, any updates from home?\nParent: She has been practicing her R sounds every night for 10 minutes.\nTherapist: Wonderful. Today is session 5. Last session you got 65%. Let us do 50 trials today. Our goal is 80% accuracy.\nPatient: I will try!\nTherapist: Say rabbit.\nPatient: Wabbit.\nTherapist: Good try. Watch me. Rrrrabbit.\nPatient: Rrrrabbit!\nTherapist: We completed 50 trials. Aanya got 39 out of 50, that is 78% accuracy. I used moderate verbal cues throughout. Next session we move to phrase level. Practice the R word list 10 minutes daily.",
  "patientInfo": {
    "name": "Aanya Sharma",
    "age": 8,
    "diagnosis": [
      "F80.0 Phonological Disorder",
      "F80.1 Expressive Language Disorder"
    ]
  }
}
```

> **Note:** `patientInfo` is optional but recommended. It helps the AI fill gaps the transcript does not mention (like diagnosis codes).

---

## 🔌 All 5 API Endpoints

### 1. `/generate-soap`

| Property | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:8001/api/ai/generate-soap` |
| **Body** | Body Type A (Structured JSON) |
| **Returns** | SOAP note only |
| **Use case** | Therapist filled the session form manually and needs only the clinical note |

**Returns:**
```json
{
  "status": "success",
  "data": {
    "subjective": "Parent reported increased use of target sounds at home...",
    "objective": "Patient produced /r/ in word-initial position with 78% accuracy across 50 structured trials with moderate verbal cueing...",
    "assessment": "Patient demonstrates measurable progress, improving from 65% to 78% accuracy (13 point gain)...",
    "plan": "Continue therapy 2x per week. Next session focus on phrase-level /r/ production...",
    "clinicalSummary": "Patient continues to make steady progress toward articulation targets.",
    "goalProgress": [
      {
        "goal": "Produce /r/ in word initial position with 80% accuracy",
        "previous": 65,
        "current": 78,
        "target": 80,
        "improvement": 13,
        "cueing": "moderate verbal cues"
      }
    ],
    "goalPrediction": [
      {
        "goal": "Produce /r/ in word initial position with 80% accuracy",
        "current": 78,
        "target": 80,
        "gap": 2,
        "status": "Likely to achieve within 1-2 sessions"
      }
    ]
  }
}
```

---

### 2. `/recommend-goals`

| Property | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:8001/api/ai/recommend-goals` |
| **Body** | Body Type A (Structured JSON) |
| **Returns** | Goal recommendations only |
| **Use case** | Need to generate or update therapy goals for a patient |

**Returns:**
```json
{
  "status": "success",
  "data": {
    "clinicalSummary": "Patient demonstrates consistent improvement in articulation...",
    "recommendedGoals": [
      {
        "domain": "Articulation",
        "goalType": "Progression",
        "goal": "Produce /r/ in word-initial position with 85% accuracy across 3 consecutive sessions",
        "baseline": 78,
        "target": 85,
        "targetDate": "4-6 weeks",
        "priority": "High",
        "reason": "Current accuracy is 78%, close to target. Progression goal warranted."
      }
    ],
    "goalAdvancements": [
      {
        "previousGoal": "Increase expressive vocabulary to 80% accuracy",
        "newGoal": "Use target vocabulary in 3-4 word phrases with 80% accuracy",
        "reason": "Current 85% exceeds 80% target. Ready to advance to phrase level."
      }
    ],
    "completedGoals": [
      {
        "goal": "Increase expressive vocabulary to 80% accuracy",
        "achievedAccuracy": 85,
        "note": "Goal exceeded by 5%. Ready for advancement."
      }
    ],
    "riskFlags": [
      {
        "type": "Plateau Risk",
        "message": "Less than 5% gain over last 2 sessions in /r/ production."
      }
    ],
    "nextFocusAreas": [
      {
        "area": "Phrase-level /r/ articulation",
        "reason": "Word-level target nearly achieved. Clinical progression moves to phrase contexts."
      }
    ]
  }
}
```

---

### 3. `/analyze-session`

| Property | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:8001/api/ai/analyze-session` |
| **Body** | Body Type A (Structured JSON) |
| **Returns** | SOAP note + Goal recommendations together |
| **Use case** | Manual form submission, want everything in one request |

**Returns:**
```json
{
  "status": "success",
  "data": {
    "soapNote": { ... },
    "goalRecommendations": { ... }
  },
  "errors": null
}
```

---

### 4. `/extract-session`

| Property | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:8001/api/ai/extract-session` |
| **Body** | Body Type B (Transcript) |
| **Returns** | Structured JSON body (Body Type A) |
| **Use case** | Want to see extracted data before sending to AI, or need Body A from a transcript |

**Flow:**
```
Body Type B (transcript) → /extract-session → Body Type A (structured JSON)
```

Then use that Body A with any of routes 1, 2, or 3.

**Returns:** Body Type A (the complete structured JSON shown above)

---

### 5. `/transcript-to-soap`

| Property | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:8001/api/ai/transcript-to-soap` |
| **Body** | Body Type B (Transcript) |
| **Returns** | extractedBody + soapNote + goalRecommendations + masterInsight |
| **Use case** | ⭐ VIDEO CALL USE CASE — does everything automatically |

**This is the most powerful endpoint.** It runs all 3 steps internally:
1. Extracts structured JSON from the transcript
2. Generates the SOAP note
3. Generates goal recommendations

**Flow:**
```
Video call ends
      ↓
Azure converts audio → transcript text
      ↓
POST /transcript-to-soap  { "transcript": "..." }
      ↓ (internal steps, automatic)
Extract structured body
      ↓
Generate SOAP note
      ↓
Generate goal recommendations
      ↓
Return everything
```

**Returns:**
```json
{
  "status": "success",
  "data": {
    "masterInsight": "One clean clinical headline for the dashboard.",
    "extractedBody": { ... },
    "soapNote": { ... },
    "goalRecommendations": { ... }
  },
  "errors": null
}
```

---

## 🗺 Endpoint Decision Guide

```
What do you have?
│
├── A transcript (from Azure / video call)
│   │
│   ├── Want SOAP + Goals + everything?
│   │   └── POST /transcript-to-soap  ✅ (recommended)
│   │
│   └── Want to see extracted JSON first?
│       └── POST /extract-session
│           Then use the returned JSON with routes below
│
└── A structured JSON body (from manual form)
    │
    ├── Want SOAP note only?
    │   └── POST /generate-soap
    │
    ├── Want Goal recommendations only?
    │   └── POST /recommend-goals
    │
    └── Want SOAP + Goals together?
        └── POST /analyze-session  ✅ (recommended for manual)
```

---

## ⚙️ Setup & Running

### Prerequisites

- Python 3.8 or higher
- A free Groq API key from [console.groq.com](https://console.groq.com)

### Step 1 — Clone and navigate

```bash
cd D:\Project\speechsync
```

### Step 2 — Create virtual environment

```bash
python -m venv myenv

# Activate on Windows
myenv\Scripts\activate

# Activate on Mac/Linux
source myenv/bin/activate
```

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

`requirements.txt` contents:
```
flask
flask-cors
groq
python-dotenv
pydantic
```

### Step 4 — Set up environment variables

Create a `.env` file in the project root:

```
GROQ_API_KEY=gsk_your_actual_key_here
```

Get your key from [console.groq.com](https://console.groq.com) → API Keys → Create API Key.

### Step 5 — Run the service

```bash
python app.py
```

Expected output:
```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:8001
 * Press CTRL+C to quit
```

### Step 6 — Verify it works

Open browser and go to:
```
http://127.0.0.1:8001/
```

You should see:
```json
{
  "status": "SpeechSync AI Service running",
  "endpoints": {
    "soap_only": "POST /api/ai/generate-soap",
    "goals_only": "POST /api/ai/recommend-goals",
    "unified": "POST /api/ai/analyze-session",
    "extract_only": "POST /api/ai/extract-session",
    "transcript_full": "POST /api/ai/transcript-to-soap"
  }
}
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Your Groq API key from console.groq.com |

> ⚠️ **Never commit `.env` to Git.** It is already in `.gitignore`.  
> Each teammate must create their own `.env` file with their own key.

---

## 📊 Clinical Output Quality

### SOAP Note — What Each Section Contains

| Section | Contains | Example |
|---|---|---|
| **Subjective** | Only what caregiver/patient explicitly reported | "Parent reports increased use of target sounds at home" |
| **Objective** | Exact numbers, trial counts, cueing levels | "78% accuracy across 50 trials with moderate verbal cueing" |
| **Assessment** | Progress comparison, cueing impact, recommendation | "Improved from 65% to 78% (13 point gain). Continued intervention warranted." |
| **Plan** | Only clinician-provided next steps | "Continue 2x/week. Focus: phrase-level /r/. Home: word list 10 min daily." |

### Goal Recommendation Logic

| Current Accuracy | Goal Type Generated | Example |
|---|---|---|
| Below 50% | Foundational | "Produce /r/ in isolation with 60% accuracy" |
| 50% – 79% | Progression | "Produce /r/ at word level with 80% accuracy" |
| 80% – 89% | Advancement | "Produce /r/ at phrase level with 80% accuracy" |
| 90%+ | Generalization | "Produce /r/ in conversational speech with 90% accuracy" |

### Risk Flags

| Flag | Triggers When |
|---|---|
| `Plateau Risk` | Less than 5% gain over 3+ consecutive sessions |
| `Regression Risk` | Current accuracy lower than previous session |
| `Goal Achieved` | Current accuracy meets or exceeds target |

### Goal Prediction Logic

| Gap to Target | Status |
|---|---|
| ≤ 2% | Likely to achieve within 1–2 sessions |
| ≤ 5% | Likely to achieve within 3–5 sessions |
| ≤ 10% | Progressing steadily, estimated 6–10 sessions |
| > 10% | Requires continued intervention, reassess in 30 days |
| Current ≥ Target | Goal achieved — consider advancing |

---

## 👥 Team Integration Guide

### For Frontend Teammates (React)

Call the API from your React component:

```javascript
// VIDEO CALL USE CASE — transcript from Azure
const response = await fetch('http://ONKAR_IP:8001/api/ai/transcript-to-soap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcript: azureTranscriptText,
    patientInfo: {
      name: patient.name,
      age: patient.age,
      diagnosis: patient.diagnosis
    }
  })
});

const result = await response.json();
const soapNote = result.data.soapNote;
const goals    = result.data.goalRecommendations;
const headline = result.data.masterInsight;
```

```javascript
// MANUAL FORM USE CASE — therapist fills the form
const response = await fetch('http://ONKAR_IP:8001/api/ai/analyze-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(structuredFormData)  // Body Type A
});
```

### For Backend Teammates (Python)

```python
import requests

# Video call use case
response = requests.post(
    'http://localhost:8001/api/ai/transcript-to-soap',
    json={
        'transcript': azure_transcript_text,
        'patientInfo': patient_dict
    }
)
result = response.json()
soap_note = result['data']['soapNote']
goals     = result['data']['goalRecommendations']
```

### Making the Service Accessible on Local Network

By default the service runs on `127.0.0.1` (your laptop only).  
To allow teammates on the same WiFi to access it:

```python
# app.py — last line
app.run(debug=True, port=8001, host="0.0.0.0")
```

Find your IP:
```bash
ipconfig   # Windows
ifconfig   # Mac/Linux
```

Then teammates use:
```
http://192.168.X.X:8001/api/ai/...
```

---

## ❌ Error Reference

| HTTP Status | Meaning | Fix |
|---|---|---|
| `200 OK` | ✅ Success | — |
| `400 Bad Request` | Missing required field | Check body has all required keys |
| `422 Unprocessable` | AI returned invalid JSON | Retry — rare Groq model issue |
| `500 Internal Server Error` | Flask code error | Check terminal for Python traceback |
| `Connection refused` | Flask server not running | Run `python app.py` |

### Common mistakes

**Wrong body sent to endpoint:**
```
❌ Sending Body Type B (transcript) to /generate-soap
✅ Body Type B only goes to /extract-session or /transcript-to-soap
```

**Accuracy as decimals:**
```
❌ "accuracy": 0.78
✅ "accuracy": 78
```

**Missing diagnosis in patient:**
```
❌ "patient": { "name": "Aanya", "age": 8 }
✅ "patient": { "name": "Aanya", "age": 8, "diagnosis": ["F80.0 ..."] }
```

---

## 🤖 AI Model Details

| Property | Value |
|---|---|
| **Provider** | Groq Cloud |
| **Model** | `llama-3.3-70b-versatile` |
| **Temperature** | 0.1 – 0.3 (low = consistent clinical output) |
| **Response format** | Forced JSON mode |
| **Average response time** | 3–8 seconds |
| **Hallucination prevention** | Prompt-level rules: "never invent data not provided" |

---

## 📝 Built By

| Role | Responsibility |
|---|---|
| **Onkar Korale** | AI Service — all 5 endpoints, prompt engineering, Groq integration, transcript extraction |
| **Teammates** | Frontend (React), Backend, Database (MongoDB), Azure Speech API integration |

---

*SpeechSync AI Service — Hackathon Build 2026*#   T e m p e r o r y - r e p o 
 
 #   A I - _ s y n c h  
 #   A I _ S Y N C  
 