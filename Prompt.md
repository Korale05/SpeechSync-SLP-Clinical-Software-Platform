# 🧠 AI Coding Prompt — SpeechSync: SLP Clinical Software Platform
### AGTechathon 2.0 2k26 | A.G. Patil Institute of Technology, Solapur

> Paste this entire prompt into Cursor, Windsurf, Antigravity, or any AI coding agent.

---

## ROLE & MISSION

You are a senior full-stack engineer and UX architect. Your mission is to build **SpeechSync** — a purpose-built, production-grade web application for Speech-Language Pathology (SLP) clinics. This is a hackathon MVP, so prioritize working, demonstrable features over backend completeness. Use mock data where needed, but the UI must feel real and clinical.

---

## TECH STACK

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (utility-first) + shadcn/ui component library
- **Routing**: React Router v6
- **State Management**: Zustand (lightweight global state)
- **Charts**: Recharts (progress dashboards)
- **Forms**: React Hook Form + Zod (validation)
- **Icons**: Lucide React
- **Animations**: Framer Motion (page transitions, micro-interactions)
- **Video/Teletherapy**: Daily.co embedded SDK (or mock iframe if API unavailable)

### Backend (scaffold only for demo)
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL with Prisma ORM (schema provided below)
- **Auth**: JWT + bcrypt (role-based)
- **File Storage**: AWS S3 (mock with local uploads for demo)
- **AI Integration**: Groq API with `llama-3.3-70b-versatile` model (for AI scribe — extremely fast inference, free tier available)
- **Speech API**: Azure Cognitive Services – Pronunciation Assessment API (mock JSON if key unavailable)

### DevOps
- **Environment**: `.env` file for all secrets
- **Package Manager**: npm or pnpm
- **Folder Structure**: Monorepo with `/client` (React) and `/server` (Express)

---

## DESIGN DIRECTION

**Aesthetic**: Clean medical-tech precision — not cold or sterile, but warm, trustworthy, and efficient. Think "Figma meets a children's hospital."

- **Primary Color**: `#2563EB` (clinical blue)
- **Accent**: `#10B981` (success green for goal completion)
- **Warning**: `#F59E0B` (amber for alerts/thresholds)
- **Background**: `#F8FAFC` (soft off-white), cards on `#FFFFFF`
- **Font**: `DM Sans` (body) + `Sora` (headings) — import from Google Fonts
- **Sidebar**: Dark navy `#0F172A` with white text and color-coded role badges
- **Micro-interactions**: Smooth 200ms transitions on all hover states, subtle card shadows on hover

The UI must feel like a real clinical product — not a toy. Every screen should be immediately understandable to a non-technical speech therapist.

---

## APPLICATION ARCHITECTURE

### Role-Based Access Control (RBAC)

Implement 4 user roles. Each role sees a different sidebar and different screens:

| Role | Dashboard | Key Screens |
|---|---|---|
| `SLP` (Clinician) | Today's sessions, pending notes | Assessment, SOAP Note, Teletherapy, Goals |
| `ADMIN` | Revenue, appointments, denials | Billing, Scheduling, Reports, Audit Logs |
| `PARENT` | Child's progress, home exercises | Portal, Progress Chart, Appointment View |
| `SCHOOL_COORDINATOR` | IEP tracking, bulk screening | IEP Module, Student List, Progress Summaries |

**Demo Login Credentials** (hardcoded for hackathon):
```
SLP:       slp@speechsync.in     / password: slp123
Admin:     admin@speechsync.in   / password: admin123
Parent:    parent@speechsync.in  / password: parent123
School:    school@speechsync.in  / password: school123
```

---

## SCREENS TO BUILD (Priority Order)

### 1. 🔐 Auth Screen — `/login`
- Clean split layout: left side has animated waveform SVG (speech soundwave) + tagline "Clinical clarity for every voice."
- Right side: role-selector tabs (SLP / Admin / Parent / School), email + password fields
- On submit: set role in Zustand store, redirect to respective dashboard
- Show a "Demo Login" button that auto-fills credentials

---

### 2. 🏠 SLP Dashboard — `/dashboard`

**Layout**: Fixed left sidebar (dark navy) + main content area

**Sidebar items** (with Lucide icons):
- Dashboard (Home icon)
- Patients (Users icon)
- Assessments (ClipboardList icon)
- Sessions & SOAP Notes (FileText icon)
- Teletherapy (Video icon)
- Goals & Progress (TrendingUp icon)
- Billing (CreditCard icon) — visible to ADMIN only
- Settings (Settings icon)

