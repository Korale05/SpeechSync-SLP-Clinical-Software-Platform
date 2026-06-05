import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import PDFDocument from 'pdfkit';

const router = Router();
const prisma = new PrismaClient();

async function canAccessPatient(user, patientId) {
  if (user.role === 'ADMIN') return true;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { parentUserId: true, assignedSlp: { select: { userId: true } } }
  });
  if (!patient) return false;
  if (user.role === 'PARENT') return patient.parentUserId === user.id;
  if (user.role === 'SLP') return patient.assignedSlp?.userId === user.id;
  return false;
}

const normativeData = {
  '5:0-5:11': { mean: 100, sd: 15, rawToSS: { 0:130,1:128,2:125,3:122,4:119,5:116,6:113,7:110,8:108,9:105,10:103,11:101,12:99,13:97,14:95,15:93,16:91,17:89,18:87,19:85,20:83,21:81,22:79,23:77,24:75,25:73,26:71,27:69,28:67,29:65,30:63,31:62,32:61,33:60,34:59,35:58,36:57,37:56,38:55,39:54,40:53 } },
  '6:0-6:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:127,4:122,6:117,8:112,10:107,12:103,14:99,16:95,18:91,20:87,22:83,24:79,26:75,28:71,30:67,32:63,34:60,36:57,38:54,40:52 } },
  '7:0-7:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:126,4:121,6:116,8:111,10:106,12:101,14:97,16:93,18:89,20:85,22:81,24:77,26:73,28:70,30:66,32:63,34:60,36:57,38:55,40:52 } },
  '8:0-8:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:125,4:120,6:115,8:110,10:105,12:100,14:96,16:92,18:88,20:84,22:80,24:76,26:72,28:69,30:66,32:63,34:60,36:57,38:55,40:52 } },
  '9:0-9:11': { mean: 100, sd: 15, rawToSS: { 0:130,2:124,4:118,6:113,8:108,10:103,12:98,14:94,16:90,18:86,20:82,22:78,24:74,26:70,28:67,30:64,32:61,34:59,36:57,38:55,40:52 } },
};

function getAgeBand(dob) {
  const ageYears = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
  if (ageYears === 5) return '5:0-5:11';
  if (ageYears === 6) return '6:0-6:11';
  if (ageYears === 7) return '7:0-7:11';
  if (ageYears === 8) return '8:0-8:11';
  if (ageYears >= 9) return '9:0-9:11';
  return '8:0-8:11'; // fallback
}

function interpolateSS(rawToSS, rawScore) {
  const keys = Object.keys(rawToSS).map(Number).sort((a,b) => a-b);
  const intRaw = Math.round(rawScore);
  if (rawToSS[intRaw] !== undefined) return rawToSS[intRaw];
  let lower = keys.filter(k => k <= intRaw).pop();
  let upper = keys.filter(k => k > intRaw)[0];
  if (lower === undefined) return rawToSS[keys[0]];
  if (upper === undefined) return rawToSS[keys[keys.length-1]];
  const ratio = (intRaw - lower) / (upper - lower);
  return Math.round(rawToSS[lower] + ratio * (rawToSS[upper] - rawToSS[lower]));
}

// Helper to convert standard score to percentile (Mean=100, SD=15)
function ssToPercentile(ss) {
  const z = (ss - 100) / 15;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const cdf = z >= 0 ? 1 - p : p;
  return Math.max(1, Math.min(99, Math.round(cdf * 100)));
}

// Helper to classify severity based on standard score
function classifySeverity(ss) {
  if (ss >= 115) return 'Above Average';
  if (ss >= 86)  return 'Within Normal Limits';
  if (ss >= 78)  return 'Borderline / Mild Impairment';
  if (ss >= 71)  return 'Moderate Impairment';
  return 'Severe Impairment';
}

