# 🧠 SpeechSync — Completion & Real-Time Data Prompt
### For Antigravity AI Coding Agent | AGTechathon 2.0 2k26

> This prompt picks up from a 52%-complete SpeechSync codebase and drives it to a fully working, demo-ready MVP using **real backend data** (no client-side mock data). Read every section before writing a single line.

---

## CONTEXT: WHERE THE PROJECT STANDS

The existing codebase has:
- ✅ React 18 + Vite frontend (builds successfully)
- ✅ Express backend with Prisma + PostgreSQL schema
- ✅ Basic JWT/bcrypt auth, role-based sidebar
- ✅ Scaffold pages: Dashboard, Patient Profile, SOAP Note, Assessments, Teletherapy, Goals, Billing, Portal, IEP
- ✅ Groq AI Scribe SSE route exists

Critical gaps to fix (in order of priority):
- 🔴 **Secrets committed** — `.env` file in repo with real keys
- 🔴 **No real data flow** — pages crash or show nothing without the DB seeded
- 🔴 **No route-level RBAC** — any authenticated user can hit any route
- 🔴 **No `mockData.js`** — client has no fallback when backend is slow/unavailable
- 🔴 **Hardcoded `localhost` API URL** — breaks in any deployed environment
- 🟡 **Incomplete GFTA-3** — only 5 stimuli, missing full 47-item subtest
- 🟡 **SOAP editor** — missing helper chips, HEP builder, robust AI stream parsing
- 🟡 **Teletherapy** — Google Meet placeholder instead of Daily.co/iframe
- 🟡 **Billing scrubber** — UI exists but doesn't call the backend `/api/billing/scrub`
- 🟡 **Parent portal** — static display, no real data, no working actions
- 🟡 **IEP module** — scheduler and export buttons do nothing
- 🟡 **Missing screens** — Admin Reports, Scheduling, Audit Logs, Settings, Patient List
- 🟡 **No PDF generation** — reports and IEP exports are placeholders
- 🟡 **No file uploads** — documents tab is static
- 🟡 **No secure messaging** — Parent portal chat is static

---

## PHASE 0 — SECURITY & INFRASTRUCTURE (Do This First, Non-Negotiable)

### 0A. Remove committed secrets

```bash
# Delete the committed .env
git rm --cached .env
echo ".env" >> .gitignore

# Revoke and rotate any API keys that were committed
# Create .env.example with placeholder values only
```

### 0B. Fix environment variable handling

**`client/vite.config.js`** — ensure env prefix:
```javascript
export default defineConfig({
  define: { 'process.env': {} },
  // Vite auto-exposes VITE_* vars; no extra config needed
})
```

**`client/src/services/api.js`** — replace hardcoded localhost:
```javascript
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const api = axios.create({ baseURL: BASE_URL });
```

**`server/index.js`** — fail hard if secrets missing:
```javascript
['JWT_SECRET', 'DATABASE_URL'].forEach(key => {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required env var ${key}`);
    process.exit(1);
  }
});
```

**`.env.example`** (commit this, not `.env`):
```
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/speechsync
JWT_SECRET=replace_with_long_random_string_min_32_chars

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

AZURE_SPEECH_KEY=your_azure_key_here
AZURE_SPEECH_REGION=eastus

DAILY_CO_API_KEY=your_daily_co_key_here

