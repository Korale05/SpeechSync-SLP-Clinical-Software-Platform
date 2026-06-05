import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
const prisma = new PrismaClient();

// Get all billing records
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const billing = await prisma.billingRecord.findMany({
      include: { patient: true },
      orderBy: { dateOfService: 'desc' },
    });
    res.json(billing);
  } catch (error) {
    console.error('Fetch billing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get billing alerts (medicare cap limit thresholds)
router.get('/alerts', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      select: { id: true, name: true, medicareCap: true, medicareSpent: true }
    });
    const kxAlerts = patients
      .filter(p => p.medicareSpent >= p.medicareCap - 200)
      .map(p => ({
        patientId: p.id,
        patientName: p.name,
        cap: p.medicareCap,
        spent: p.medicareSpent
      }));
    res.json({ kxAlerts });
  } catch (error) {
    console.error('Fetch billing alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get billing records for a specific patient
router.get('/patient/:patientId', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { patientId } = req.params;
  try {
    const billing = await prisma.billingRecord.findMany({
      where: { patientId },
      orderBy: { dateOfService: 'desc' },
    });
    res.json(billing);
  } catch (error) {
    console.error('Fetch patient billing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create billing record
router.post('/', authenticate, authorize('ADMIN', 'SLP'), async (req, res) => {
  const { patientId, sessionId, dateOfService, cptCodes, icd10Codes, billedAmount, status, modifiers, notes } = req.body;

  try {
    const billingRecord = await prisma.billingRecord.create({
      data: {
        patientId,
        sessionId: sessionId || null,
        dateOfService: dateOfService ? new Date(dateOfService) : new Date(),
        cptCodes: cptCodes || [],
        icd10Codes: icd10Codes || [],
        billedAmount: parseFloat(billedAmount) || 0.0,
        paidAmount: null,
        status: status || 'PENDING',
        modifiers: modifiers || [],
        notes: notes || null,
      },
    });

    res.status(201).json(billingRecord);
  } catch (error) {
    console.error('Create billing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update billing record (adjust status, record payment)
router.put('/:id', authenticate, authorize('ADMIN', 'SLP'), async (req, res) => {
  const { id } = req.params;
  const { status, paidAmount, modifiers, billedAmount, notes, paymentDetails } = req.body;

  try {
    const record = await prisma.billingRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    const data = {};
    if (status) data.status = status;
    if (paidAmount !== undefined) data.paidAmount = paidAmount !== null ? parseFloat(paidAmount) : null;
    if (modifiers) data.modifiers = modifiers;
    if (billedAmount !== undefined) data.billedAmount = parseFloat(billedAmount);
    if (notes !== undefined) data.notes = notes;
    if (paymentDetails !== undefined) data.paymentDetails = paymentDetails;

    const updated = await prisma.billingRecord.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update billing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete billing record
router.delete('/:id', authenticate, authorize('ADMIN', 'SLP'), async (req, res) => {
  const { id } = req.params;
  try {
    const record = await prisma.billingRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    await prisma.billingRecord.delete({ where: { id } });
    res.json({ message: 'Billing record deleted successfully' });
  } catch (error) {
    console.error('Delete billing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Claim Scrubber Endpoint
router.post('/scrub', authenticate, authorize('ADMIN', 'SLP'), async (req, res) => {
  const { cptCodes, icd10Codes, modifiers = [], patientId } = req.body;
  const issues = [];
  const suggestions = [];

  try {
    // NCCI bundle checks
    const ncciConflicts = {
      '92521': ['31575'], // Fluency eval cannot be billed with rhinoscopy
      '92522': ['92521'], // Speech sound eval + fluency eval = conflict
      '92523': ['92522', '92521'], // Comprehensive = all subtests included
      '92507': ['92508'], // Individual + group
    };
    for (const [code, conflicts] of Object.entries(ncciConflicts)) {
      if (cptCodes.includes(code)) {
        const found = conflicts.filter(c => cptCodes.includes(c));
        if (found.length) {
          issues.push({
            severity: 'ERROR',
            code,
            conflict: found,
            message: `NCCI conflict: ${code} cannot be billed with ${found.join(', ')}`
          });
        }
      }
    }

    // KX modifier check
    if (patientId) {
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (patient && patient.medicareSpent >= patient.medicareCap - 200) {
        if (!modifiers.includes('KX')) {
          issues.push({
            severity: 'WARNING',
            message: `Patient approaching Medicare cap ($${patient.medicareSpent}/$${patient.medicareCap}). KX modifier required.`
          });
          suggestions.push('KX');
        }
      }
    }

    // GN modifier check (speech-language services must have GN)
    const slpCpts = ['92507', '92508', '92521', '92522', '92523', '92526', '97550', '97551'];
    if (cptCodes.some(c => slpCpts.includes(c)) && !modifiers.includes('GN')) {
      issues.push({
        severity: 'WARNING',
        message: 'GN modifier required for all SLP services billed to Medicare/Medicaid.'
      });
      suggestions.push('GN');
    }

    const passed = issues.filter(i => i.severity === 'ERROR').length === 0;
    
    res.json({
      // AddBillModal contract
      passed,
      issues,
      suggestedModifiers: [...new Set([...modifiers, ...suggestions])],
      // Billing.jsx contract
      clean: passed,
      flags: issues.map(i => i.message),
      suggestions: suggestions
    });
  } catch (error) {
    console.error('Claim scrubbing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
