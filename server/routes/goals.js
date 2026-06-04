import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/goals — get all goals
router.get('/', authenticate, async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
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
    const goals = await prisma.goal.findMany();
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
        details: { patientId: goal.patientId, current: accuracyNum, status: updatedGoal.status }
      }
    });

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

    res.json(updated);
  } catch (error) {
    console.error('Update goal progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