VITE_API_URL=http://localhost:5000
```

### 0C. Fix CORS

```javascript
// server/index.js
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
```

### 0D. Add ESLint config

```bash
cd client && npm init @eslint/config -- --env browser,es2021 --framework react
```

---

## PHASE 1 — DATABASE SEED WITH REAL DEMO DATA

> **Goal**: When judges run `npm run seed`, the database is populated with realistic clinical data that every frontend screen can display immediately. This replaces all mock/static data.

Create **`server/prisma/seed.js`** (run via `prisma db seed`):

```javascript
// server/prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ── USERS ──────────────────────────────────────────────────────────────────
  const hashedSlp     = await bcrypt.hash('slp123',    10);
  const hashedAdmin   = await bcrypt.hash('admin123',  10);
  const hashedParent  = await bcrypt.hash('parent123', 10);
  const hashedSchool  = await bcrypt.hash('school123', 10);

  const slpUser = await prisma.user.upsert({
    where: { email: 'slp@speechsync.in' },
    update: {},
    create: { email: 'slp@speechsync.in', password: hashedSlp, role: 'SLP' }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@speechsync.in' },
    update: {},
    create: { email: 'admin@speechsync.in', password: hashedAdmin, role: 'ADMIN' }
  });

  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@speechsync.in' },
    update: {},
    create: { email: 'parent@speechsync.in', password: hashedParent, role: 'PARENT' }
  });

  const schoolUser = await prisma.user.upsert({
    where: { email: 'school@speechsync.in' },
    update: {},
    create: { email: 'school@speechsync.in', password: hashedSchool, role: 'SCHOOL_COORDINATOR' }
  });

  // ── CLINICIAN ───────────────────────────────────────────────────────────────
  const clinician = await prisma.clinician.upsert({
    where: { userId: slpUser.id },
    update: {},
    create: {
      userId: slpUser.id,
      name: 'Dr. Meera Kulkarni',
      credentials: 'M.S. CCC-SLP',
      specialty: 'Pediatric Articulation & Language',
      licenseNo: 'MH-SLP-2019-04521'
    }
  });

  // ── PATIENTS (5 realistic patients) ────────────────────────────────────────
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { id: 'P001' },
      update: {},
      create: {
        id: 'P001',
        name: 'Aanya Sharma',
        dob: new Date('2016-03-12'),
        guardianName: 'Priya Sharma',
        guardianPhone: '+91 98765 43210',
        guardianEmail: 'priya.sharma@gmail.com',
        insuranceCarrier: 'Star Health Insurance',
        insurancePolicy: 'SH2024XYZ',
        medicareCap: 2480,
        medicareSpent: 2280,
        diagnoses: ['F80.0 — Phonological Disorder', 'F80.1 — Expressive Language Disorder'],
        assignedSlpId: clinician.id,
        parentUserId: parentUser.id
      }
    }),
    prisma.patient.upsert({
      where: { id: 'P002' },
      update: {},
      create: {
        id: 'P002',
        name: 'Rohan Mehta',
        dob: new Date('2015-07-22'),
        guardianName: 'Amit Mehta',
        guardianPhone: '+91 91234 56789',
        guardianEmail: 'amit.mehta@gmail.com',
        insuranceCarrier: 'HDFC ERGO Health',
        insurancePolicy: 'HE2023MNO',
        medicareCap: 2480,
        medicareSpent: 1100,
        diagnoses: ['F98.5 — Childhood-onset Fluency Disorder (Stuttering)'],
        assignedSlpId: clinician.id
      }
    }),
    prisma.patient.upsert({
      where: { id: 'P003' },
      update: {},
      create: {
        id: 'P003',
        name: 'Kavya Reddy',
        dob: new Date('2014-11-05'),
        guardianName: 'Sunita Reddy',
        guardianPhone: '+91 99887 76655',
        guardianEmail: 'sunita.reddy@gmail.com',
        insuranceCarrier: 'New India Assurance',
        insurancePolicy: 'NIA2024PQR',
        medicareCap: 2480,
        medicareSpent: 560,
        diagnoses: ['F80.2 — Mixed Receptive-Expressive Language Disorder'],
        assignedSlpId: clinician.id
      }
    }),
    prisma.patient.upsert({
      where: { id: 'P004' },
      update: {},
      create: {
        id: 'P004',
        name: 'Arjun Patel',
        dob: new Date('2010-02-18'),
        guardianName: 'Sanjay Patel',
        guardianPhone: '+91 87654 32109',
        guardianEmail: 'sanjay.patel@gmail.com',
        insuranceCarrier: 'Bajaj Allianz Health',
        insurancePolicy: 'BA2023STU',
        medicareCap: 2480,
        medicareSpent: 1890,
        diagnoses: ['F84.0 — Childhood Autism', 'F80.1 — Expressive Language Disorder'],
        assignedSlpId: clinician.id
      }
    }),
    prisma.patient.upsert({
      where: { id: 'P005' },
      update: {},
      create: {
        id: 'P005',
        name: 'Nisha Joshi',
        dob: new Date('2018-09-30'),
        guardianName: 'Rekha Joshi',
        guardianPhone: '+91 76543 21098',
        guardianEmail: 'rekha.joshi@gmail.com',
        insuranceCarrier: 'Aditya Birla Health',
        insurancePolicy: 'AB2024VWX',
        medicareCap: 2480,
        medicareSpent: 340,
        diagnoses: ['R47.01 — Aphasia', 'F80.0 — Phonological Disorder'],
        assignedSlpId: clinician.id
      }
    })
  ]);

  // ── GOALS (2–3 per patient) ─────────────────────────────────────────────────
  const today = new Date();
  const sixMonths = new Date(today); sixMonths.setMonth(sixMonths.getMonth() + 6);

  const goals = await Promise.all([
    // Aanya — P001
    prisma.goal.upsert({ where: { id: 'G001' }, update: {}, create: { id: 'G001', patientId: 'P001', domain: 'Articulation', goalText: 'Aanya will produce /r/ in word-initial position with 80% accuracy in 3/4 trials by June 2026.', baseline: 25, target: 80, current: 62, status: 'IN_PROGRESS', targetDate: sixMonths, cptCode: '92507', icd10Code: 'F80.0' } }),
    prisma.goal.upsert({ where: { id: 'G002' }, update: {}, create: { id: 'G002', patientId: 'P001', domain: 'Language', goalText: 'Aanya will use complex sentences (5+ words) spontaneously in 80% of opportunities during structured play.', baseline: 40, target: 80, current: 71, status: 'IN_PROGRESS', targetDate: sixMonths, cptCode: '92507', icd10Code: 'F80.1' } }),
    prisma.goal.upsert({ where: { id: 'G003' }, update: {}, create: { id: 'G003', patientId: 'P001', domain: 'Articulation', goalText: 'Aanya will produce /s/ and /z/ clusters with 90% accuracy in conversational speech.', baseline: 60, target: 90, current: 90, status: 'MET', targetDate: new Date('2025-12-01'), cptCode: '92507', icd10Code: 'F80.0' } }),
    // Rohan — P002
    prisma.goal.upsert({ where: { id: 'G004' }, update: {}, create: { id: 'G004', patientId: 'P002', domain: 'Fluency', goalText: 'Rohan will use Easy Onset technique to reduce stuttering frequency to <5% syllables stuttered during structured conversation.', baseline: 22, target: 5, current: 9, status: 'IN_PROGRESS', targetDate: sixMonths, cptCode: '92507', icd10Code: 'F98.5' } }),
    prisma.goal.upsert({ where: { id: 'G005' }, update: {}, create: { id: 'G005', patientId: 'P002', domain: 'Fluency', goalText: 'Rohan will demonstrate voluntary stuttering in low-pressure situations to reduce avoidance behaviors.', baseline: 0, target: 80, current: 45, status: 'IN_PROGRESS', targetDate: sixMonths, cptCode: '92507', icd10Code: 'F98.5' } }),
    // Kavya — P003
    prisma.goal.upsert({ where: { id: 'G006' }, update: {}, create: { id: 'G006', patientId: 'P003', domain: 'Language', goalText: 'Kavya will follow 3-step directions with 85% accuracy given visual + verbal cues.', baseline: 30, target: 85, current: 58, status: 'IN_PROGRESS', targetDate: sixMonths, cptCode: '92507', icd10Code: 'F80.2' } }),
  ]);

  // ── GOAL PROGRESS HISTORY ───────────────────────────────────────────────────
  // Create GoalProgress records to power the line charts
  const progressDates = [-70, -56, -42, -28, -14, 0].map(d => {
    const dt = new Date(); dt.setDate(dt.getDate() + d); return dt;
  });
  const g001Progress = [28, 35, 44, 52, 57, 62];
  const g002Progress = [43, 50, 55, 62, 68, 71];
  const g004Progress = [22, 19, 15, 12, 10, 9];

  for (let i = 0; i < progressDates.length; i++) {
    await prisma.goalProgress.upsert({
      where: { id: `GP001-${i}` },
      update: {},
      create: { id: `GP001-${i}`, goalId: 'G001', value: g001Progress[i], recordedAt: progressDates[i] }
    });
    await prisma.goalProgress.upsert({
      where: { id: `GP002-${i}` },
      update: {},
      create: { id: `GP002-${i}`, goalId: 'G002', value: g002Progress[i], recordedAt: progressDates[i] }
    });
    await prisma.goalProgress.upsert({
      where: { id: `GP004-${i}` },
      update: {},
      create: { id: `GP004-${i}`, goalId: 'G004', value: g004Progress[i], recordedAt: progressDates[i] }
    });
  }

  // ── SESSIONS (10 realistic sessions with full SOAP notes) ──────────────────
  const sessions = await Promise.all([
    prisma.session.upsert({
      where: { id: 'S001' },
      update: {},
      create: {
        id: 'S001', patientId: 'P001', clinicianId: clinician.id,
        dateOfService: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        durationMinutes: 45, cptCode: '92507',
        icd10Codes: ['F80.0', 'F80.1'],
        telehealthSession: false,
        status: 'SIGNED',
        soapNote: {
          subjective: "Parent reports Aanya has been practicing /r/ words at home using the flashcard set provided. Mother notes she is more willing to attempt words she previously avoided. Aanya appears motivated and engaged today.",
          objective: "Articulation: Aanya produced /r/ in word-initial position with 62% accuracy across 50 trials (GFTA-3 stimuli set). Substitution pattern: /w/ for /r/ observed in 28 trials. No omissions noted. Language sample elicited during play: MLU = 5.2, 3 instances of complex sentences. Clinician-directed drill: 3 sets of 10 trials each.",
          assessment: "Aanya continues to make measurable progress toward articulation goals. /r/ accuracy has increased from 25% baseline to 62% over 8 sessions, demonstrating consistent upward trajectory. Language targets are approaching goal criterion.",
          plan: "Continue /r/ drill in word-initial, then medial positions next session. Introduce minimal pair activities. HEP: 10 minutes daily /r/ word practice using provided card set. Schedule parent check-in in 2 weeks."
        },
        exercises: [
          { name: '/r/ Word-Initial Drill', attempts: 50, correct: 31, accuracy: 62 },
          { name: 'Minimal Pairs: /r/ vs /w/', attempts: 20, correct: 14, accuracy: 70 },
          { name: 'Language Sample — Structured Play', attempts: 1, notes: 'MLU 5.2, good complexity' }
        ]
      }
    }),
    prisma.session.upsert({
      where: { id: 'S002' },
      update: {},
      create: {
        id: 'S002', patientId: 'P001', clinicianId: clinician.id,
        dateOfService: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        durationMinutes: 45, cptCode: '92507',
        icd10Codes: ['F80.0'],
        telehealthSession: false,
        status: 'SIGNED',
        soapNote: {
          subjective: "Parent reports limited home practice this week due to school exams. Aanya reports she 'tried her best' with the cards.",
          objective: "Articulation: /r/ word-initial 57% accuracy (57/100 trials). Slight regression noted from prior session (62%). Fatigue observed mid-session.",
          assessment: "Minor regression likely due to reduced home practice. Core skill is retained; will reinforce with parent coaching.",
          plan: "Parent coaching session scheduled. Simplify HEP to 5 minutes daily. Maintain current drill targets."
        },
        exercises: [
          { name: '/r/ Word-Initial Drill', attempts: 100, correct: 57, accuracy: 57 }
        ]
      }
    }),
    prisma.session.upsert({
      where: { id: 'S003' },
      update: {},
      create: {
        id: 'S003', patientId: 'P002', clinicianId: clinician.id,
        dateOfService: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        durationMinutes: 30, cptCode: '92507',
        icd10Codes: ['F98.5'],
        telehealthSession: true,
        status: 'SIGNED',
        soapNote: {
          subjective: "Rohan reports using Easy Onset technique when reading aloud in class with some success. He expressed frustration with phone calls.",
          objective: "Fluency: 9% syllables stuttered in structured conversation (target <5%). Easy Onset used spontaneously in 6/10 opportunities. No secondary behaviors noted today.",
          assessment: "Rohan is progressing well with Easy Onset generalization. Phone call anxiety remains a therapeutic target.",
          plan: "Introduce phone call role-play hierarchy next session. Continue voluntary stuttering exercises. HEP: 5-min daily Easy Onset reading."
        },
        exercises: [
          { name: 'Easy Onset — Reading Aloud', attempts: 20, correct: 14, accuracy: 70 },
          { name: 'Voluntary Stuttering — Conversation', attempts: 10, correct: 5, accuracy: 50 }
        ]
      }
    }),
    // Today's sessions (for dashboard "Today's Appointments")
    prisma.session.upsert({
      where: { id: 'S004' },
      update: {},
      create: {
        id: 'S004', patientId: 'P001', clinicianId: clinician.id,
        dateOfService: new Date(), // today
        durationMinutes: 45, cptCode: '92507',
        icd10Codes: ['F80.0', 'F80.1'],
        telehealthSession: false,
        status: 'DRAFT',
        soapNote: null,
        exercises: []
      }
    }),
    prisma.session.upsert({
      where: { id: 'S005' },
      update: {},
      create: {
        id: 'S005', patientId: 'P002', clinicianId: clinician.id,
        dateOfService: new Date(),
        durationMinutes: 30, cptCode: '92507',
        icd10Codes: ['F98.5'],
        telehealthSession: true,
        status: 'DRAFT',
        soapNote: null,
        exercises: []
      }
    }),
    prisma.session.upsert({
      where: { id: 'S006' },
      update: {},
      create: {
        id: 'S006', patientId: 'P003', clinicianId: clinician.id,
        dateOfService: new Date(),
        durationMinutes: 60, cptCode: '92523',
        icd10Codes: ['F80.2'],
        telehealthSession: false,
        status: 'PENDING_COSIGN',
        soapNote: {
          subjective: "Parent reports Kavya is following 2-step directions at home consistently but struggles with 3-step sequences.",
          objective: "Following Directions subtest (CELF-5): scaled score 6. Sentence Comprehension: scaled score 7. Formulated Sentences: scaled score 5. Core Language Score: 78 (Borderline).",
          assessment: "Kavya demonstrates persistent deficits in receptive language, particularly multi-step processing. Scores consistent with F80.2 diagnosis.",
          plan: "Increase session frequency to 2x/week for next 6 weeks. Target 3-step directions with visual cue fading. IEP meeting scheduled for next month."
        },
        exercises: []
      }
    })
  ]);

  // ── ASSESSMENTS ─────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.assessment.upsert({
      where: { id: 'A001' },
      update: {},
      create: {
        id: 'A001', patientId: 'P001',
        testName: 'GFTA-3',
        subtest: 'Sounds-in-Words',
        dateAdministered: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        rawScore: 32, standardScore: 78, percentile: 7,
        severityLabel: 'Borderline / Mild Impairment',
        observations: 'Primary error pattern: /r/ substitution with /w/. Consistent distortion on /l/ clusters. Stimulable for /r/ in isolation.',
        rawData: {
          errors: [
            { phoneme: '/r/', position: 'Initial', errorType: 'Substitution', substitute: '/w/' },
            { phoneme: '/r/', position: 'Medial', errorType: 'Substitution', substitute: '/w/' },
            { phoneme: '/r/', position: 'Final', errorType: 'Distortion', notation: 'derhotacized' },
            { phoneme: '/l/', position: 'Initial', errorType: 'Correct' },
            { phoneme: '/θ/', position: 'Initial', errorType: 'Substitution', substitute: '/f/' },
            { phoneme: '/ʃ/', position: 'Initial', errorType: 'Correct' }
          ]
        }
      }
    }),
    prisma.assessment.upsert({
      where: { id: 'A002' },
      update: {},
      create: {
        id: 'A002', patientId: 'P001',
        testName: 'CELF-5',
        subtest: 'Core Battery',
        dateAdministered: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        rawScore: null, standardScore: 82, percentile: 12,
        severityLabel: 'Borderline',
        observations: 'Relative weakness in Recalling Sentences and Formulated Sentences. Receptive skills stronger than expressive.',
        rawData: {
          subtests: [
            { name: 'Sentence Comprehension', rawScore: 18, scaledScore: 9 },
            { name: 'Word Structure', rawScore: 16, scaledScore: 8 },
            { name: 'Following Directions', rawScore: 14, scaledScore: 8 },
            { name: 'Formulated Sentences', rawScore: 10, scaledScore: 6 },
            { name: 'Recalling Sentences', rawScore: 9, scaledScore: 5 },
            { name: 'Word Classes', rawScore: 13, scaledScore: 7 }
          ],
          composites: { coreLanguage: 82, receptiveLanguage: 88, expressiveLanguage: 76 }
        }
      }
    }),
    prisma.assessment.upsert({
      where: { id: 'A003' },
      update: {},
      create: {
        id: 'A003', patientId: 'P002',
        testName: 'Stuttering Severity Instrument-4 (SSI-4)',
        subtest: 'Full Battery',
        dateAdministered: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        rawScore: 26, standardScore: null, percentile: 68,
        severityLabel: 'Moderate',
        observations: 'Predominant blocks and prolongations. Secondary behaviors: eye blinking, head turning. Reading fluency better than conversational.',
        rawData: {
          frequency: { readingPercent: 6, conversationPercent: 14 },
          duration: { averageSeconds: 1.8, longestSeconds: 4.2 },
          physicalConcomitants: 8,
          total: 26
        }
      }
    })
  ]);

  // ── BILLING RECORDS ──────────────────────────────────────────────────────────
  await Promise.all([
    prisma.billingRecord.upsert({ where: { id: 'B001' }, update: {}, create: { id: 'B001', patientId: 'P001', sessionId: 'S001', dateOfService: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), cptCodes: ['92507'], icd10Codes: ['F80.0', 'F80.1'], billedAmount: 85.53, paidAmount: 72.10, status: 'PAID', modifiers: ['GN'] } }),
    prisma.billingRecord.upsert({ where: { id: 'B002' }, update: {}, create: { id: 'B002', patientId: 'P001', sessionId: 'S002', dateOfService: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), cptCodes: ['92507'], icd10Codes: ['F80.0'], billedAmount: 85.53, paidAmount: null, status: 'PENDING', modifiers: ['GN', 'KX'] } }),
    prisma.billingRecord.upsert({ where: { id: 'B003' }, update: {}, create: { id: 'B003', patientId: 'P002', sessionId: 'S003', dateOfService: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), cptCodes: ['92507'], icd10Codes: ['F98.5'], billedAmount: 85.53, paidAmount: null, status: 'SUBMITTED', modifiers: ['GN', '95'] } }),
    prisma.billingRecord.upsert({ where: { id: 'B004' }, update: {}, create: { id: 'B004', patientId: 'P003', sessionId: 'S006', dateOfService: new Date(), cptCodes: ['92523'], icd10Codes: ['F80.2'], billedAmount: 224.00, paidAmount: null, status: 'PENDING', modifiers: ['GN'] } }),
    prisma.billingRecord.upsert({ where: { id: 'B005' }, update: {}, create: { id: 'B005', patientId: 'P004', sessionId: null, dateOfService: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), cptCodes: ['92507'], icd10Codes: ['F84.0', 'F80.1'], billedAmount: 85.53, paidAmount: null, status: 'DENIED', modifiers: ['GN'] } }),
    prisma.billingRecord.upsert({ where: { id: 'B006' }, update: {}, create: { id: 'B006', patientId: 'P004', sessionId: null, dateOfService: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), cptCodes: ['97550'], icd10Codes: ['F84.0'], billedAmount: 61.00, paidAmount: null, status: 'SUBMITTED', modifiers: ['GN'] } }),
    prisma.billingRecord.upsert({ where: { id: 'B007' }, update: {}, create: { id: 'B007', patientId: 'P005', sessionId: null, dateOfService: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), cptCodes: ['92507'], icd10Codes: ['R47.01', 'F80.0'], billedAmount: 85.53, paidAmount: 72.10, status: 'PAID', modifiers: ['GN'] } }),
  ]);

  // ── HOME EXERCISES ───────────────────────────────────────────────────────────
  await Promise.all([
    prisma.homeExercise.upsert({ where: { id: 'HE001' }, update: {}, create: { id: 'HE001', patientId: 'P001', name: '/r/ Flashcard Practice', description: 'Practice each flashcard 3 times, saying the word slowly. Focus on the beginning sound.', frequency: 'Daily — 10 minutes', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), completedAt: null, assignedBy: clinician.id } }),
    prisma.homeExercise.upsert({ where: { id: 'HE002' }, update: {}, create: { id: 'HE002', patientId: 'P001', name: 'Storytime Language Practice', description: 'Read one book together and ask Aanya to tell you what happened using full sentences (at least 5 words).', frequency: '3x per week', dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), assignedBy: clinician.id } }),
    prisma.homeExercise.upsert({ where: { id: 'HE003' }, update: {}, create: { id: 'HE003', patientId: 'P002', name: 'Easy Onset Reading', description: 'Read one paragraph aloud using Easy Onset technique — start each sentence gently with a soft breath.', frequency: 'Daily — 5 minutes', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), completedAt: null, assignedBy: clinician.id } }),
  ]);

  // ── APPOINTMENTS (today + upcoming for dashboard) ────────────────────────────
  const todayBase = new Date(); todayBase.setHours(9, 0, 0, 0);
  const appts = [
    { id: 'APT001', patientId: 'P001', clinicianId: clinician.id, startTime: new Date(todayBase.getTime()), durationMinutes: 45, type: 'Individual Therapy', status: 'SCHEDULED', sessionId: 'S004', isTelepractice: false },
    { id: 'APT002', patientId: 'P002', clinicianId: clinician.id, startTime: new Date(todayBase.getTime() + 60 * 60 * 1000), durationMinutes: 30, type: 'Telepractice', status: 'IN_PROGRESS', sessionId: 'S005', isTelepractice: true },
    { id: 'APT003', patientId: 'P003', clinicianId: clinician.id, startTime: new Date(todayBase.getTime() + 2 * 60 * 60 * 1000), durationMinutes: 60, type: 'Evaluation', status: 'COMPLETED', sessionId: 'S006', isTelepractice: false },
    { id: 'APT004', patientId: 'P004', clinicianId: clinician.id, startTime: new Date(todayBase.getTime() + 3.5 * 60 * 60 * 1000), durationMinutes: 45, type: 'Individual Therapy', status: 'SCHEDULED', sessionId: null, isTelepractice: false },
    { id: 'APT005', patientId: 'P005', clinicianId: clinician.id, startTime: new Date(todayBase.getTime() + 5 * 60 * 60 * 1000), durationMinutes: 30, type: 'Individual Therapy', status: 'SCHEDULED', sessionId: null, isTelepractice: false },
  ];
  for (const appt of appts) {
    await prisma.appointment.upsert({ where: { id: appt.id }, update: {}, create: appt });
  }

  // ── IEP STUDENTS (for School Coordinator) ───────────────────────────────────
  const students = [
    { id: 'ST001', name: 'Aanya Sharma', grade: '3rd', disorder: 'Phonological Disorder', iepDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), currentGoalPercent: 62, lastSession: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), patientId: 'P001' },
    { id: 'ST002', name: 'Rohan Mehta', grade: '4th', disorder: 'Fluency Disorder', iepDueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), currentGoalPercent: 55, lastSession: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), patientId: 'P002' },
    { id: 'ST003', name: 'Kavya Reddy', grade: '5th', disorder: 'Language Disorder', iepDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), currentGoalPercent: 44, lastSession: new Date(), patientId: 'P003' },
    { id: 'ST004', name: 'Arjun Patel', grade: '8th', disorder: 'Autism + Language', iepDueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), currentGoalPercent: 38, lastSession: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), patientId: 'P004' },
  ];
  for (const s of students) {
    await prisma.iepStudent.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  // ── MESSAGES (Parent portal secure messaging) ────────────────────────────────
  await Promise.all([
    prisma.message.upsert({ where: { id: 'MSG001' }, update: {}, create: { id: 'MSG001', fromUserId: slpUser.id, toUserId: parentUser.id, patientId: 'P001', subject: 'Aanya\'s Progress Update', body: 'Hi Priya! Just wanted to let you know Aanya did a fantastic job today. Her /r/ accuracy is up to 62%! Please keep up the daily flashcard practice — it\'s making a real difference.', readAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    prisma.message.upsert({ where: { id: 'MSG002' }, update: {}, create: { id: 'MSG002', fromUserId: parentUser.id, toUserId: slpUser.id, patientId: 'P001', subject: 'Re: Aanya\'s Progress Update', body: 'Thank you Dr. Kulkarni! We are so proud of her. We will continue the practice. Should we increase to 15 minutes a day?', readAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } }),
    prisma.message.upsert({ where: { id: 'MSG003' }, update: {}, create: { id: 'MSG003', fromUserId: slpUser.id, toUserId: parentUser.id, patientId: 'P001', subject: 'Re: Aanya\'s Progress Update', body: '10 minutes is perfect for now — we don\'t want her to fatigue. Quality over quantity! See you next week.', readAt: null, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) } }),
  ]);

  // ── AUDIT LOGS ───────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.auditLog.upsert({ where: { id: 'AL001' }, update: {}, create: { id: 'AL001', userId: slpUser.id, action: 'LOGIN', resource: 'AUTH', resourceId: null, details: { ip: '192.168.1.10', userAgent: 'Chrome/125' }, createdAt: new Date(Date.now() - 60 * 60 * 1000) } }),
    prisma.auditLog.upsert({ where: { id: 'AL002' }, update: {}, create: { id: 'AL002', userId: slpUser.id, action: 'VIEW_PATIENT', resource: 'PATIENT', resourceId: 'P001', details: { patientName: 'Aanya Sharma' }, createdAt: new Date(Date.now() - 55 * 60 * 1000) } }),
    prisma.auditLog.upsert({ where: { id: 'AL003' }, update: {}, create: { id: 'AL003', userId: slpUser.id, action: 'SIGN_NOTE', resource: 'SESSION', resourceId: 'S001', details: { cptCode: '92507' }, createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    prisma.auditLog.upsert({ where: { id: 'AL004' }, update: {}, create: { id: 'AL004', userId: adminUser.id, action: 'VIEW_BILLING', resource: 'BILLING', resourceId: null, details: { filter: 'THIS_MONTH' }, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) } }),
  ]);

  console.log('✅ Database seeded successfully with full demo data.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
```

Add to **`server/package.json`**:
```json
"prisma": {
  "seed": "node prisma/seed.js"
}
```

Run: `npx prisma migrate dev --name add_missing_tables && npx prisma db seed`

---

## PHASE 2 — SCHEMA ADDITIONS

The existing Prisma schema is missing several tables referenced by the seed above. Add these to **`server/prisma/schema.prisma`**:

```prisma
model GoalProgress {
  id         String   @id @default(uuid())
  goalId     String
  goal       Goal     @relation(fields: [goalId], references: [id])
  value      Float
  recordedAt DateTime @default(now())
}

model Appointment {
  id              String   @id @default(uuid())
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id])
  clinicianId     String
  startTime       DateTime
  durationMinutes Int
  type            String   // "Individual Therapy" | "Telepractice" | "Evaluation"
  status          AppointmentStatus @default(SCHEDULED)
  sessionId       String?
  isTelepractice  Boolean @default(false)
  dailyRoomUrl    String?
  createdAt       DateTime @default(now())
}

enum AppointmentStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model HomeExercise {
  id          String   @id @default(uuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id])
  name        String
  description String
  frequency   String
  dueDate     DateTime?
  completedAt DateTime?
  assignedBy  String   // Clinician ID
  createdAt   DateTime @default(now())
}

model Message {
  id         String   @id @default(uuid())
  fromUserId String
  toUserId   String
  patientId  String
  subject    String
  body       String
  readAt     DateTime?
  createdAt  DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String
  action     String   // LOGIN | VIEW_PATIENT | SIGN_NOTE | VIEW_BILLING | EXPORT etc.
  resource   String
  resourceId String?
  details    Json?
  createdAt  DateTime @default(now())
}

model IepStudent {
  id                 String   @id @default(uuid())
  name               String
  grade              String
  disorder           String
  iepDueDate         DateTime
  currentGoalPercent Float
  lastSession        DateTime
  patientId          String?
  createdAt          DateTime @default(now())
}
```

Also add missing fields to **Patient**:
```prisma
model Patient {
  // ... existing fields ...
  guardianEmail    String?
  medicareCap      Float    @default(2480)
  medicareSpent    Float    @default(0)
  parentUserId     String?  // links to the parent User for portal scoping
  homeExercises    HomeExercise[]
  appointments     Appointment[]
}

model Goal {
  // ... existing fields ...
  progressHistory  GoalProgress[]
}
```

---

## PHASE 3 — BACKEND: COMPLETE ALL API ROUTES

### 3A. Fix authentication and add full RBAC

**`server/middleware/authorize.js`** — fix and export properly:
```javascript
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};
```

**Apply `authorize` to every sensitive route**:
```javascript
// patients.js
router.get('/',           authenticate, authorize('SLP', 'ADMIN'), getAllPatients);
router.get('/:id',        authenticate, getPatientById);  // SLP + PARENT (with ownership check)
router.post('/',          authenticate, authorize('SLP', 'ADMIN'), createPatient);

