import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { emitToPatientRoom } from '../socket.js';

const router = Router();
const prisma = new PrismaClient();

async function canAccessSession(user, session) {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'SLP') {
    const clinician = await prisma.clinician.findUnique({
      where: { userId: user.id }
    });
    return !!clinician && session.clinicianId === clinician.id;
  }
  if (user.role === 'PARENT') {
    const patient = session.patient || await prisma.patient.findUnique({
      where: { id: session.patientId },
      select: { parentUserId: true }
    });
    return patient?.parentUserId === user.id;
  }
  if (user.role === 'SCHOOL_COORDINATOR') {
    const school = await prisma.school.findUnique({ where: { userId: user.id } });
    if (!school) return false;
    const mapping = await prisma.schoolPatientMapping.findUnique({
      where: { schoolId_patientId: { schoolId: school.id, patientId: session.patientId } }
    });
    return !!mapping;
  }
  return false;
}

// Get all sessions
router.get('/', authenticate, async (req, res) => {
  try {
    let sessions;

    if (req.user.role === 'PARENT') {
      sessions = await prisma.session.findMany({
        where: {
          patient: {
            parentUserId: req.user.id
          }
        },
        include: { patient: true },
        orderBy: { dateOfService: 'desc' },
      });
    } else if (req.user.role === 'SLP') {
      const clinician = await prisma.clinician.findUnique({
        where: { userId: req.user.id },
      });
      if (!clinician) {
        return res.status(404).json({ error: 'Clinician profile not found' });
      }

      sessions = await prisma.session.findMany({
        where: { clinicianId: clinician.id },
        include: { patient: true },
        orderBy: { dateOfService: 'desc' },
      });
    } else if (req.user.role === 'SCHOOL_COORDINATOR') {
      const school = await prisma.school.findUnique({ where: { userId: req.user.id } });
      if (!school) {
        return res.status(404).json({ error: 'School profile not found' });
      }
      sessions = await prisma.session.findMany({
        where: {
          patient: {
            schools: {
              some: { schoolId: school.id }
            }
          }
        },
        include: { patient: true },
        orderBy: { dateOfService: 'desc' },
      });
    } else {
      // ADMIN can see all
      sessions = await prisma.session.findMany({
        include: { patient: true },
        orderBy: { dateOfService: 'desc' },
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session by ID
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const canAccess = await canAccessSession(req.user, session);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to your child\'s sessions.' });
    }

    res.json(session);
  } catch (error) {
    console.error('Fetch session by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new session (SLP/ADMIN only)
router.post('/', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { patientId, dateOfService, durationMinutes, cptCode, icd10Codes, telehealthSession, soapNote, exercises, mediaFiles, status } = req.body;

  try {
    const clinician = await prisma.clinician.findUnique({
      where: { userId: req.user.id },
    });

    if (!clinician) {
      return res.status(403).json({ error: 'Only clinicians can create sessions' });
    }

    const session = await prisma.session.create({
      data: {
        patientId,
        clinicianId: clinician.id,
        dateOfService: dateOfService ? new Date(dateOfService) : new Date(),
        durationMinutes: parseInt(durationMinutes) || 45,
        cptCode: cptCode || '92507',
        icd10Codes: icd10Codes || [],
        telehealthSession: telehealthSession || false,
        soapNote: soapNote || {},
        exercises: exercises || {},
        mediaFiles: mediaFiles || {},
        status: status || 'DRAFT',
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_SESSION',
        resource: 'SESSION',
        resourceId: session.id,
        details: { patientId }
      }
    });

    // Handle Goal Progress updates if locked
    if ((status === 'LOCKED' || status === 'SIGNED') && req.body.goalProgressUpdates?.length > 0) {
      for (const update of req.body.goalProgressUpdates) {
        // Create progress history record
        await prisma.goalProgress.create({
          data: {
            goalId: update.goalId,
            value: parseInt(update.value) || 0,
            notes: `Progress logged from session ${session.id}`
          }
        });
        
        // Update the Goal's current value and potentially status
        const goal = await prisma.goal.findUnique({ where: { id: update.goalId } });
        if (goal) {
          const newVal = parseInt(update.value) || 0;
          const newStatus = newVal >= goal.target ? 'MET' : 'IN_PROGRESS';
          await prisma.goal.update({
            where: { id: goal.id },
            data: { current: newVal, status: newStatus }
          });
        }
      }
    }

    emitToPatientRoom(patientId, 'session_created', session);

    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update session
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { dateOfService, durationMinutes, cptCode, icd10Codes, telehealthSession, soapNote, exercises, mediaFiles, status } = req.body;

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { patient: true }
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const canAccess = await canAccessSession(req.user, session);
    if (!canAccess || req.user.role === 'PARENT') {
      return res.status(403).json({ error: 'Forbidden: Cannot modify this session.' });
    }

    // A signed/locked session cannot be edited unless by ADMIN (or check compliance)
    if (session.status === 'LOCKED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Locked sessions cannot be edited' });
    }

    const updateData = {};
    if (dateOfService) updateData.dateOfService = new Date(dateOfService);
    if (durationMinutes !== undefined) updateData.durationMinutes = parseInt(durationMinutes);
    if (cptCode) updateData.cptCode = cptCode;
    if (icd10Codes) updateData.icd10Codes = icd10Codes;
    if (telehealthSession !== undefined) updateData.telehealthSession = telehealthSession;
    if (soapNote) updateData.soapNote = soapNote;
    if (exercises) updateData.exercises = exercises;
    if (mediaFiles) updateData.mediaFiles = mediaFiles;
    if (status) updateData.status = status;

    const updatedSession = await prisma.session.update({
      where: { id },
      data: updateData,
    });

    // Audit Log
    if (status === 'LOCKED' || status === 'SIGNED') {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'SIGN_SOAP_NOTE',
          resource: 'SESSION',
          resourceId: id,
          details: { patientId: session.patientId }
        }
      });
    } else {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'UPDATE_SESSION',
          resource: 'SESSION',
          resourceId: id,
          details: { patientId: session.patientId }
        }
      });
    }

    // Handle Goal Progress updates if locking
    if ((status === 'LOCKED' || status === 'SIGNED') && req.body.goalProgressUpdates?.length > 0) {
      for (const update of req.body.goalProgressUpdates) {
        // Prevent duplicate progress for same session if editing
        const existingProgress = await prisma.goalProgress.findFirst({
          where: { goalId: update.goalId, notes: { contains: session.id } }
        });
        
        if (existingProgress) {
          await prisma.goalProgress.update({
            where: { id: existingProgress.id },
            data: { value: parseInt(update.value) || 0 }
          });
        } else {
          await prisma.goalProgress.create({
            data: {
              goalId: update.goalId,
              value: parseInt(update.value) || 0,
              notes: `Progress logged from session ${session.id}`
            }
          });
        }
        
        // Update the Goal's current value and potentially status
        const goal = await prisma.goal.findUnique({ where: { id: update.goalId } });
        if (goal) {
          const newVal = parseInt(update.value) || 0;
          const newStatus = newVal >= goal.target ? 'MET' : 'IN_PROGRESS';
          await prisma.goal.update({
            where: { id: goal.id },
            data: { current: newVal, status: newStatus }
          });
        }
      }
    }

    emitToPatientRoom(session.patientId, 'session_updated', updatedSession);

    res.json(updatedSession);
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete session
router.delete('/:id', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { patient: true }
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const canAccess = await canAccessSession(req.user, session);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Cannot delete this session.' });
    }

    if (session.status === 'LOCKED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Locked sessions cannot be deleted' });
    }

    await prisma.session.delete({ where: { id } });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_SESSION',
        resource: 'SESSION',
        resourceId: id,
        details: { patientId: session.patientId }
      }
    });

    emitToPatientRoom(session.patientId, 'session_deleted', { id });

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
