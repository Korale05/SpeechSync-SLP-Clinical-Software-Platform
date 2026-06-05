import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

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

async function canAccessExercise(user, exerciseId) {
  const exercise = await prisma.homeExercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return { allowed: false, exercise: null };
  const allowed = await canAccessPatient(user, exercise.patientId);
  return { allowed, exercise };
}

// GET /api/exercises — get exercises (supporting query param patientId or all)
router.get('/', authenticate, async (req, res) => {
  try {
    const { patientId } = req.query;
    
    let whereClause = {};
    if (patientId) {
      const canAccess = await canAccessPatient(req.user, patientId);
      if (!canAccess) {
        return res.status(403).json({ error: 'Forbidden: Access restricted to assigned patient records.' });
      }
      whereClause.patientId = patientId;
    } else if (req.user.role === 'PARENT') {
      const patient = await prisma.patient.findFirst({
        where: { parentUserId: req.user.id }
      });
      if (patient) {
        whereClause.patientId = patient.id;
      }
    } else if (req.user.role === 'SLP') {
      const clinician = await prisma.clinician.findUnique({
        where: { userId: req.user.id }
      });
      if (!clinician) {
        return res.status(404).json({ error: 'Clinician profile not found' });
      }
      whereClause.patient = { assignedSlpId: clinician.id };
    } else if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Exercise access is restricted.' });
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
    const canAccess = await canAccessPatient(req.user, req.params.patientId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned patient records.' });
    }

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
    const canAccess = await canAccessPatient(req.user, patientId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Cannot assign exercises for this patient.' });
    }
    
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
    const { allowed, exercise } = await canAccessExercise(req.user, req.params.id);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned patient records.' });
    }

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
    const { allowed, exercise } = await canAccessExercise(req.user, req.params.id);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned patient records.' });
    }

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