// sessions.js
router.get('/',           authenticate, authorize('SLP', 'ADMIN'), getSessions);
router.post('/',          authenticate, authorize('SLP'), createSession);
router.patch('/:id/sign', authenticate, authorize('SLP'), signSession);

// billing.js
router.get('/',           authenticate, authorize('ADMIN'), getBilling);
router.post('/scrub',     authenticate, authorize('ADMIN', 'SLP'), scrubClaim);

// goals.js — all roles can view goals for their patients, SLP can write
router.get('/patient/:patientId', authenticate, getGoalsForPatient);
router.post('/',                  authenticate, authorize('SLP'), createGoal);
router.patch('/:id/progress',     authenticate, authorize('SLP'), updateGoalProgress);
```

**Parent data scoping** — in `patients.js` GET /:id:
```javascript
// If role is PARENT, only allow access to their linked patient
if (req.user.role === 'PARENT') {
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id } });
  if (patient?.parentUserId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
}
```

**Audit logging middleware** — call this in every sensitive route:
```javascript
async function audit(userId, action, resource, resourceId, details) {
  await prisma.auditLog.create({ data: { userId, action, resource, resourceId, details } });
}
```

### 3B. New route: Appointments

**`server/routes/appointments.js`**:
```javascript
// GET /api/appointments/today  — returns today's appointments for the SLP
router.get('/today', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(); end.setHours(23,59,59,999);
  const appointments = await prisma.appointment.findMany({
    where: { clinicianId: req.user.clinicianId, startTime: { gte: start, lte: end } },
    include: { patient: { select: { id: true, name: true, dob: true, diagnoses: true } } },
    orderBy: { startTime: 'asc' }
  });
  res.json(appointments);
});

// POST /api/appointments — create appointment (Admin/SLP)
router.post('/', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const appt = await prisma.appointment.create({ data: req.body });
  res.json(appt);
});

// PATCH /api/appointments/:id/status — update status
router.patch('/:id/status', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const appt = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status: req.body.status }
  });
  res.json(appt);
});
```

### 3C. New route: Messages (Secure Messaging)

**`server/routes/messages.js`**:
```javascript
// GET /api/messages — inbox for current user
router.get('/', authenticate, async (req, res) => {
  const msgs = await prisma.message.findMany({
    where: { OR: [{ fromUserId: req.user.id }, { toUserId: req.user.id }] },
    orderBy: { createdAt: 'desc' }
  });
  res.json(msgs);
});