**Main dashboard cards** (use Recharts + shadcn Card):
- "Today's Appointments" — list of 4–5 mock patients with time slots + colored status badges (Scheduled / In Progress / Completed)
- "Pending SOAP Notes" — count badge with red alert (3 overdue)
- "Goal Attainment This Week" — donut chart (e.g., 68% goals met)
- "Insurance Alerts" — amber banner: "Patient Aanya Sharma approaching $2,480 Medicare threshold. KX modifier required."
- "Quick Actions" bar: [+ New Patient] [Start Teletherapy] [New Assessment] [Generate Report]

---

### 3. 👤 Patient Profile — `/patients/:id`

**Tabs across the top**:
1. **Overview** — Demographics, insurance info, assigned SLP, primary ICD-10 diagnoses (e.g., F80.0 Phonological Disorder)
2. **Assessment History** — Table of past tests (GFTA-3, CELF-5) with date, standard score, percentile, and qualitative label
3. **Goals** — SMART goals list with progress bars (% attained), target dates, and status badges
4. **Sessions** — Chronological SOAP note history, expandable rows
5. **Documents** — Intake forms, consent forms, progress reports (mock PDF links)

**Sample Mock Patient**:
```json
{
  "patientId": "P001",
  "name": "Aanya Sharma",
  "dob": "2018-03-12",
  "age": "8 years",
  "guardian": "Priya Sharma (Mother) — +91 98765 43210",
  "insurance": "Star Health Insurance — Policy #SH2024XYZ",
  "diagnoses": ["F80.0 — Phonological Disorder", "F80.1 — Expressive Language Disorder"],
  "assignedSLP": "Dr. Meera Kulkarni, M.S. CCC-SLP"
}
```

---

### 4. 📋 Digital Assessment Module — `/assessments/new`

Build two digitized assessment tools:

#### 4A. GFTA-3 (Goldman-Fristoe Test of Articulation, 3rd Ed.)

**Step 1 — Patient selection + subtest chooser**
- Dropdown to select patient
- Radio buttons: "Sounds-in-Words" (47 stimuli, ~12 min) | "Sounds-in-Sentences" (~4 min) | "Stimulability"

**Step 2 — Administration Interface**
- Left panel: Large stimulus image (use placeholder images with word labels like "BALL", "CAKE", "SHIP")
- Right panel: Scoring matrix with 3 columns — **Initial / Medial / Final** position
- For each phoneme row, show 3 dropdown selectors: `Correct ✓ | Substitution | Omission | Distortion`
- "Distortion" opens a diacritic notation helper popup
- Timer displayed at top-right (counts up from 0:00)
- Navigation: [← Previous] [Next →] [Skip] buttons
- Progress bar showing "Item 12 of 47"

**Step 3 — Automated Scoring Engine**
On "Calculate Scores" button click, run this JavaScript logic:
```javascript
function calculateGFTA3Score(rawScore, age, gender) {
  // Simplified normative lookup (embed actual table as JSON)
  const normativeTable = {
    "8:0-8:11": { mean: 100, sd: 15, rawToSS: { /* mapping */ } }
  };
  const standardScore = lookupSS(rawScore, age);
  const percentile = ssToPercentile(standardScore);
  const severity = classifySeverity(standardScore);
  return { standardScore, percentile, severity, confidenceInterval: [standardScore - 5, standardScore + 5] };
}

function classifySeverity(ss) {
  if (ss >= 115) return { label: "Above Average", color: "green" };
  if (ss >= 86)  return { label: "Within Normal Range", color: "blue" };
  if (ss >= 78)  return { label: "Borderline / Mild Impairment", color: "yellow" };
  if (ss >= 71)  return { label: "Moderate Impairment", color: "orange" };
  return { label: "Severe Impairment", color: "red" };
}
```

**Step 4 — Results Report Card**
Display a clean results card:
- Standard Score: large number with color badge
- Percentile Rank: "15th Percentile"
- Severity: colored badge (e.g., 🟠 Moderate Impairment)
- Confidence Interval: "80–90 (90% CI)"
- Error Summary Table: phoneme | position | error type
- Buttons: [Save to Patient Record] [Generate PDF Report] [Link to Goal]

#### 4B. CELF-5 Mini (Simplified for Demo)

