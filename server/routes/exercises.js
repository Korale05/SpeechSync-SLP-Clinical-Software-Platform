import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/exercises — get exercises (supporting query param patientId or all)
router.get('/', authenticate, async (req, res) => {
  try {
    const { patientId } = req.query;
    
    let whereClause = {};
    if (patientId) {
      whereClause.patientId = patientId;
    } else if (req.user.role === 'PARENT') {
      const patient = await prisma.patient.findFirst({
        where: { parentUserId: req.user.id }
      });
      if (patient) {
        whereClause.patientId = patient.id;
      }
    }

    const exercises = await prisma.homeExercise.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    res.json(exercises);
  } catch (error) {
    console.error('Fetch exercises error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/exercises/patient/:patientId
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const exercises = await prisma.homeExercise.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(exercises);
  } catch (error) {
    console.error('Fetch exercises by patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/exercises — create/assign home exercise (SLP only)
router.post('/', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  try {
    const { patientId, name, description, frequency, dueDate } = req.body;
    
    const clinician = await prisma.clinician.findUnique({
      where: { userId: req.user.id }
    });

    const ex = await prisma.homeExercise.create({
      data: {
        patientId,
        name,
        description,
        frequency,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedBy: clinician ? clinician.id : 'ADMIN'
      }
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ASSIGN_EXERCISE',
        resource: 'EXERCISE',
        resourceId: ex.id,
        details: { patientId, name }
      }
    });

    res.status(201).json(ex);
  } catch (error) {
    console.error('Create exercise error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/exercises/:id/complete — mark exercise as complete
router.patch('/:id/complete', authenticate, async (req, res) => {
  try {
    const ex = await prisma.homeExercise.update({
      where: { id: req.params.id },
      data: { completedAt: new Date() }
    });
    res.json(ex);
  } catch (error) {
    console.error('Complete exercise error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/exercises/:id/status — update status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { completed } = req.body;
    const ex = await prisma.homeExercise.update({
      where: { id: req.params.id },
      data: { completedAt: completed ? new Date() : null }
    });
    res.json(ex);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
