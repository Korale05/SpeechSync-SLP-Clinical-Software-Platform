import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { emitToUser, emitToPatientRoom } from '../socket.js';

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

// GET /api/goals — get all goals
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
      return res.status(403).json({ error: 'Forbidden: Goals access is restricted.' });
    }

    const goals = await prisma.goal.findMany({
      where: whereClause,
      include: { patient: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  } catch (error) {
    console.error('Fetch goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/goals/weekly-summary — returns goal attainment weekly summary for dashboard
router.get('/weekly-summary', authenticate, async (req, res) => {
  try {
    let whereClause = {};

    if (req.user.role === 'SLP') {
      const clinician = await prisma.clinician.findUnique({
        where: { userId: req.user.id }
      });
      if (clinician) {
        whereClause = {
          patient: {
            assignedSlpId: clinician.id
          }
        };
      }
    } else if (req.user.role === 'PARENT') {
      whereClause = {
        patient: {
          parentUserId: req.user.id
        }
      };
    }

    const goals = await prisma.goal.findMany({
      where: whereClause
    });
    const total = goals.length;
    const met = goals.filter(g => g.status === 'MET').length;
    const inProgress = total - met;
    const metPercentage = total > 0 ? Math.round((met / total) * 100) : 0;
    const inProgressPercentage = total > 0 ? 100 - metPercentage : 100;
    
    res.json({
      total,
      met,
      inProgress,
      metPercentage,
      inProgressPercentage
    });
  } catch (error) {
    console.error('Goal weekly summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/goals/patient/:patientId — get goals for a specific patient
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const canAccess = await canAccessPatient(req.user, req.params.patientId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned patient records.' });
    }

    const goals = await prisma.goal.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (error) {
    console.error('Fetch patient goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/goals/:id/progress — returns historical progress points for charting
router.get('/:id/progress', authenticate, async (req, res) => {
  try {
    const goal = await prisma.goal.findUnique({ where: { id: req.params.id } });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    const canAccess = await canAccessPatient(req.user, goal.patientId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned patient records.' });
    }

    const history = await prisma.goalProgress.findMany({
      where: { goalId: req.params.id },
      orderBy: { recordedAt: 'asc' }
    });
    res.json(history);
  } catch (error) {
    console.error('Fetch goal progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/goals/:id/progress — records a new progress point and updates the goal's current value
router.post('/:id/progress', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;

  if (value === undefined || value === null) {
    return res.status(400).json({ error: 'value is required' });
  }

  try {
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    const canAccess = await canAccessPatient(req.user, goal.patientId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned patient records.' });
    }

    const accuracyNum = parseFloat(value);
    const isMet = accuracyNum >= goal.target;

    // Create the new progress entry
    const point = await prisma.goalProgress.create({
      data: {
        goalId: id,
        value: accuracyNum
      }
    });

    // Update goal record
    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        current: accuracyNum,
        status: isMet ? 'MET' : 'IN_PROGRESS'
      }
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_GOAL_PROGRESS',
        resource: 'GOAL',
        resourceId: id,
        details: {
          patientId: goal.patientId,
          goalText: goal.goalText,
          domain: goal.domain,
          baseline: goal.baseline,
          target: goal.target,
          oldValue: goal.current,
          newValue: accuracyNum,
          status: updatedGoal.status
        }
      }
    });

    // Notify Room
    emitToPatientRoom(goal.patientId, 'goal_updated', updatedGoal);

    res.json(point);
  } catch (error) {
    console.error('Record goal progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/goals — create goal (SLP only)
router.post('/', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { patientId, domain, goalText, baseline, target, targetDate, cptCode, icd10Code } = req.body;

  try {
    const canAccess = await canAccessPatient(req.user, patientId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Cannot create goals for this patient.' });
    }

    const goal = await prisma.goal.create({
      data: {
        patientId,
        domain,
        goalText,
        baseline: parseInt(baseline) || 0,
        target: parseInt(target) || 80,
        current: parseInt(baseline) || 0,
        status: 'IN_PROGRESS',
        targetDate: targetDate ? new Date(targetDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        cptCode: cptCode || '92507',
        icd10Code: icd10Code || '',
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_GOAL',
        resource: 'GOAL',
        resourceId: goal.id,
        details: { patientId, domain }
      }
    });

    // Notify Room
    emitToPatientRoom(patientId, 'goal_created', goal);

    res.status(201).json(goal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update goal progress accuracy (legacy handler backup)
router.put('/:id/progress', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { currentAccuracy } = req.body;

  try {
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    const canAccess = await canAccessPatient(req.user, goal.patientId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned patient records.' });
    }

    const accuracyNum = parseInt(currentAccuracy);
    const isMet = accuracyNum >= goal.target;

    await prisma.goalProgress.create({
      data: {
        goalId: id,
        value: accuracyNum
      }
    });

    const updated = await prisma.goal.update({
      where: { id },
      data: {
        current: accuracyNum,
        status: isMet ? 'MET' : 'IN_PROGRESS',
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_GOAL_PROGRESS',
        resource: 'GOAL',
        resourceId: id,
        details: {
          patientId: goal.patientId,
          goalText: goal.goalText,
          domain: goal.domain,
          baseline: goal.baseline,
          target: goal.target,
          oldValue: goal.current,
          newValue: accuracyNum,
          status: updated.status
        }
      }
    });

    emitToPatientRoom(goal.patientId, 'goal_updated', updated);

    res.json(updated);
  } catch (error) {
    console.error('Update goal progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