Show a 6-subtest version:
- Sentence Comprehension
- Word Structure
- Following Directions
- Formulated Sentences
- Recalling Sentences
- Word Classes

For each subtest: display 3–5 sample items, record raw score (0–10 slider), auto-calculate scaled score.

Display composite scores:
- **Core Language Score** (mean 100, SD 15)
- **Receptive Language Index**
- **Expressive Language Index**

Show reliability indicators: "Internal Consistency: Excellent (0.95)"

---

### 5. 📝 SOAP Note Editor — `/sessions/new`

**Layout**: Two-column — left (patient context + session controls), right (SOAP editor)

**Left panel**:
- Patient name + today's date
- Session type selector: Individual (92507) | Group (92508) | Evaluation (92522/92523)
- Duration picker (15 / 30 / 45 / 60 min)
- CPT code auto-suggestion based on session type
- ICD-10 code field (searchable dropdown)

**Right panel — SOAP Note Editor**:
Each section is an expandable card with a rich text area and domain-specific helper chips:

```
[S — SUBJECTIVE]
Placeholder: "Parent/patient reports..."
Helper chips: [Parent reports improvement] [Patient motivated] [Fatigue noted] [Home practice completed]

[O — OBJECTIVE]  
Placeholder: "Clinician observations, data collected..."
Domain sub-sections: [Phonology] [Fluency] [Voice] [Language] [AAC] [Swallowing]
Auto-fill from today's assessment: "Articulation: 80% correct on /r/ in words (GFTA-3)"

[A — ASSESSMENT]
Placeholder: "Clinical interpretation of progress..."
Goal linkage: dropdown to select which goals were addressed

[P — PLAN]
Placeholder: "Next steps, changes to treatment..."
Home Exercise Program builder: [+ Add Exercise] with library picker
```

**AI Scribe Button** (top-right of editor):
- Button: "✨ AI Scribe — Draft Note"
- On click: Send the session metadata + exercise results to Claude API
- System prompt: `"You are a clinical documentation assistant for speech-language pathology. Generate a concise, professional SOAP note using ASHA documentation standards based on the following session data. Use objective language."`
- Stream the response into the SOAP fields
- Show "AI Draft — Review before saving" warning banner

**Bottom bar**: [Save Draft] [Submit for Co-sign] [Sign & Lock Note]

---

### 6. 📹 Teletherapy Room — `/teletherapy/:sessionId`

**Layout**: Full-screen split

**Left (70%) — Video Area**:
- Embed Daily.co room (or a mock video iframe with two camera placeholders)
- Patient video (large) + SLP video (picture-in-picture bottom-right)
- Control bar: [🎤 Mute] [📷 Camera] [🖥 Share Screen] [⏺ Record] [📞 End Call]
- Session timer (top center): "Session: 12:34"

**Right (30%) — Clinical Panel**:
- Tabbed panel:
  - **Stimuli**: Grid of stimulus cards (images + audio play button) — SLP clicks to show on patient's screen
  - **Exercises**: Checklist of today's planned exercises with [✓ Correct] [✗ Incorrect] buttons — records attempts in real time
  - **Notes**: Mini SOAP quick-notes field
  - **Whiteboard**: Canvas drawing tool (simple HTML5 canvas with pen/erase)

**Post-session**: Auto-prompt to complete SOAP note with pre-filled objective data from the session checklist.

**HIPAA Banner**: "🔒 This session is encrypted end-to-end (SRTP). No data is stored without patient consent."

---

### 7. 🎯 Goals & Progress — `/patients/:id/goals`

**Goal Creation Form**:
```
Goal Type: [Short-Term] [Long-Term]
Domain: [Articulation] [Language] [Fluency] [Voice] [AAC] [Swallowing]
SMART Goal Text: "Aanya will produce /r/ in word-initial position with 80% accuracy in 3/4 trials by June 2026."
Baseline: 25% | Target: 80% | Current: 62%
Linked CPT: 92507 | Linked ICD-10: F80.0
```

**Progress Visualization** (Recharts):
- Line chart: X-axis = session dates, Y-axis = % accuracy, horizontal dashed line = target (80%)
- Color: below target = amber line, above target = green line
- Data points are clickable (shows SOAP note snippet for that session)
- Goal status badge: 🟡 In Progress | 🟢 Met | 🔴 Not Met | ⏸ On Hold

---

### 8. 💰 Billing Dashboard — `/billing` (ADMIN role)

