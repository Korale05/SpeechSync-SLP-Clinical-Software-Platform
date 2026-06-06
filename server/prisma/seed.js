import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with real demo data...');

  // Clean up existing data to prevent duplicate unique key/relation errors
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.iepStudent.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.homeExercise.deleteMany();
  await prisma.billingRecord.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.goalProgress.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.session.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.clinician.deleteMany();
  await prisma.user.deleteMany();

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

  // ── PARENT & SCHOOL MAPPINGS ─────────────────────────────────────────────────
  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      name: 'Priya Sharma',
      email: 'parent@speechsync.in',
      phone: '+91 98765 43210',
      relationship: 'Mother'
    }
  });

  await prisma.parentPatientMapping.upsert({
    where: { parentId_patientId: { parentId: parent.id, patientId: 'P001' } },
    update: {},
    create: { parentId: parent.id, patientId: 'P001' }
  });

  const school = await prisma.school.upsert({
    where: { userId: schoolUser.id },
    update: {},
    create: {
      userId: schoolUser.id,
      name: 'Sunrise International School',
      coordinatorName: 'Ms. Anita Desai',
      email: 'school@speechsync.in',
      phone: '+91 80000 00000'
    }
  });

  const schoolStudents = ['P001', 'P002', 'P003', 'P004'];
  for (const pId of schoolStudents) {
    await prisma.schoolPatientMapping.upsert({
      where: { schoolId_patientId: { schoolId: school.id, patientId: pId } },
      update: {},
      create: { schoolId: school.id, patientId: pId }
    });
  }

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

  // ── SESSIONS ─────────────────────────────────────────────────────────────────
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
    prisma.session.upsert({
      where: { id: 'S004' },
      update: {},
      create: {
        id: 'S004', patientId: 'P001', clinicianId: clinician.id,
        dateOfService: new Date(),
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

  // ── APPOINTMENTS ─────────────────────────────────────────────────────────────
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

  // ── IEP STUDENTS ─────────────────────────────────────────────────────────────
  const students = [
    { id: 'ST001', name: 'Aanya Sharma', grade: '3rd', disorder: 'Phonological Disorder', iepDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), currentGoalPercent: 62, lastSession: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), patientId: 'P001' },
    { id: 'ST002', name: 'Rohan Mehta', grade: '4th', disorder: 'Fluency Disorder', iepDueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), currentGoalPercent: 55, lastSession: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), patientId: 'P002' },
    { id: 'ST003', name: 'Kavya Reddy', grade: '5th', disorder: 'Language Disorder', iepDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), currentGoalPercent: 44, lastSession: new Date(), patientId: 'P003' },
    { id: 'ST004', name: 'Arjun Patel', grade: '8th', disorder: 'Autism + Language', iepDueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), currentGoalPercent: 38, lastSession: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), patientId: 'P004' },
  ];
  for (const s of students) {
    await prisma.iepStudent.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  // ── MESSAGES ─────────────────────────────────────────────────────────────────
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

  // ── INVOICES & PAYMENTS ──────────────────────────────────────────────────────
  const fifteenDaysAgo = new Date(); fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const twelveDaysAgo = new Date(); twelveDaysAgo.setDate(twelveDaysAgo.getDate() - 12);
  const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const fiveDaysAgo = new Date(); fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fourDaysAgo = new Date(); fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
  const nineDaysFromNow = new Date(); nineDaysFromNow.setDate(nineDaysFromNow.getDate() + 9);
  const twentyDaysAgo = new Date(); twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
  const sixDaysAgo = new Date(); sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twelveDaysFromNow = new Date(); twelveDaysFromNow.setDate(twelveDaysFromNow.getDate() + 12);

  // Invoice 1 (PAID)
  const inv1 = await prisma.invoice.create({
    data: {
      id: 'I001',
      patientId: 'P001',
      invoiceNumber: 'SS-20260520-4829',
      invoiceDate: fifteenDaysAgo,
      dueDate: oneDayAgo,
      subtotal: 6000,
      taxAmount: 1080,
      totalAmount: 7080,
      paidAmount: 7080,
      balanceAmount: 0,
      status: 'PAID',
      notes: 'Payment received via GPay. Thank you!',
      createdBy: 'admin@speechsync.in'
    }
  });
  await prisma.invoiceItem.createMany({
    data: [
      { invoiceId: 'I001', description: 'Speech Assessment', quantity: 1, rate: 3000, amount: 3000 },
      { invoiceId: 'I001', description: 'Speech Therapy Session', quantity: 2, rate: 1500, amount: 3000 }
    ]
  });
  await prisma.payment.create({
    data: {
      invoiceId: 'I001',
      patientId: 'P001',
      amount: 7080,
      paymentMethod: 'UPI',
      transactionId: 'UPI982347239',
      paymentDate: twelveDaysAgo,
      notes: 'GPay transfer confirmed'
    }
  });

  // Invoice 2 (PARTIALLY_PAID)
  const inv2 = await prisma.invoice.create({
    data: {
      id: 'I002',
      patientId: 'P001',
      invoiceNumber: 'SS-20260530-1092',
      invoiceDate: fiveDaysAgo,
      dueDate: nineDaysFromNow,
      subtotal: 3000,
      taxAmount: 540,
      totalAmount: 3540,
      paidAmount: 1500,
      balanceAmount: 2040,
      status: 'PARTIALLY_PAID',
      notes: 'Initial cash payment. Balance due on completion.',
      createdBy: 'admin@speechsync.in'
    }
  });
  await prisma.invoiceItem.createMany({
    data: [
      { invoiceId: 'I002', description: 'Teletherapy Session', quantity: 2, rate: 1500, amount: 3000 }
    ]
  });
  await prisma.payment.create({
    data: {
      invoiceId: 'I002',
      patientId: 'P001',
      amount: 1500,
      paymentMethod: 'Cash',
      transactionId: null,
      paymentDate: fourDaysAgo,
      notes: 'Paid at desk'
    }
  });

  // Invoice 3 (OVERDUE)
  const inv3 = await prisma.invoice.create({
    data: {
      id: 'I003',
      patientId: 'P002',
      invoiceNumber: 'SS-20260515-7731',
      invoiceDate: twentyDaysAgo,
      dueDate: sixDaysAgo,
      subtotal: 4500,
      taxAmount: 810,
      totalAmount: 5310,
      paidAmount: 0,
      balanceAmount: 5310,
      status: 'OVERDUE',
      notes: 'Please pay within 7 days of service.',
      createdBy: 'admin@speechsync.in'
    }
  });
  await prisma.invoiceItem.createMany({
    data: [
      { invoiceId: 'I003', description: 'Speech Therapy Session', quantity: 3, rate: 1500, amount: 4500 }
    ]
  });

  // Invoice 4 (PENDING)
  const inv4 = await prisma.invoice.create({
    data: {
      id: 'I004',
      patientId: 'P003',
      invoiceNumber: 'SS-20260602-9912',
      invoiceDate: twoDaysAgo,
      dueDate: twelveDaysFromNow,
      subtotal: 5000,
      taxAmount: 900,
      totalAmount: 5900,
      paidAmount: 0,
      balanceAmount: 5900,
      status: 'PENDING',
      notes: 'Evaluations billing schedule.',
      createdBy: 'admin@speechsync.in'
    }
  });
  await prisma.invoiceItem.createMany({
    data: [
      { invoiceId: 'I004', description: 'Comprehensive Language Evaluation', quantity: 1, rate: 5000, amount: 5000 }
    ]
  });

  console.log('✅ Database seeded successfully with full real demo data.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
