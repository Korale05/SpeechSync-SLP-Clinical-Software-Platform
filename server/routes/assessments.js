import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';

const router = Router();
const prisma = new PrismaClient();

// Helper to convert standard score to percentile (Mean=100, SD=15)
function ssToPercentile(ss) {
  const z = (ss - 100) / 15;
  // CDF approximation of standard normal distribution
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const cdf = z >= 0 ? 1 - p : p;
  return Math.max(1, Math.min(99, Math.round(cdf * 100)));
}

// Helper to classify severity based on standard score
function classifySeverity(ss) {
  if (ss >= 115) return 'Above Average';
  if (ss >= 86)  return 'Within Normal Range';
  if (ss >= 78)  return 'Borderline / Mild Impairment';
  if (ss >= 71)  return 'Moderate Impairment';
  return 'Severe Impairment';
}

// Get all assessments
router.get('/', authenticate, async (req, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
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

    // Automated Scoring Engine
    let standardScore = 100;
    let percentile = 50;
    let severityLabel = 'Within Normal Range';

    if (testName === 'GFTA-3') {
      // In GFTA-3, raw score is number of errors.
      // Higher errors = lower standard score.
      // Maximum errors typically 47 (Sounds-in-Words).
      const errors = parseFloat(rawScore) || 0;
      standardScore = Math.max(40, Math.min(115, Math.round(115 - (errors * 1.8))));
      percentile = ssToPercentile(standardScore);
      severityLabel = classifySeverity(standardScore);
    } else if (testName === 'CELF-5') {
      // For CELF-5 Mini: rawScore could be scaled score sum.
      // Let's assume standard score maps from a raw sum of scores.
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

    res.status(201).json(assessment);
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