**Top KPI Cards** (row of 4):
- Total Claims This Month: ₹4,82,000 / $5,800
- Denial Rate: 11.2% (amber badge — industry avg 10–15%)
- Pending Claims: 23
- Collections Rate: 87.4%

**CPT Code Reference Table** (pre-loaded):

| CPT | Description | Rate (Medicare 2026) |
|---|---|---|
| 92507 | Individual Speech Therapy | ~$85.53 |
| 92508 | Group Speech Therapy | $20.79–$80.88 |
| 92521 | Fluency Evaluation | Varies |
| 92522 | Speech Sound Evaluation | Varies |
| 92523 | Comprehensive Evaluation | Varies |
| 92526 | Swallowing Treatment | Varies |
| 97550 | Caregiver Training (30 min) | New 2026 |
| 97551 | Caregiver Training Add-on | New 2026 |

**Medicare Threshold Tracker**:
- Progress bar per Medicare patient showing cumulative PT+SLP spend vs. $2,480 cap
- Auto-flag patients within $200 of cap with "⚠️ KX Modifier Required" badge

**Claim Scrubber**:
- Upload or generate claim → run validation rules
- Flag NCCI bundle conflicts (e.g., 92521 cannot be billed with rhinoscopy)
- Show modifier suggestions: GN, 52, 59, KX

---

### 9. 👨‍👩‍👧 Parent Portal — `/portal` (PARENT role)

Simplified, warm, non-clinical UI:
- **Welcome banner**: "Welcome, Priya! Here's Aanya's latest progress."
- **Progress card**: Goal attainment donut chart + last session summary
- **Upcoming Appointment**: Date/time + Join Teletherapy button
- **Home Exercises**: Card grid — each card has an exercise name, video thumbnail (placeholder), and [Mark Complete] button
- **Secure Messages**: Simple chat-style inbox with SLP
- **Progress Reports**: Download button for monthly PDF report

---

### 10. 🏫 IEP Coordinator View — `/iep` (SCHOOL role)

- Student list table with columns: Name | Grade | Disorder | IEP Due Date | Current Goal % | Last Session
- Bulk screening scheduler: date picker + room assignment + select students
- IEP milestone tracker: Gantt-style horizontal timeline per student
- Export button: "Generate FERPA-Compliant Progress Summary (PDF)"

---

## DATABASE SCHEMA (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  role      Role
  createdAt DateTime @default(now())
  clinician Clinician?
}

enum Role {
  SLP
  ADMIN
  PARENT
  SCHOOL_COORDINATOR
}

model Patient {
  id           String   @id @default(uuid())
  name         String
  dob          DateTime
  guardianName String?
  guardianPhone String?
  insuranceCarrier String?
  insurancePolicy  String?
  diagnoses    String[]
  assignedSlpId String
  sessions     Session[]
  assessments  Assessment[]
  goals        Goal[]
  billingRecords BillingRecord[]
  createdAt    DateTime @default(now())
}

model Session {
  id            String   @id @default(uuid())
  patientId     String
  patient       Patient  @relation(fields: [patientId], references: [id])
  clinicianId   String
  dateOfService DateTime
  durationMinutes Int
  cptCode       String
  icd10Codes    String[]
  telehealthSession Boolean @default(false)
  soapNote      Json?
  exercises     Json?
  mediaFiles    Json?
  status        SessionStatus @default(DRAFT)
  createdAt     DateTime @default(now())
}

enum SessionStatus {
  DRAFT
  PENDING_COSIGN
  SIGNED
  LOCKED
}

model Assessment {
  id              String   @id @default(uuid())
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id])
  testName        String
  subtest         String?
  dateAdministered DateTime
  rawScore        Float?
  standardScore   Float?
  percentile      Float?
  severityLabel   String?
  observations    String?
  rawData         Json?
  createdAt       DateTime @default(now())
}

model Goal {
  id          String   @id @default(uuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id])
  domain      String
  goalText    String
  baseline    Float
  target      Float
  current     Float    @default(0)
  status      GoalStatus @default(IN_PROGRESS)
  targetDate  DateTime?
  cptCode     String?
  icd10Code   String?
  createdAt   DateTime @default(now())
}

enum GoalStatus {
  IN_PROGRESS
  MET
  NOT_MET
  ON_HOLD
}