// Get all assessments
router.get('/', authenticate, async (req, res) => {
  try {
    let whereClause = {};
    if (req.user.role === 'PARENT') {
      whereClause = { patient: { parentUserId: req.user.id } };
    } else if (req.user.role === 'SLP') {
      const clinician = await prisma.clinician.findUnique({
        where: { userId: req.user.id }
      });
      if (!clinician) {
        return res.status(404).json({ error: 'Clinician profile not found' });
      }
      whereClause = { patient: { assignedSlpId: clinician.id } };
    } else if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Assessment access is restricted.' });
    }

    const assessments = await prisma.assessment.findMany({
      where: whereClause,
      include: { patient: true },
      orderBy: { dateAdministered: 'desc' },
    });
    res.json(assessments);
  } catch (error) {
    console.error('Fetch assessments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create and automatically score a new assessment
router.post('/', authenticate, async (req, res) => {
  const { patientId, testName, subtest, dateAdministered, rawScore, observations, rawData } = req.body;

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (!['SLP', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Only clinicians and admins can create assessments.' });
    }
    const canAccess = await canAccessPatient(req.user, patientId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Cannot assess this patient.' });
    }

    // Automated Scoring Engine
    let standardScore = 100;
    let percentile = 50;
    let severityLabel = 'Within Normal Range';

    if (testName === 'GFTA-3') {
      // In GFTA-3, raw score is number of errors.
      // Higher errors = lower standard score.
      const errors = parseFloat(rawScore) || 0;
      const ageBand = getAgeBand(patient.dob);
      const bandNorms = normativeData[ageBand] || normativeData['8:0-8:11'];
      standardScore = interpolateSS(bandNorms.rawToSS, errors);
      percentile = ssToPercentile(standardScore);
      severityLabel = classifySeverity(standardScore);
    } else if (testName === 'CELF-5') {
      // For CELF-5 Mini: rawScore could be scaled score sum.
      const raw = parseFloat(rawScore) || 0;
      standardScore = Math.max(40, Math.min(130, Math.round(50 + (raw * 1.5))));
      percentile = ssToPercentile(standardScore);
      severityLabel = classifySeverity(standardScore);
    }

    const assessment = await prisma.assessment.create({
      data: {
        patientId,
        testName,
        subtest: subtest || 'Core',
        dateAdministered: dateAdministered ? new Date(dateAdministered) : new Date(),
        rawScore: parseFloat(rawScore) || 0,
        standardScore,
        percentile,
        severityLabel,
        observations: observations || '',
        rawData: rawData || {},
      },
    });

    // Audit Log for assessment creation
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_ASSESSMENT',
        resource: 'ASSESSMENT',
        resourceId: assessment.id,
        details: { patientName: patient.name, testName }
      }
    });

    res.status(201).json(assessment);
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download Assessment Report PDF
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: { patient: true }
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const canAccess = await canAccessPatient(req.user, assessment.patientId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned parent account.' });
    }

    // Initialize PDF Document
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Assessment_Report_${assessment.testName.replace(/\s+/g, '_')}_${assessment.patient.name.replace(/\s+/g, '_')}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1E3A8A').text('SpeechSync', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('Standardized Clinical Assessment Report', 50, 75);
    doc.moveTo(50, 95).lineTo(545, 95).stroke('#E5E7EB');

    // Patient and Assessment Details Grid
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('Assessment Information', 50, 115);
    doc.fontSize(10).font('Helvetica').fillColor('#374151');

    const yStart = 140;
    const col1 = 50;
    const col2 = 300;

    // Info Grid
    doc.text(`Patient Name: ${assessment.patient.name}`, col1, yStart);
    doc.text(`Date of Birth: ${new Date(assessment.patient.dob).toLocaleDateString('en-IN')}`, col1, yStart + 18);
    const ageBand = getAgeBand(assessment.patient.dob);
    doc.text(`Age Band Evaluated: ${ageBand}`, col1, yStart + 36);

    doc.text(`Test Administered: ${assessment.testName}`, col2, yStart);
    doc.text(`Subtest/Component: ${assessment.subtest || 'Core'}`, col2, yStart + 18);
    doc.text(`Date Administered: ${new Date(assessment.dateAdministered).toLocaleDateString('en-IN')}`, col2, yStart + 36);

    doc.moveTo(50, yStart + 56).lineTo(545, yStart + 56).stroke('#E5E7EB');

    // Scores Section
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1E3A8A').text('Performance Metrics', 50, yStart + 75);
    
    // Scores Grid Display
    const yScore = yStart + 100;
    
    // Draw card box for Raw Score
    doc.rect(50, yScore, 100, 60).fillColor('#F3F4F6').fill().stroke('#E5E7EB');
    doc.fillColor('#374151').fontSize(8).text('RAW SCORE', 60, yScore + 10);
    doc.fillColor('#111827').fontSize(18).font('Helvetica-Bold').text(`${assessment.rawScore ?? 'N/A'}`, 60, yScore + 25);

    // Draw card box for Standard Score
    doc.rect(170, yScore, 100, 60).fillColor('#F3F4F6').fill().stroke('#E5E7EB');
    doc.font('Helvetica').fillColor('#374151').fontSize(8).text('STANDARD SCORE', 180, yScore + 10);
    doc.fillColor('#1E3A8A').fontSize(18).font('Helvetica-Bold').text(`${assessment.standardScore ?? 'N/A'}`, 180, yScore + 25);

    // Draw card box for Percentile
    doc.rect(290, yScore, 100, 60).fillColor('#F3F4F6').fill().stroke('#E5E7EB');
    doc.font('Helvetica').fillColor('#374151').fontSize(8).text('PERCENTILE RANK', 300, yScore + 10);
    doc.fillColor('#111827').fontSize(18).font('Helvetica-Bold').text(`${assessment.percentile ?? 'N/A'}%`, 300, yScore + 25);

    // Draw card box for Severity Label
    doc.rect(410, yScore, 135, 60).fillColor('#F3F4F6').fill().stroke('#E5E7EB');
    doc.font('Helvetica').fillColor('#374151').fontSize(8).text('SEVERITY CLASSIFICATION', 420, yScore + 10);
    doc.fillColor('#D97706').fontSize(11).font('Helvetica-Bold').text(`${assessment.severityLabel || 'N/A'}`, 420, yScore + 27, { width: 115 });

    // Restores font
    doc.font('Helvetica').fontSize(10).fillColor('#374151');

    let currentY = yScore + 85;

    // Standardized explanation text
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Interpretation Guideline:', 50, currentY);
    doc.font('Helvetica').fillColor('#4B5563').text(
      'Standard scores have a mean of 100 and a standard deviation of 15. Standard scores from 86 to 115 are considered within normal limits. Lower standard scores indicate greater severity of impairment.',
      50, currentY + 15, { width: 495 }
    );

    currentY += 55;

    // Observations
    if (assessment.observations) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1E3A8A').text('Clinical Observations', 50, currentY);
      doc.font('Helvetica').fontSize(10).fillColor('#374151').text(assessment.observations, 50, currentY + 20, { width: 495 });
      currentY += Math.max(50, doc.heightOfString(assessment.observations, { width: 495 }) + 30);
    }

    // Detailed responses (rawData) if present
    if (assessment.rawData && typeof assessment.rawData === 'object') {
      const dataKeys = Object.keys(assessment.rawData);
      if (dataKeys.length > 0) {
        if (currentY > 600) {
          doc.addPage();
          currentY = 50;
        }
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1E3A8A').text('Stimuli & Responses Breakdown', 50, currentY);
        currentY += 20;

        // Table Header
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#4B5563');
        doc.text('Stimulus Target', 60, currentY);
        doc.text('Result', 280, currentY);
        doc.text('Notes / Phoneme Breakdown', 380, currentY);
        doc.moveTo(50, currentY + 12).lineTo(545, currentY + 12).stroke('#D1D5DB');
        currentY += 18;

        doc.fontSize(9).font('Helvetica').fillColor('#374151');
        
        for (const item of Object.values(assessment.rawData)) {
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
            // Redraw headers on new page
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#4B5563');
            doc.text('Stimulus Target', 60, currentY);
            doc.text('Result', 280, currentY);
            doc.text('Notes / Phoneme Breakdown', 380, currentY);
            doc.moveTo(50, currentY + 12).lineTo(545, currentY + 12).stroke('#D1D5DB');
            currentY += 18;
            doc.fontSize(9).font('Helvetica').fillColor('#374151');
          }

          if (item && typeof item === 'object' && item.target) {
            doc.text(`${item.target}`, 60, currentY);
            
            const isCorrect = item.correct ?? (item.result === 'correct');
            doc.fillColor(isCorrect ? '#10B981' : '#EF4444')
               .text(isCorrect ? 'Correct' : 'Incorrect', 280, currentY)
               .fillColor('#374151');

            const errorsStr = Array.isArray(item.errors) ? item.errors.join(', ') : (item.errors || item.notes || '');
            doc.text(`${errorsStr || '-'}`, 380, currentY, { width: 165 });
            
            currentY += 18;
          }
        }
      }
    }

    // Compliance Footer
    doc.fontSize(8).fillColor('#9CA3AF').text('This document contains protected health information (PHI) protected under HIPAA rules. Generated by SpeechSync Clinical Software.', 50, 750, { width: 495, align: 'center' });

    doc.end();

    // Log this access in Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'EXPORT',
        resource: 'ASSESSMENT_REPORT',
        resourceId: assessment.id,
        details: { patientName: assessment.patient.name, testName: assessment.testName }
      }
    });

  } catch (error) {
    console.error('Download assessment PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