// POST /api/messages — send message
router.post('/', authenticate, async (req, res) => {
  const { toUserId, patientId, subject, body } = req.body;
  const msg = await prisma.message.create({
    data: { fromUserId: req.user.id, toUserId, patientId, subject, body }
  });
  res.json(msg);
});

// PATCH /api/messages/:id/read — mark as read
router.patch('/:id/read', authenticate, async (req, res) => {
  const msg = await prisma.message.update({
    where: { id: req.params.id },
    data: { readAt: new Date() }
  });
  res.json(msg);
});
```

### 3D. New route: Home Exercises

```javascript
// GET /api/exercises/patient/:patientId
router.get('/patient/:patientId', authenticate, async (req, res) => {
  const exercises = await prisma.homeExercise.findMany({
    where: { patientId: req.params.patientId },
    orderBy: { createdAt: 'desc' }
  });
  res.json(exercises);
});

// POST /api/exercises — create exercise
router.post('/', authenticate, authorize('SLP'), async (req, res) => {
  const ex = await prisma.homeExercise.create({
    data: { ...req.body, assignedBy: req.user.clinicianId }
  });
  res.json(ex);
});

// PATCH /api/exercises/:id/complete — parent marks complete
router.patch('/:id/complete', authenticate, async (req, res) => {
  const ex = await prisma.homeExercise.update({
    where: { id: req.params.id },
    data: { completedAt: new Date() }
  });
  res.json(ex);
});
```

### 3E. Goal Progress Route

```javascript
// GET /api/goals/:id/progress — history for line chart
router.get('/:id/progress', authenticate, async (req, res) => {
  const history = await prisma.goalProgress.findMany({
    where: { goalId: req.params.id },
    orderBy: { recordedAt: 'asc' }
  });
  res.json(history);
});