model BillingRecord {
  id          String   @id @default(uuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id])
  sessionId   String?
  dateOfService DateTime
  cptCodes    String[]
  icd10Codes  String[]
  billedAmount Float
  paidAmount  Float?
  status      BillingStatus @default(PENDING)
  modifiers   String[]
  createdAt   DateTime @default(now())
}

enum BillingStatus {
  PENDING
  SUBMITTED
  PAID
  DENIED
  APPEALED
}

model Clinician {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  name        String
  credentials String
  specialty   String?
  licenseNo   String?
}
```

---

## AI SCRIBE INTEGRATION

Use the **Groq SDK** for ultra-fast streaming inference. Groq's LPU hardware makes streaming feel near-instant — ideal for a live hackathon demo.

**Install**: `npm install groq-sdk`

```javascript
// server/routes/ai.js
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/generate-soap', authenticate, async (req, res) => {
  const { patient, sessionType, duration, exercises, goals } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',   // fast + high quality; swap to mixtral-8x7b-32768 if needed
    max_tokens: 1024,
    stream: true,
    messages: [
      {
        role: 'system',
        content: `You are a clinical documentation assistant for Speech-Language Pathology.
Generate a professional SOAP note following ASHA preferred practice patterns.
Use objective, measurable, third-person clinical language.
Return ONLY a valid JSON object with exactly these keys: subjective, objective, assessment, plan.
No markdown, no preamble, no explanation — raw JSON only.`
      },
      {
        role: 'user',
        content: `Generate a SOAP note for:
Patient: ${patient.name}, Age: ${patient.age}
Diagnosis: ${patient.diagnoses.join(', ')}
Session type: ${sessionType}, Duration: ${duration} minutes
Exercises completed: ${JSON.stringify(exercises)}
Goals addressed: ${goals.map(g => g.goalText).join('; ')}`
      }
    ]
  });

  // Stream SSE chunks to the client
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
  }
  res.write('data: [DONE]\n\n');
  res.end();
});
```

```javascript
// client/src/services/aiScribe.js
export async function streamSOAPNote(sessionData, onChunk, onDone) {
  const response = await fetch('/api/ai/generate-soap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(sessionData)
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop(); // keep incomplete chunk

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6);
        if (payload === '[DONE]') { onDone(); return; }
        try {
          const { delta } = JSON.parse(payload);
          onChunk(delta);       // append delta to the SOAP editor fields
        } catch {}
      }
    }
  }
}
```

**Wire it into the SOAP editor**:
```javascript
// In SOAPNote.jsx
import { streamSOAPNote } from '../services/aiScribe';

const handleAIScribe = async () => {
  setIsGenerating(true);
  let accumulated = '';

  await streamSOAPNote(
    { patient, sessionType, duration, exercises, goals },
    (delta) => {
      accumulated += delta;
      // Try to parse partial JSON and update fields as they stream in
      try {
        const parsed = JSON.parse(accumulated);
        if (parsed.subjective) setSubjective(parsed.subjective);
        if (parsed.objective)  setObjective(parsed.objective);
        if (parsed.assessment) setAssessment(parsed.assessment);
        if (parsed.plan)       setPlan(parsed.plan);
      } catch {} // silently ignore incomplete JSON while streaming
    },
    () => setIsGenerating(false)
  );
};
```

> **Why Groq?** Groq's LPU inference delivers ~500 tokens/second vs ~80 tokens/second on standard GPU APIs. The SOAP note appears almost instantly — visually impressive for judges and genuinely useful for clinicians.
```

---

## MOCK DATA FILE

Create `/client/src/data/mockData.js` with:
- 5 mock patients (mix of pediatric and adult, different disorders)
- 10 mock sessions with completed SOAP notes
- 3 mock GFTA-3 assessments with scores
- 8 mock goals with progress history
- 12 mock billing records with varied statuses
- All mock SLP, admin, parent, school users

---

## COMPLIANCE & SECURITY NOTES (display in UI)

Add a **Compliance Banner** to the footer of every clinical screen:
```
🔒 HIPAA Compliant | 🛡 AES-256 Encrypted | 📋 ASHA Standards | DPDPA 2023 Ready
```

Add a **Consent Modal** on first login for Parent/School roles:
- "By continuing, you consent to data processing under the Digital Personal Data Protection Act 2023 (India). Your data is encrypted and never sold."
- Language selector: English | हिंदी | मराठी | తెలుగు | தமிழ்

---

## DEMO FLOW FOR JUDGES (Hackathon Presentation Path)

Guide judges through this exact path:

1. Login as **SLP** → see dashboard with today's appointments + pending notes alert
2. Click patient "Aanya Sharma" → view profile + past GFTA-3 score
3. Start new **GFTA-3 Assessment** → administer 5 items → auto-calculate score → see "Moderate Impairment" badge
4. Open **SOAP Note editor** → click "✨ AI Scribe" → watch Groq stream a professional note at ~500 tokens/sec
5. Switch to **Teletherapy** room → show clinical stimulus panel + exercise tracker
6. Open **Goals** page → show progress line chart trending toward 80% target
7. Logout → Login as **ADMIN** → show billing dashboard + Medicare KX alert
8. Logout → Login as **PARENT** → show simplified portal with home exercises

---

## FOLDER STRUCTURE

```
speechsync/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn components
│   │   │   ├── layout/       # Sidebar, Header, Layout
│   │   │   ├── assessments/  # GFTA3Module, CELF5Module
│   │   │   ├── sessions/     # SOAPEditor, SessionCard
│   │   │   ├── teletherapy/  # VideoRoom, StimulusPanel
│   │   │   ├── billing/      # ClaimTable, CPTReference, ThresholdTracker
│   │   │   ├── goals/        # GoalCard, ProgressChart
│   │   │   └── portal/       # ParentDashboard, ExerciseCard
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PatientProfile.jsx
│   │   │   ├── AssessmentNew.jsx
│   │   │   ├── SOAPNote.jsx
│   │   │   ├── Teletherapy.jsx
│   │   │   ├── Goals.jsx
│   │   │   ├── Billing.jsx
│   │   │   ├── Portal.jsx
│   │   │   └── IEP.jsx
│   │   ├── store/
│   │   │   └── useStore.js   # Zustand store (auth, currentPatient)
│   │   ├── data/
│   │   │   └── mockData.js
│   │   ├── services/
│   │   │   ├── aiScribe.js
│   │   │   └── api.js
│   │   └── App.jsx
│   └── index.html
├── server/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── patients.js
│   │   ├── sessions.js
│   │   ├── assessments.js
│   │   ├── billing.js
│   │   └── ai.js
│   ├── middleware/
│   │   ├── authenticate.js
│   │   └── authorize.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── index.js
├── .env.example
├── package.json
└── README.md
```

---

## .env.example

```
# Server
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/speechsync
JWT_SECRET=your_jwt_secret_here

# AI — Groq (free tier: console.groq.com)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Azure Speech (optional — use mock if unavailable)
AZURE_SPEECH_KEY=your_azure_key_here
AZURE_SPEECH_REGION=eastus

# Teletherapy (optional — mock if unavailable)
DAILY_CO_API_KEY=your_daily_co_key_here

# AWS (optional — use local storage for demo)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=speechsync-media
```

---

## README — WHAT TO BUILD FIRST

For the hackathon, build in this order:

**Hour 1–2**: Project setup + Auth + Sidebar + Dashboard with mock data  
**Hour 3–4**: Patient Profile + GFTA-3 Assessment module with scoring engine  
**Hour 5–6**: SOAP Note Editor + Groq AI Scribe integration (streaming SSE)
**Hour 7–8**: Teletherapy room UI + Goals progress chart  
**Hour 9–10**: Billing dashboard + Parent portal + IEP view  
**Hour 11–12**: Polish, demo flow, README, deploy to Vercel/Railway  

---

## JUDGING CRITERIA ALIGNMENT

| Criterion | How SpeechSync addresses it |
|---|---|
| Innovation | AI scribe using Claude API; ASR-based phoneme scoring; ambient documentation |
| Technical Complexity | RBAC system, real-time WebRTC, FHIR data model, automated CPT/ICD billing engine |
| Clinical Impact | Digitized GFTA-3/CELF-5 with automated normative scoring; ASHA-compliant SOAP templates |
| Scalability | Microservices architecture, PostgreSQL + JSONB, containerization-ready |
| Social Impact | Addresses clinician burnout, reduces 10–15% claim denial rates, serves pediatric populations |
| UI/UX Quality | Role-specific dashboards, parent-friendly portal, warm clinical aesthetic |
| Compliance | HIPAA + DPDPA 2023 (India-specific) + FERPA + ASHA preferred practice patterns |

---

*Built for AGTechathon 2.0 2k26 — A.G. Patil Institute of Technology, Solapur*  
*Problem Statement: Software for Speech Language Therapy Clinical Services*