// POST /api/goals/:id/progress — record new data point
router.post('/:id/progress', authenticate, authorize('SLP'), async (req, res) => {
  const point = await prisma.goalProgress.create({
    data: { goalId: req.params.id, value: req.body.value }
  });
  // Also update Goal.current
  await prisma.goal.update({ where: { id: req.params.id }, data: { current: req.body.value } });
  res.json(point);
});
```

### 3F. Billing Scrubber — wire to frontend

Complete the `/api/billing/scrub` endpoint:
```javascript
router.post('/scrub', authenticate, authorize('ADMIN', 'SLP'), async (req, res) => {
  const { cptCodes, icd10Codes, modifiers = [], patientId } = req.body;
  const issues = [];
  const suggestions = [];

  // NCCI bundle checks
  const ncciConflicts = {
    '92521': ['31575'], // Fluency eval cannot be billed with rhinoscopy
    '92522': ['92521'], // Speech sound eval + fluency eval = conflict
    '92523': ['92522', '92521'], // Comprehensive = all subtests included
  };
  for (const [code, conflicts] of Object.entries(ncciConflicts)) {
    if (cptCodes.includes(code)) {
      const found = conflicts.filter(c => cptCodes.includes(c));
      if (found.length) issues.push({ severity: 'ERROR', code, conflict: found, message: `NCCI conflict: ${code} cannot be billed with ${found.join(', ')}` });
    }
  }

  // KX modifier check
  if (patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (patient && patient.medicareSpent >= patient.medicareCap - 200) {
      if (!modifiers.includes('KX')) {
        issues.push({ severity: 'WARNING', message: `Patient approaching Medicare cap ($${patient.medicareSpent}/$${patient.medicareCap}). KX modifier required.` });
        suggestions.push('KX');
      }
    }
  }

  // GN modifier check (speech-language services must have GN)
  const slpCpts = ['92507', '92508', '92521', '92522', '92523', '92526', '97550', '97551'];
  if (cptCodes.some(c => slpCpts.includes(c)) && !modifiers.includes('GN')) {
    issues.push({ severity: 'WARNING', message: 'GN modifier required for all SLP services billed to Medicare/Medicaid.' });
    suggestions.push('GN');
  }

  res.json({ issues, suggestedModifiers: [...new Set([...modifiers, ...suggestions])], passed: issues.filter(i => i.severity === 'ERROR').length === 0 });
});
```

### 3G. Audit Logs Route

```javascript
// server/routes/auditLogs.js
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { page = 1, limit = 50, action, userId } = req.query;
  const where = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit),
      include: { user: { select: { email: true, role: true } } }
    }),
    prisma.auditLog.count({ where })
  ]);
  res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
});
```

### 3H. Daily.co Teletherapy Room Creation

```javascript
// server/routes/teletherapy.js
router.post('/create-room', authenticate, authorize('SLP'), async (req, res) => {
  const { appointmentId } = req.body;

  if (!process.env.DAILY_CO_API_KEY) {
    // Mock response for demo without Daily.co
    return res.json({ url: `https://meet.google.com/mock-${appointmentId}`, roomName: `speechsync-${appointmentId}`, isMock: true });
  }

  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DAILY_CO_API_KEY}` },
    body: JSON.stringify({
      name: `speechsync-${appointmentId}-${Date.now()}`,
      privacy: 'private',
      properties: {
        exp: Math.round(Date.now() / 1000) + 3600, // 1 hour
        enable_recording: 'cloud',
        enable_screenshare: true,
        max_participants: 4
      }
    })
  });
  const room = await response.json();

  // Save room URL to appointment
  await prisma.appointment.update({ where: { id: appointmentId }, data: { dailyRoomUrl: room.url } });
  res.json({ url: room.url, roomName: room.name, isMock: false });
});
```

---

## PHASE 4 — FRONTEND: COMPLETE ALL SCREENS WITH REAL DATA

> **Rule**: Every screen fetches data from `/api/*`. No hardcoded values. Use React Query (`@tanstack/react-query`) for all data fetching — it gives free loading states, error handling, and cache invalidation.

Install: `npm install @tanstack/react-query`

Wrap App in QueryClientProvider:
```jsx
// client/src/App.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();

export default function App() {
  return <QueryClientProvider client={queryClient}><RouterProvider .../></QueryClientProvider>;
}
```

### 4A. Dashboard — Real Data

```jsx
// client/src/pages/Dashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export default function Dashboard() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => api.get('/api/appointments/today').then(r => r.data)
  });

  const { data: pendingNotes } = useQuery({
    queryKey: ['sessions', 'pending'],
    queryFn: () => api.get('/api/sessions?status=DRAFT,PENDING_COSIGN').then(r => r.data)
  });

  const { data: goals } = useQuery({
    queryKey: ['goals', 'weekly'],
    queryFn: () => api.get('/api/goals/weekly-summary').then(r => r.data)
  });

  const { data: alerts } = useQuery({
    queryKey: ['billing', 'alerts'],
    queryFn: () => api.get('/api/billing/alerts').then(r => r.data)
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-6 space-y-6">
      {/* Insurance Alert Banner */}
      {alerts?.kxAlerts?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={18} />
          <div>
            {alerts.kxAlerts.map(a => (
              <p key={a.patientId} className="text-sm text-amber-800">
                <strong>{a.patientName}</strong> is approaching the ₹{a.cap} Medicare cap 
                (spent: ₹{a.spent}). <span className="font-semibold">KX modifier required.</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Today's Appointments */}
      <Card>
        <CardHeader><CardTitle>Today's Appointments</CardTitle></CardHeader>
        <CardContent>
          {appointments?.map(appt => (
            <AppointmentRow key={appt.id} appointment={appt} />
          ))}
        </CardContent>
      </Card>

      {/* Pending Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Pending SOAP Notes</CardTitle>
          {pendingNotes?.length > 0 && (
            <Badge variant="destructive">{pendingNotes.length} overdue</Badge>
          )}
        </CardHeader>
        <CardContent>
          {pendingNotes?.map(s => <PendingNoteRow key={s.id} session={s} />)}
        </CardContent>
      </Card>

      {/* Goal Attainment Donut */}
      <Card>
        <CardHeader><CardTitle>Goal Attainment This Week</CardTitle></CardHeader>
        <CardContent>
          <GoalDonutChart data={goals} />
        </CardContent>
      </Card>
    </div>
  );
}
```

Add **billing alerts endpoint** to `server/routes/billing.js`:
```javascript
router.get('/alerts', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const patients = await prisma.patient.findMany({
    select: { id: true, name: true, medicareCap: true, medicareSpent: true }
  });
  const kxAlerts = patients.filter(p => p.medicareSpent >= p.medicareCap - 200)
    .map(p => ({ patientId: p.id, patientName: p.name, cap: p.medicareCap, spent: p.medicareSpent }));
  res.json({ kxAlerts });
});
```

### 4B. Patient Profile — Real Data Tabs

```jsx
// client/src/pages/PatientProfile.jsx
export default function PatientProfile() {
  const { id } = useParams();

  const { data: patient } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/api/patients/${id}`).then(r => r.data)
  });

  const { data: assessments } = useQuery({
    queryKey: ['assessments', id],
    queryFn: () => api.get(`/api/assessments?patientId=${id}`).then(r => r.data)
  });

  const { data: goals } = useQuery({
    queryKey: ['goals', id],
    queryFn: () => api.get(`/api/goals/patient/${id}`).then(r => r.data)
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => api.get(`/api/sessions?patientId=${id}`).then(r => r.data)
  });

  if (!patient) return <PatientProfileSkeleton />;

  return (
    <div>
      <PatientHeader patient={patient} />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessments">Assessments ({assessments?.length})</TabsTrigger>
          <TabsTrigger value="goals">Goals ({goals?.length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions?.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab patient={patient} /></TabsContent>
        <TabsContent value="assessments"><AssessmentsTab assessments={assessments} /></TabsContent>
        <TabsContent value="goals"><GoalsTab goals={goals} patientId={id} /></TabsContent>
        <TabsContent value="sessions"><SessionsTab sessions={sessions} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab patientId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}
```

### 4C. GFTA-3 — Full 47-Item Administration

Build the complete stimulus set. Store in `client/src/data/gfta3Stimuli.js`:

```javascript
// Full GFTA-3 Sounds-in-Words stimulus set
export const gfta3Stimuli = [
  // Each item: { id, word, imageLabel, targetPhonemes: [{phoneme, position}] }
  { id: 1,  word: 'HOUSE',    imageLabel: 'House',    targetPhonemes: [{ phoneme: '/h/', position: 'Initial' }, { phoneme: '/s/', position: 'Final' }] },
  { id: 2,  word: 'TELEPHONE', imageLabel: 'Telephone', targetPhonemes: [{ phoneme: '/t/', position: 'Initial' }, { phoneme: '/l/', position: 'Medial' }, { phoneme: '/n/', position: 'Final' }] },
  { id: 3,  word: 'CUP',      imageLabel: 'Cup',      targetPhonemes: [{ phoneme: '/k/', position: 'Initial' }, { phoneme: '/p/', position: 'Final' }] },
  { id: 4,  word: 'GUN',      imageLabel: 'Gun',      targetPhonemes: [{ phoneme: '/g/', position: 'Initial' }, { phoneme: '/n/', position: 'Final' }] },
  { id: 5,  word: 'KNIFE',    imageLabel: 'Knife',    targetPhonemes: [{ phoneme: '/n/', position: 'Initial' }, { phoneme: '/f/', position: 'Final' }] },
  { id: 6,  word: 'WINDOW',   imageLabel: 'Window',   targetPhonemes: [{ phoneme: '/w/', position: 'Initial' }, { phoneme: '/n/', position: 'Medial' }, { phoneme: '/oʊ/', position: 'Final' }] },
  { id: 7,  word: 'WAGON',    imageLabel: 'Wagon',    targetPhonemes: [{ phoneme: '/w/', position: 'Initial' }, { phoneme: '/g/', position: 'Medial' }, { phoneme: '/n/', position: 'Final' }] },
  { id: 8,  word: 'WHEEL',    imageLabel: 'Wheel',    targetPhonemes: [{ phoneme: '/hw/', position: 'Initial' }, { phoneme: '/l/', position: 'Final' }] },
  { id: 9,  word: 'CHICKEN',  imageLabel: 'Chicken',  targetPhonemes: [{ phoneme: '/tʃ/', position: 'Initial' }, { phoneme: '/k/', position: 'Medial' }, { phoneme: '/n/', position: 'Final' }] },
  { id: 10, word: 'ZIPPER',   imageLabel: 'Zipper',   targetPhonemes: [{ phoneme: '/z/', position: 'Initial' }, { phoneme: '/p/', position: 'Medial' }, { phoneme: '/r/', position: 'Final' }] },
  { id: 11, word: 'SCISSORS', imageLabel: 'Scissors', targetPhonemes: [{ phoneme: '/s/', position: 'Initial' }, { phoneme: '/z/', position: 'Medial' }, { phoneme: '/z/', position: 'Final' }] },
  { id: 12, word: 'DUCK',     imageLabel: 'Duck',     targetPhonemes: [{ phoneme: '/d/', position: 'Initial' }, { phoneme: '/k/', position: 'Final' }] },
  { id: 13, word: 'YELLOW',   imageLabel: 'Yellow',   targetPhonemes: [{ phoneme: '/j/', position: 'Initial' }, { phoneme: '/l/', position: 'Medial' }, { phoneme: '/oʊ/', position: 'Final' }] },
  { id: 14, word: 'VACUUM',   imageLabel: 'Vacuum',   targetPhonemes: [{ phoneme: '/v/', position: 'Initial' }, { phoneme: '/k/', position: 'Medial' }, { phoneme: '/m/', position: 'Final' }] },
  { id: 15, word: 'MATCHES',  imageLabel: 'Matches',  targetPhonemes: [{ phoneme: '/m/', position: 'Initial' }, { phoneme: '/tʃ/', position: 'Medial' }, { phoneme: '/z/', position: 'Final' }] },
  { id: 16, word: 'LAMP',     imageLabel: 'Lamp',     targetPhonemes: [{ phoneme: '/l/', position: 'Initial' }, { phoneme: '/m/', position: 'Medial' }, { phoneme: '/p/', position: 'Final' }] },
  { id: 17, word: 'SHOVEL',   imageLabel: 'Shovel',   targetPhonemes: [{ phoneme: '/ʃ/', position: 'Initial' }, { phoneme: '/v/', position: 'Medial' }, { phoneme: '/l/', position: 'Final' }] },
  { id: 18, word: 'CARROTS',  imageLabel: 'Carrots',  targetPhonemes: [{ phoneme: '/k/', position: 'Initial' }, { phoneme: '/r/', position: 'Medial' }, { phoneme: '/s/', position: 'Final' }] },
  { id: 19, word: 'RABBIT',   imageLabel: 'Rabbit',   targetPhonemes: [{ phoneme: '/r/', position: 'Initial' }, { phoneme: '/b/', position: 'Medial' }, { phoneme: '/t/', position: 'Final' }] },
  { id: 20, word: 'BATHTUB',  imageLabel: 'Bathtub',  targetPhonemes: [{ phoneme: '/b/', position: 'Initial' }, { phoneme: '/θ/', position: 'Medial' }, { phoneme: '/b/', position: 'Final' }] },
  { id: 21, word: 'FISHING',  imageLabel: 'Fishing',  targetPhonemes: [{ phoneme: '/f/', position: 'Initial' }, { phoneme: '/ʃ/', position: 'Medial' }, { phoneme: '/ŋ/', position: 'Final' }] },
  { id: 22, word: 'PENCILS',  imageLabel: 'Pencils',  targetPhonemes: [{ phoneme: '/p/', position: 'Initial' }, { phoneme: '/n/', position: 'Medial' }, { phoneme: '/z/', position: 'Final' }] },
  { id: 23, word: 'THIS',     imageLabel: 'This',     targetPhonemes: [{ phoneme: '/ð/', position: 'Initial' }, { phoneme: '/s/', position: 'Final' }] },
  { id: 24, word: 'TOOTHBRUSH', imageLabel: 'Toothbrush', targetPhonemes: [{ phoneme: '/t/', position: 'Initial' }, { phoneme: '/θ/', position: 'Medial' }, { phoneme: '/ʃ/', position: 'Final' }] },
  { id: 25, word: 'FEATHER',  imageLabel: 'Feather',  targetPhonemes: [{ phoneme: '/f/', position: 'Initial' }, { phoneme: '/ð/', position: 'Medial' }, { phoneme: '/r/', position: 'Final' }] },
  { id: 26, word: 'THUMB',    imageLabel: 'Thumb',    targetPhonemes: [{ phoneme: '/θ/', position: 'Initial' }, { phoneme: '/m/', position: 'Final' }] },
  { id: 27, word: 'JUMPING',  imageLabel: 'Jumping',  targetPhonemes: [{ phoneme: '/dʒ/', position: 'Initial' }, { phoneme: '/m/', position: 'Medial' }, { phoneme: '/ŋ/', position: 'Final' }] },
  { id: 28, word: 'PAJAMAS',  imageLabel: 'Pajamas',  targetPhonemes: [{ phoneme: '/p/', position: 'Initial' }, { phoneme: '/dʒ/', position: 'Medial' }, { phoneme: '/z/', position: 'Final' }] },
  { id: 29, word: 'PLANE',    imageLabel: 'Plane',    targetPhonemes: [{ phoneme: '/pl/', position: 'Initial' }, { phoneme: '/n/', position: 'Final' }] },
  { id: 30, word: 'FLOWERS',  imageLabel: 'Flowers',  targetPhonemes: [{ phoneme: '/fl/', position: 'Initial' }, { phoneme: '/r/', position: 'Medial' }, { phoneme: '/z/', position: 'Final' }] },
  { id: 31, word: 'SLIDE',    imageLabel: 'Slide',    targetPhonemes: [{ phoneme: '/sl/', position: 'Initial' }, { phoneme: '/d/', position: 'Final' }] },
  { id: 32, word: 'BLOCKS',   imageLabel: 'Blocks',   targetPhonemes: [{ phoneme: '/bl/', position: 'Initial' }, { phoneme: '/ks/', position: 'Final' }] },
  { id: 33, word: 'CLOCK',    imageLabel: 'Clock',    targetPhonemes: [{ phoneme: '/kl/', position: 'Initial' }, { phoneme: '/k/', position: 'Final' }] },
  { id: 34, word: 'GLOVE',    imageLabel: 'Glove',    targetPhonemes: [{ phoneme: '/gl/', position: 'Initial' }, { phoneme: '/v/', position: 'Final' }] },
  { id: 35, word: 'TREE',     imageLabel: 'Tree',     targetPhonemes: [{ phoneme: '/tr/', position: 'Initial' }, { phoneme: '/i/', position: 'Final' }] },
  { id: 36, word: 'DRUM',     imageLabel: 'Drum',     targetPhonemes: [{ phoneme: '/dr/', position: 'Initial' }, { phoneme: '/m/', position: 'Final' }] },
  { id: 37, word: 'BRUSH',    imageLabel: 'Brush',    targetPhonemes: [{ phoneme: '/br/', position: 'Initial' }, { phoneme: '/ʃ/', position: 'Final' }] },
  { id: 38, word: 'CRAYONS',  imageLabel: 'Crayons',  targetPhonemes: [{ phoneme: '/kr/', position: 'Initial' }, { phoneme: '/n/', position: 'Medial' }, { phoneme: '/z/', position: 'Final' }] },
  { id: 39, word: 'GRAPES',   imageLabel: 'Grapes',   targetPhonemes: [{ phoneme: '/gr/', position: 'Initial' }, { phoneme: '/p/', position: 'Medial' }, { phoneme: '/s/', position: 'Final' }] },
  { id: 40, word: 'FROG',     imageLabel: 'Frog',     targetPhonemes: [{ phoneme: '/fr/', position: 'Initial' }, { phoneme: '/g/', position: 'Final' }] },
  { id: 41, word: 'BREAD',    imageLabel: 'Bread',    targetPhonemes: [{ phoneme: '/br/', position: 'Initial' }, { phoneme: '/d/', position: 'Final' }] },
  { id: 42, word: 'STRING',   imageLabel: 'String',   targetPhonemes: [{ phoneme: '/str/', position: 'Initial' }, { phoneme: '/ŋ/', position: 'Final' }] },
  { id: 43, word: 'SPLASH',   imageLabel: 'Splash',   targetPhonemes: [{ phoneme: '/spl/', position: 'Initial' }, { phoneme: '/ʃ/', position: 'Final' }] },
  { id: 44, word: 'SNAKE',    imageLabel: 'Snake',    targetPhonemes: [{ phoneme: '/sn/', position: 'Initial' }, { phoneme: '/k/', position: 'Final' }] },
  { id: 45, word: 'SLED',     imageLabel: 'Sled',     targetPhonemes: [{ phoneme: '/sl/', position: 'Initial' }, { phoneme: '/d/', position: 'Final' }] },
  { id: 46, word: 'SQUIRREL', imageLabel: 'Squirrel', targetPhonemes: [{ phoneme: '/skw/', position: 'Initial' }, { phoneme: '/r/', position: 'Medial' }, { phoneme: '/l/', position: 'Final' }] },
  { id: 47, word: 'SCRATCH',  imageLabel: 'Scratch',  targetPhonemes: [{ phoneme: '/skr/', position: 'Initial' }, { phoneme: '/tʃ/', position: 'Final' }] },
];
```

Scoring engine with simplified normative table (embed all age bands):
```javascript
// client/src/utils/gfta3Scoring.js
const normativeData = {
  '5:0-5:11': { mean: 100, sd: 15, rawToSS: { 0:130,1:128,2:125,3:122,4:119,5:116,6:113,7:110,8:108,9:105,10:103,11:101,12:99,13:97,14:95,15:93,16:91,17:89,18:87,19:85,20:83,21:81,22:79,23:77,24:75,25:73,26:71,27:69,28:67,29:65,30:63,31:62,32:61,33:60,34:59,35:58,36:57,37:56,38:55,39:54,40:53 } },
  '6:0-6:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:127,4:122,6:117,8:112,10:107,12:103,14:99,16:95,18:91,20:87,22:83,24:79,26:75,28:71,30:67,32:63,34:60,36:57,38:54,40:52 } },
  '7:0-7:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:126,4:121,6:116,8:111,10:106,12:101,14:97,16:93,18:89,20:85,22:81,24:77,26:73,28:70,30:66,32:63,34:60,36:57,38:55,40:52 } },
  '8:0-8:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:125,4:120,6:115,8:110,10:105,12:100,14:96,16:92,18:88,20:84,22:80,24:76,26:72,28:69,30:66,32:63,34:60,36:57,38:55,40:52 } },
  '9:0-9:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:124,4:118,6:113,8:108,10:103,12:98,14:94,16:90,18:86,20:82,22:78,24:74,26:70,28:67,30:64,32:61,34:59,36:57,38:55,40:52 } },
};

function getAgeBand(dob) {
  const ageYears = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
  const ageMonths = Math.floor(((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000) - ageYears) * 12);
  if (ageYears === 5) return '5:0-5:11';
  if (ageYears === 6) return '6:0-6:11';
  if (ageYears === 7) return '7:0-7:11';
  if (ageYears === 8) return '8:0-8:11';
  if (ageYears === 9) return '9:0-9:11';
  return '8:0-8:11'; // fallback
}

function interpolateSS(rawToSS, rawScore) {
  const keys = Object.keys(rawToSS).map(Number).sort((a,b) => a-b);
  if (rawToSS[rawScore] !== undefined) return rawToSS[rawScore];
  let lower = keys.filter(k => k <= rawScore).pop();
  let upper = keys.filter(k => k > rawScore)[0];
  if (lower === undefined) return rawToSS[keys[0]];
  if (upper === undefined) return rawToSS[keys[keys.length-1]];
  const ratio = (rawScore - lower) / (upper - lower);
  return Math.round(rawToSS[lower] + ratio * (rawToSS[upper] - rawToSS[lower]));
}

function ssToPercentile(ss) {
  // Normal distribution approximation
  const z = (ss - 100) / 15;
  const pct = Math.round(50 * (1 + Math.sign(z) * (1 - Math.exp(-2 * z * z / Math.PI))));
  return Math.max(1, Math.min(99, pct));
}

export function classifySeverity(ss) {
  if (ss >= 115) return { label: 'Above Average', color: 'green', badge: 'success' };
  if (ss >= 86)  return { label: 'Within Normal Limits', color: 'blue', badge: 'info' };
  if (ss >= 78)  return { label: 'Borderline / Mild Impairment', color: 'yellow', badge: 'warning' };
  if (ss >= 71)  return { label: 'Moderate Impairment', color: 'orange', badge: 'orange' };
  return { label: 'Severe Impairment', color: 'red', badge: 'destructive' };
}

export function calculateGFTA3(rawScore, dob) {
  const band = getAgeBand(dob);
  const table = normativeData[band];
  const standardScore = table ? interpolateSS(table.rawToSS, rawScore) : 85;
  const percentile = ssToPercentile(standardScore);
  const severity = classifySeverity(standardScore);
  return {
    standardScore,
    percentile,
    severity,
    confidenceInterval: [Math.max(40, standardScore - 5), Math.min(160, standardScore + 5)],
    ageBand: band
  };
}
```

Save the completed assessment to the backend:
```javascript
// In AssessmentNew.jsx — on "Save to Patient Record"
const saveAssessment = useMutation({
  mutationFn: (data) => api.post('/api/assessments', data).then(r => r.data),
  onSuccess: () => {
    queryClient.invalidateQueries(['assessments', patientId]);
    toast.success('Assessment saved to patient record');
    navigate(`/patients/${patientId}?tab=assessments`);
  }
});

// Call it with full data:
saveAssessment.mutate({
  patientId,
  testName: 'GFTA-3',
  subtest: selectedSubtest,
  dateAdministered: new Date(),
  rawScore: totalErrors,
  standardScore: results.standardScore,
  percentile: results.percentile,
  severityLabel: results.severity.label,
  rawData: { responses, errors: extractErrors(responses) }
});
```

### 4D. SOAP Note — Complete with Helper Chips and HEP

```jsx
// client/src/pages/SOAPNote.jsx — complete the missing pieces

// Helper chip sets per domain
const helperChips = {
  S: [
    'Parent reports improvement at home',
    'Patient motivated and engaged',
    'Fatigue noted mid-session',
    'Home practice completed as assigned',
    'Patient reports difficulty with school tasks',
    'Parent concerned about peer interactions',
  ],
  O: {
    phonology: ['Correct production in isolation', 'Consistent substitution pattern', 'Stimulable for target', 'No stimulability noted'],
    fluency:   ['Syllables stuttered: ___%', 'Easy Onset used __/10', 'Secondary behaviors: none', 'Secondary behaviors: eye contact avoidance'],
    language:  ['MLU: ___', 'Complex sentences: ___/10', 'WH-questions: ___% correct', 'Following directions: ___ step'],
    voice:     ['Vocal quality: WNL', 'Hoarseness noted', 'Hypernasality present', 'Pitch: WNL'],
  },
  A: [
    'Patient making measurable progress toward goals',
    'Performance consistent with previous session',
    'Regression noted — see plan for adjustment',
    'Goal criterion met — advancing to next level',
    'Plateau observed — consider alternative approach',
  ],
  P: [
    'Continue current treatment plan',
    'Advance to next difficulty level',
    'Reduce cuing level',
    'Increase session frequency to 2x/week',
    'Consult with school team',
    'Schedule parent coaching session',
  ]
};

// HEP Exercise Library
const exerciseLibrary = [
  { id: 'EX001', name: '/r/ Flashcard Practice', description: 'Practice target words 3x each using provided cards.', defaultFrequency: 'Daily — 10 minutes', domain: 'Articulation' },
  { id: 'EX002', name: 'Easy Onset Reading', description: 'Read one paragraph aloud using Easy Onset technique.', defaultFrequency: 'Daily — 5 minutes', domain: 'Fluency' },
  { id: 'EX003', name: 'Storytime Language Practice', description: 'Read a book together; child retells story in full sentences.', defaultFrequency: '3x per week', domain: 'Language' },
  { id: 'EX004', name: '3-Step Direction Following', description: 'Give 3-step directions during daily routines (e.g., "Get your shoes, put them by the door, then wash your hands").', defaultFrequency: 'Daily', domain: 'Language' },
  { id: 'EX005', name: 'Vocal Hygiene Reminder', description: 'Drink 8 glasses of water. Avoid whispering or shouting.', defaultFrequency: 'Daily', domain: 'Voice' },
];

// In the component, add HEP builder:
function HEPBuilder({ selectedExercises, onAdd, onRemove }) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Home Exercise Program</h4>
        <Button size="sm" variant="outline" onClick={() => setLibraryOpen(true)}>+ Add Exercise</Button>
      </div>
      {selectedExercises.map(ex => (
        <div key={ex.id} className="flex items-start gap-3 p-3 border rounded-lg mb-2">
          <div className="flex-1">
            <p className="text-sm font-medium">{ex.name}</p>
            <p className="text-xs text-muted-foreground">{ex.description}</p>
            <p className="text-xs text-muted-foreground mt-1">📅 {ex.frequency || ex.defaultFrequency}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onRemove(ex.id)}>✕</Button>
        </div>
      ))}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Exercise Library</DialogTitle></DialogHeader>
          {exerciseLibrary.map(ex => (
            <div key={ex.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
              <div>
                <p className="text-sm font-medium">{ex.name}</p>
                <Badge variant="outline" className="text-xs">{ex.domain}</Badge>
              </div>
              <Button size="sm" onClick={() => { onAdd(ex); setLibraryOpen(false); }}>Add</Button>
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Persist exercises to backend when saving:
```javascript
const saveSession = useMutation({
  mutationFn: (data) => api.patch(`/api/sessions/${sessionId}`, data).then(r => r.data),
  onSuccess: () => {
    // Save HEP exercises as HomeExercise records
    for (const ex of selectedExercises) {
      api.post('/api/exercises', { patientId, ...ex });
    }
    queryClient.invalidateQueries(['sessions']);
    toast.success('Session note saved');
  }
});
```

### 4E. Goals Page — Real Progress History

```jsx
// client/src/pages/Goals.jsx
export default function GoalsPage() {
  const { id: patientId } = useParams();

  const { data: goals } = useQuery({
    queryKey: ['goals', patientId],
    queryFn: () => api.get(`/api/goals/patient/${patientId}`).then(r => r.data)
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Goals & Progress</h2>
        <CreateGoalDialog patientId={patientId} />
      </div>
      {goals?.map(goal => <GoalCard key={goal.id} goal={goal} />)}
    </div>
  );
}

function GoalCard({ goal }) {
  const { data: history } = useQuery({
    queryKey: ['goalProgress', goal.id],
    queryFn: () => api.get(`/api/goals/${goal.id}/progress`).then(r => r.data)
  });

  const chartData = history?.map(h => ({
    date: new Date(h.recordedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    value: h.value,
    target: goal.target
  })) || [];

  const [recordProgress, setRecordProgress] = useState(false);
  const [newValue, setNewValue] = useState(goal.current);
  const queryClient = useQueryClient();

  const updateProgress = useMutation({
    mutationFn: (value) => api.post(`/api/goals/${goal.id}/progress`, { value }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goalProgress', goal.id]);
      queryClient.invalidateQueries(['goals', goal.patientId]);
      setRecordProgress(false);
      toast.success('Progress recorded');
    }
  });

  const statusColors = { IN_PROGRESS: 'amber', MET: 'green', NOT_MET: 'red', ON_HOLD: 'gray' };
  const statusLabels = { IN_PROGRESS: '🟡 In Progress', MET: '🟢 Met', NOT_MET: '🔴 Not Met', ON_HOLD: '⏸ On Hold' };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{goal.domain}</Badge>
              <Badge className={`bg-${statusColors[goal.status]}-100 text-${statusColors[goal.status]}-800`}>
                {statusLabels[goal.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{goal.goalText}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setRecordProgress(true)}>Record Progress</Button>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Baseline: {goal.baseline}%</span>
            <span>Current: {goal.current}%</span>
            <span>Target: {goal.target}%</span>
          </div>
          <Progress value={(goal.current / goal.target) * 100} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 1 && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReferenceLine y={goal.target} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'Target', position: 'right', fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke={goal.current >= goal.target ? '#10B981' : '#F59E0B'} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
      {recordProgress && (
        <CardFooter className="border-t pt-4">
          <div className="flex items-center gap-3 w-full">
            <label className="text-sm font-medium">New %:</label>
            <input type="number" min={0} max={100} value={newValue} onChange={e => setNewValue(Number(e.target.value))}
              className="w-20 border rounded px-2 py-1 text-sm" />
            <Button size="sm" onClick={() => updateProgress.mutate(newValue)}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setRecordProgress(false)}>Cancel</Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
```

### 4F. Billing Dashboard — Wire Scrubber

```jsx
// client/src/pages/Billing.jsx
const scrubClaim = useMutation({
  mutationFn: (claimData) => api.post('/api/billing/scrub', claimData).then(r => r.data),
  onSuccess: (result) => setScrubResult(result)
});

// In the UI — Claim Scrubber section:
function ClaimScrubber() {
  const [cptCodes, setCptCodes] = useState(['92507']);
  const [icd10Codes, setIcd10Codes] = useState(['F80.0']);
  const [modifiers, setModifiers] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [result, setResult] = useState(null);

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/api/patients').then(r => r.data)
  });

  return (
    <Card>
      <CardHeader><CardTitle>Claim Scrubber</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Patient</label>
          <select className="w-full border rounded px-3 py-2 mt-1" value={patientId} onChange={e => setPatientId(e.target.value)}>
            <option value="">Select patient...</option>
            {patients?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">CPT Codes (comma-separated)</label>
          <input className="w-full border rounded px-3 py-2 mt-1" value={cptCodes.join(', ')}
            onChange={e => setCptCodes(e.target.value.split(',').map(s => s.trim()))} />
        </div>
        <div>
          <label className="text-sm font-medium">ICD-10 Codes</label>
          <input className="w-full border rounded px-3 py-2 mt-1" value={icd10Codes.join(', ')}
            onChange={e => setIcd10Codes(e.target.value.split(',').map(s => s.trim()))} />
        </div>
        <Button onClick={() => scrubClaim.mutate({ cptCodes, icd10Codes, modifiers, patientId })}>
          Run Claim Scrub
        </Button>

        {result && (
          <div className="mt-4 space-y-2">
            {result.issues.length === 0 ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                <CheckCircle size={16} /> Claim passed all validation checks
              </div>
            ) : result.issues.map((issue, i) => (
              <div key={i} className={`flex items-start gap-2 p-3 rounded-lg ${issue.severity === 'ERROR' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p className="text-sm">{issue.message}</p>
              </div>
            ))}
            {result.suggestedModifiers.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-800">Suggested Modifiers:</p>
                <div className="flex gap-2 mt-1">{result.suggestedModifiers.map(m => <Badge key={m}>{m}</Badge>)}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4G. Parent Portal — Real Data + Working Actions

```jsx
// client/src/pages/Portal.jsx
export default function ParentPortal() {
  const { user } = useStore();

  // Get the patient linked to this parent
  const { data: patient } = useQuery({
    queryKey: ['myChild'],
    queryFn: () => api.get('/api/patients/my-child').then(r => r.data)
  });

  const { data: exercises } = useQuery({
    queryKey: ['exercises', patient?.id],
    queryFn: () => api.get(`/api/exercises/patient/${patient?.id}`).then(r => r.data),
    enabled: !!patient?.id
  });

  const { data: goals } = useQuery({
    queryKey: ['goals', patient?.id],
    queryFn: () => api.get(`/api/goals/patient/${patient?.id}`).then(r => r.data),
    enabled: !!patient?.id
  });

  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => api.get('/api/messages').then(r => r.data)
  });

  const { data: appointment } = useQuery({
    queryKey: ['nextAppointment'],
    queryFn: () => api.get('/api/appointments/next').then(r => r.data)
  });

  const queryClient = useQueryClient();

  const markComplete = useMutation({
    mutationFn: (id) => api.patch(`/api/exercises/${id}/complete`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries(['exercises', patient?.id])
  });

  const sendMessage = useMutation({
    mutationFn: (data) => api.post('/api/messages', data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries(['messages'])
  });

  if (!patient) return <PortalSkeleton />;

  const goalsMetCount = goals?.filter(g => g.status === 'MET').length || 0;
  const totalGoals = goals?.length || 1;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6">
        <h1 className="text-2xl font-bold">Welcome, {patient.guardianName?.split(' ')[0]}! 👋</h1>
        <p className="text-blue-100 mt-1">Here's {patient.name}'s latest progress.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progress Card */}
        <Card>
          <CardHeader><CardTitle>Goal Progress</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-6">
            <PieChart width={120} height={120}>
              <Pie data={[{ value: goalsMetCount }, { value: totalGoals - goalsMetCount }]} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value">
                <Cell fill="#10B981" /><Cell fill="#E5E7EB" />
              </Pie>
            </PieChart>
            <div>
              <p className="text-3xl font-bold">{Math.round((goalsMetCount / totalGoals) * 100)}%</p>
              <p className="text-sm text-muted-foreground">goals met ({goalsMetCount}/{totalGoals})</p>
              {goals?.filter(g => g.status === 'IN_PROGRESS').map(g => (
                <div key={g.id} className="mt-2">
                  <p className="text-xs font-medium">{g.domain}</p>
                  <Progress value={(g.current / g.target) * 100} className="h-1.5 mt-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Appointment */}
        <Card>
          <CardHeader><CardTitle>Next Appointment</CardTitle></CardHeader>
          <CardContent>
            {appointment ? (
              <div>
                <p className="text-lg font-semibold">
                  {new Date(appointment.startTime).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-muted-foreground">
                  {new Date(appointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} — {appointment.type}
                </p>
                {appointment.isTelepractice && (
                  <Button className="mt-3 w-full" onClick={() => window.open(appointment.dailyRoomUrl, '_blank')}>
                    <Video size={16} className="mr-2" /> Join Teletherapy Session
                  </Button>
                )}
              </div>
            ) : <p className="text-muted-foreground">No upcoming appointments scheduled.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Home Exercises */}
      <Card>
        <CardHeader><CardTitle>Home Exercises</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exercises?.map(ex => (
            <div key={ex.id} className={`p-4 border rounded-xl ${ex.completedAt ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{ex.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ex.description}</p>
                  <p className="text-xs text-blue-600 mt-2">📅 {ex.frequency}</p>
                </div>
                {ex.completedAt ? (
                  <Badge className="bg-green-100 text-green-800 shrink-0">✓ Done</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => markComplete.mutate(ex.id)}>Mark Complete</Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Secure Messages */}
      <Card>
        <CardHeader><CardTitle>Messages with Dr. Kulkarni</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {messages?.map(msg => (
              <div key={msg.id} className={`flex ${msg.fromUserId === user.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${msg.fromUserId === user.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  <p className="font-medium text-xs mb-1 opacity-70">{msg.subject}</p>
                  <p>{msg.body}</p>
                  <p className="text-xs opacity-60 mt-1">{new Date(msg.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
          <ReplyComposer patientId={patient.id} onSend={sendMessage.mutate} />
        </CardContent>
      </Card>
    </div>
  );
}
```

Add **`/api/patients/my-child`** endpoint (parent-scoped):
```javascript
router.get('/my-child', authenticate, authorize('PARENT'), async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { parentUserId: req.user.id },
    include: { assignedSlp: { include: { user: { select: { email: true } } } } }
  });
  if (!patient) return res.status(404).json({ error: 'No patient linked to this account' });
  res.json(patient);
});
```

Add **`/api/appointments/next`** endpoint:
```javascript
router.get('/next', authenticate, async (req, res) => {
  // For parents — find next appointment for their child
  let patientId;
  if (req.user.role === 'PARENT') {
    const patient = await prisma.patient.findFirst({ where: { parentUserId: req.user.id } });
    patientId = patient?.id;
  }
  const appt = await prisma.appointment.findFirst({
    where: { startTime: { gte: new Date() }, ...(patientId ? { patientId } : {}) },
    orderBy: { startTime: 'asc' }
  });
  res.json(appt);
});
```

### 4H. IEP Module — Working Scheduler and Export

```jsx
// client/src/pages/IEP.jsx
export default function IEPModule() {
  const { data: students, isLoading } = useQuery({
    queryKey: ['iepStudents'],
    queryFn: () => api.get('/api/iep/students').then(r => r.data)
  });

  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const scheduleScreening = useMutation({
    mutationFn: (data) => api.post('/api/iep/schedule-screening', data).then(r => r.data),
    onSuccess: () => { setSchedulerOpen(false); toast.success('Screening scheduled'); }
  });

  const exportReport = async (studentId) => {
    const res = await api.get(`/api/iep/progress-report/${studentId}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url;
    a.download = `IEP_Progress_Report_${studentId}.pdf`; a.click();
  };

  const exportBulk = async () => {
    const res = await api.post('/api/iep/bulk-export', { studentIds: selectedStudents }, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url;
    a.download = 'IEP_Progress_Summary.pdf'; a.click();
  };

  if (isLoading) return <Skeleton />;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">IEP Coordinator</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSchedulerOpen(true)}>📅 Schedule Screening</Button>
          {selectedStudents.length > 0 && (
            <Button onClick={exportBulk}>📄 Export {selectedStudents.length} Reports (PDF)</Button>
          )}
        </div>
      </div>

      {/* Student Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"><input type="checkbox" onChange={e => setSelectedStudents(e.target.checked ? students.map(s => s.id) : [])} /></TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Disorder</TableHead>
              <TableHead>IEP Due</TableHead>
              <TableHead>Goal Progress</TableHead>
              <TableHead>Last Session</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students?.map(student => {
              const daysUntilDue = Math.ceil((new Date(student.iepDueDate) - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <TableRow key={student.id}>
                  <TableCell><input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={e => setSelectedStudents(prev => e.target.checked ? [...prev, student.id] : prev.filter(id => id !== student.id))} /></TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell><Badge variant="outline">{student.disorder}</Badge></TableCell>
                  <TableCell>
                    <span className={`text-sm ${daysUntilDue <= 14 ? 'text-red-600 font-semibold' : daysUntilDue <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {daysUntilDue <= 0 ? '⚠️ OVERDUE' : `${daysUntilDue}d`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={student.currentGoalPercent} className="w-20 h-2" />
                      <span className="text-xs">{student.currentGoalPercent}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(student.lastSession).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => exportReport(student.id)}>📄 Export</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Scheduling Dialog */}
      <Dialog open={schedulerOpen} onOpenChange={setSchedulerOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Bulk Screening</DialogTitle></DialogHeader>
          <BulkScheduler students={students} onSchedule={scheduleScreening.mutate} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Add IEP routes to `server/routes/iep.js`:
```javascript
router.get('/students', authenticate, authorize('SCHOOL_COORDINATOR', 'ADMIN'), async (req, res) => {
  const students = await prisma.iepStudent.findMany({ orderBy: { iepDueDate: 'asc' } });
  res.json(students);
});

router.post('/schedule-screening', authenticate, authorize('SCHOOL_COORDINATOR', 'ADMIN'), async (req, res) => {
  const { date, room, studentIds } = req.body;
  // Create appointments for each student
  const appointments = await Promise.all(studentIds.map((sid, i) =>
    prisma.appointment.create({
      data: {
        patientId: null, // IEP screening — no patient record yet
        clinicianId: req.user.clinicianId,
        startTime: new Date(new Date(date).getTime() + i * 30 * 60 * 1000), // 30 min slots
        durationMinutes: 30,
        type: 'IEP Screening',
        status: 'SCHEDULED'
      }
    })
  ));
  res.json({ scheduled: appointments.length });
});
```

### 4I. New Screen: Admin Scheduling — `/scheduling`

```jsx
// client/src/pages/Scheduling.jsx
export default function Scheduling() {
  const [viewDate, setViewDate] = useState(new Date());
  const dateStr = viewDate.toISOString().split('T')[0];

  const { data: appointments } = useQuery({
    queryKey: ['appointments', dateStr],
    queryFn: () => api.get(`/api/appointments?date=${dateStr}`).then(r => r.data)
  });

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/api/patients').then(r => r.data)
  });

  const createAppointment = useMutation({
    mutationFn: (data) => api.post('/api/appointments', data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries(['appointments'])
  });

  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8am to 5pm

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Appointment Scheduling</h2>
        <NewAppointmentDialog patients={patients} onSubmit={createAppointment.mutate} />
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => setViewDate(d => new Date(d.getTime() - 86400000))}>←</Button>
        <h3 className="text-lg font-semibold">{viewDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
        <Button variant="outline" onClick={() => setViewDate(d => new Date(d.getTime() + 86400000))}>→</Button>
        <Button variant="ghost" onClick={() => setViewDate(new Date())}>Today</Button>
      </div>

      {/* Time Grid */}
      <div className="border rounded-xl overflow-hidden">
        {hours.map(hour => {
          const hourAppts = appointments?.filter(a => new Date(a.startTime).getHours() === hour) || [];
          return (
            <div key={hour} className="flex border-b">
              <div className="w-16 p-3 text-xs text-muted-foreground bg-gray-50 border-r">
                {hour > 12 ? `${hour-12}pm` : hour === 12 ? '12pm' : `${hour}am`}
              </div>
              <div className="flex-1 p-2 min-h-14">
                {hourAppts.map(appt => (
                  <div key={appt.id} className={`px-3 py-2 rounded-lg text-sm mb-1 ${appt.isTelepractice ? 'bg-purple-100 border border-purple-200' : 'bg-blue-100 border border-blue-200'}`}>
                    <span className="font-medium">{appt.patient?.name}</span>
                    <span className="text-muted-foreground ml-2">{appt.type} — {appt.durationMinutes}min</span>
                    <Badge className="ml-2" variant={appt.status === 'COMPLETED' ? 'secondary' : 'default'}>{appt.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 4J. New Screen: Audit Logs — `/audit-logs` (ADMIN only)

```jsx
// client/src/pages/AuditLogs.jsx
export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data } = useQuery({
    queryKey: ['auditLogs', page, actionFilter],
    queryFn: () => api.get(`/api/audit-logs?page=${page}&limit=50${actionFilter ? `&action=${actionFilter}` : ''}`).then(r => r.data)
  });

  const actionColors = {
    LOGIN: 'bg-blue-100 text-blue-800',
    VIEW_PATIENT: 'bg-gray-100 text-gray-800',
    SIGN_NOTE: 'bg-green-100 text-green-800',
    VIEW_BILLING: 'bg-amber-100 text-amber-800',
    EXPORT: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Audit Logs</h2>
      <div className="flex gap-3 mb-4">
        {['', 'LOGIN', 'VIEW_PATIENT', 'SIGN_NOTE', 'VIEW_BILLING'].map(a => (
          <Button key={a} size="sm" variant={actionFilter === a ? 'default' : 'outline'} onClick={() => setActionFilter(a)}>
            {a || 'All'}
          </Button>
        ))}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.logs?.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString('en-IN')}
                </TableCell>
                <TableCell className="text-sm">{log.user?.email}</TableCell>
                <TableCell><Badge variant="outline">{log.user?.role}</Badge></TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-100'}`}>{log.action}</span></TableCell>
                <TableCell className="text-sm">{log.resource}{log.resourceId ? ` #${log.resourceId.slice(0,8)}` : ''}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{JSON.stringify(log.details)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-between items-center p-4 border-t">
          <p className="text-sm text-muted-foreground">{data?.total} total events</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p-1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page === data?.totalPages} onClick={() => setPage(p => p+1)}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

### 4K. Patient List Page — `/patients`

```jsx
// client/src/pages/PatientList.jsx
export default function PatientList() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/api/patients').then(r => r.data)
  });

  const filtered = patients?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.diagnoses.some(d => d.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Patients</h2>
        <Button onClick={() => navigate('/patients/new')}>+ New Patient</Button>
      </div>
      <div className="mb-4">
        <input
          placeholder="Search by name or diagnosis..."
          className="w-full border rounded-xl px-4 py-2"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>
      {isLoading ? <PatientListSkeleton /> : (
        <div className="space-y-3">
          {filtered.map(p => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/patients/${p.id}`)}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date().getFullYear() - new Date(p.dob).getFullYear()} years • {p.insuranceCarrier}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {p.diagnoses.map(d => <Badge key={d} variant="outline" className="text-xs">{d.split('—')[0].trim()}</Badge>)}
                  </div>
                </div>
                <ChevronRight className="text-muted-foreground" size={18} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## PHASE 5 — PDF GENERATION (Reports + IEP Export)

Install: `npm install pdfkit --save` (server-side)

```javascript
// server/routes/reports.js
import PDFDocument from 'pdfkit';

router.get('/iep/progress-report/:studentId', authenticate, authorize('SCHOOL_COORDINATOR', 'ADMIN', 'SLP'), async (req, res) => {
  const student = await prisma.iepStudent.findUnique({ where: { id: req.params.studentId } });
  const patient = student?.patientId ? await prisma.patient.findUnique({
    where: { id: student.patientId },
    include: { goals: { include: { progressHistory: { orderBy: { recordedAt: 'desc' }, take: 1 } } } }
  }) : null;

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=IEP_Report_${student.name.replace(' ','_')}.pdf`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('SpeechSync', 50, 50);
  doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('FERPA-Compliant Progress Report', 50, 75);
  doc.moveTo(50, 95).lineTo(545, 95).stroke('#E5E7EB');

  // Student Info
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#111827').text('IEP Progress Summary', 50, 115);
  doc.fontSize(11).font('Helvetica').fillColor('#374151');
  doc.text(`Student: ${student.name}`, 50, 145);
  doc.text(`Grade: ${student.grade}`, 50, 162);
  doc.text(`Primary Disorder: ${student.disorder}`, 50, 179);
  doc.text(`IEP Due: ${new Date(student.iepDueDate).toLocaleDateString('en-IN')}`, 50, 196);
  doc.text(`Report Generated: ${new Date().toLocaleDateString('en-IN')}`, 50, 213);

  // Goals
  if (patient?.goals?.length) {
    doc.fontSize(14).font('Helvetica-Bold').text('Current Goals', 50, 250);
    let y = 275;
    for (const goal of patient.goals) {
      doc.fontSize(10).font('Helvetica-Bold').text(goal.domain, 50, y);
      doc.font('Helvetica').text(goal.goalText, 50, y + 15, { width: 495 });
      const pct = Math.round((goal.current / goal.target) * 100);
      doc.text(`Progress: ${goal.current}% of ${goal.target}% target (${pct}% of goal met) — Status: ${goal.status}`, 50, y + 40);
      // Progress bar
      doc.rect(50, y + 58, 495, 8).fillColor('#E5E7EB').fill();
      doc.rect(50, y + 58, 495 * (goal.current / 100), 8).fillColor(goal.status === 'MET' ? '#10B981' : '#F59E0B').fill();
      doc.fillColor('#374151');
      y += 90;
      if (y > 700) { doc.addPage(); y = 50; }
    }
  }

  // Compliance Footer
  doc.fontSize(8).fillColor('#9CA3AF').text('This document is FERPA-compliant. Generated by SpeechSync Clinical Platform. HIPAA compliant. AES-256 encrypted at rest.', 50, 750, { width: 495, align: 'center' });

  doc.end();

  // Audit log
  await prisma.auditLog.create({ data: { userId: req.user.id, action: 'EXPORT', resource: 'IEP_REPORT', resourceId: req.params.studentId, details: { studentName: student.name } } });
});
```

---

## PHASE 6 — TELETHERAPY: REAL DAILY.CO EMBED

Replace the Google Meet placeholder with a proper Daily.co iframe:

```jsx
// client/src/pages/Teletherapy.jsx
export default function Teletherapy() {
  const { sessionId } = useParams();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.post('/api/teletherapy/create-room', { appointmentId: sessionId })
      .then(r => { setRoomData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner /> Creating secure room...</div>;

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Video Area */}
      <div className="flex-1 relative">
        {roomData?.isMock ? (
          <MockVideoRoom />
        ) : (
          <iframe
            src={`${roomData.url}?showLeaveButton=1&showFullscreenButton=1`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            title="Teletherapy Session"
          />
        )}
        {/* HIPAA Banner */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-green-400 text-xs px-4 py-1.5 rounded-full backdrop-blur">
          🔒 End-to-end encrypted (SRTP) — HIPAA compliant
        </div>
      </div>
      {/* Clinical Panel — unchanged */}
      <ClinicalPanel sessionId={sessionId} />
    </div>
  );
}
```

---

## PHASE 7 — ROUTE PROTECTION ON THE FRONTEND

```jsx
// client/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function ProtectedRoute({ children, roles }) {
  const { user, token } = useStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

// In App.jsx — wrap every route:
<Route path="/dashboard" element={<ProtectedRoute roles={['SLP', 'ADMIN']}><Dashboard /></ProtectedRoute>} />
<Route path="/patients" element={<ProtectedRoute roles={['SLP', 'ADMIN']}><PatientList /></ProtectedRoute>} />
<Route path="/billing" element={<ProtectedRoute roles={['ADMIN']}><Billing /></ProtectedRoute>} />
<Route path="/audit-logs" element={<ProtectedRoute roles={['ADMIN']}><AuditLogs /></ProtectedRoute>} />
<Route path="/portal" element={<ProtectedRoute roles={['PARENT']}><Portal /></ProtectedRoute>} />
<Route path="/iep" element={<ProtectedRoute roles={['SCHOOL_COORDINATOR']}><IEP /></ProtectedRoute>} />
<Route path="/scheduling" element={<ProtectedRoute roles={['ADMIN', 'SLP']}><Scheduling /></ProtectedRoute>} />
```

---

## PHASE 8 — LOADING STATES & CRASH FIXES

Every page must handle the case where data is not yet loaded. Apply this pattern universally:

```jsx
// Skeleton components for each page — create these:
function PatientProfileSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/4" />
      <div className="mt-6 h-40 bg-gray-200 rounded-xl" />
    </div>
  );
}

// Guard pattern — use in EVERY page that uses patient data:
const { selectedPatient } = useStore();
if (!selectedPatient) return (
  <div className="p-6 text-center">
    <p className="text-muted-foreground">No patient selected.</p>
    <Button className="mt-4" onClick={() => navigate('/patients')}>Select a Patient</Button>
  </div>
);
```

---

## PHASE 9 — UPDATE SIDEBAR FOR ALL NEW SCREENS

```jsx
// client/src/components/layout/Sidebar.jsx — complete nav items by role:

const navByRole = {
  SLP: [
    { label: 'Dashboard',    path: '/dashboard',    icon: Home },
    { label: 'Patients',     path: '/patients',     icon: Users },
    { label: 'Assessments',  path: '/assessments/new', icon: ClipboardList },
    { label: 'SOAP Notes',   path: '/sessions/new', icon: FileText },
    { label: 'Teletherapy',  path: '/teletherapy',  icon: Video },
    { label: 'Goals',        path: '/goals',        icon: TrendingUp },
    { label: 'Scheduling',   path: '/scheduling',   icon: Calendar },
    { label: 'Settings',     path: '/settings',     icon: Settings },
  ],
  ADMIN: [
    { label: 'Dashboard',    path: '/dashboard',    icon: Home },
    { label: 'Patients',     path: '/patients',     icon: Users },
    { label: 'Scheduling',   path: '/scheduling',   icon: Calendar },
    { label: 'Billing',      path: '/billing',      icon: CreditCard },
    { label: 'Reports',      path: '/reports',      icon: BarChart2 },
    { label: 'Audit Logs',   path: '/audit-logs',   icon: Shield },
    { label: 'Settings',     path: '/settings',     icon: Settings },
  ],
  PARENT: [
    { label: 'My Child',     path: '/portal',       icon: Heart },
    { label: 'Messages',     path: '/portal#messages', icon: MessageCircle },
  ],
  SCHOOL_COORDINATOR: [
    { label: 'IEP Dashboard', path: '/iep',         icon: GraduationCap },
    { label: 'Students',      path: '/iep/students', icon: Users },
  ],
};
```

---

## PHASE 10 — FINAL QUALITY CHECKLIST

Before demo, verify every item:

- [ ] `npx prisma migrate dev && npx prisma db seed` completes without errors
- [ ] Login as each of 4 roles — correct dashboard loads
- [ ] Dashboard shows today's 5 appointments from database
- [ ] Click Aanya Sharma → tabs load real assessment, goals, sessions data
- [ ] Start GFTA-3 → administer all 47 items → scoring calculates → saves to DB
- [ ] SOAP Note editor → AI Scribe streams Groq response → fills fields → Save works
- [ ] Goals page → progress line chart shows history from DB → Record Progress → chart updates
- [ ] Billing → Claim Scrubber → submits to backend → shows real issues → KX badge for Aanya
- [ ] Parent portal → exercises show → Mark Complete → updates in real time
- [ ] IEP → student table loads → Export PDF downloads real content
- [ ] Admin → Audit Logs shows real events → Scheduling page shows time grid
- [ ] No browser `alert()` calls — use `toast.success/error` instead
- [ ] No pages crash on direct URL navigation
- [ ] HIPAA banner visible on every clinical screen
- [ ] `.env` is NOT committed — `.env.example` is

---

## DEPENDENCY ADDITIONS

Add to `client/package.json`:
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "react-hot-toast": "^2.4.0",
    "framer-motion": "^11.0.0"
  }
}
```

Add to `server/package.json`:
```json
{
  "dependencies": {
    "pdfkit": "^0.15.0",
    "express-rate-limit": "^7.0.0",
    "express-validator": "^7.0.0"
  }
}
```

Add rate limiting to server:
```javascript
import rateLimit from 'express-rate-limit';
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
```

---

## README (Add This)

````markdown
# SpeechSync — Setup & Demo Guide

## Quick Start

```bash
# 1. Clone and install
git clone <repo>; cd speechsync
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and JWT_SECRET

# 3. Set up database
cd server && npx prisma migrate dev --name init && npx prisma db seed

# 4. Run dev servers
cd .. && npm run dev  # starts both client (5173) and server (5000)
```

## Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| SLP | slp@speechsync.in | slp123 |
| Admin | admin@speechsync.in | admin123 |
| Parent | parent@speechsync.in | parent123 |
| School | school@speechsync.in | school123 |

## Hackathon Demo Path
1. Login as SLP → Dashboard (5 real appointments, insurance alert)
2. Click Aanya Sharma → Profile tabs with real data
3. New GFTA-3 → 47 stimuli → auto-score → save to DB
4. SOAP Note → AI Scribe (Groq streaming) → Sign note
5. Teletherapy → clinical panel + stimulus sharing
6. Goals → live chart → record progress
7. Logout → Admin → Billing scrubber → audit logs
8. Logout → Parent → mark exercise complete → send message
````

---

*SpeechSync Completion Prompt for AGTechathon 2.0 2k26*  
*A.G. Patil Institute of Technology, Solapur*  
*Target completion: From 52% → 95% MVP*