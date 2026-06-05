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

async function canAccessAppointment(user, appointment) {
  return canAccessPatient(user, appointment.patientId);
}

// GET /api/appointments/today — returns today's appointments for the logged-in SLP
router.get('/today', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    
    // Find the clinician profile for the logged in user
    const clinician = await prisma.clinician.findUnique({
      where: { userId: req.user.id }
    });

    if (!clinician && req.user.role !== 'ADMIN') {
      return res.status(404).json({ error: 'Clinician profile not found' });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        ...(req.user.role !== 'ADMIN' ? { clinicianId: clinician.id } : {}),
        startTime: { gte: start, lte: end }
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            dob: true,
            diagnoses: true,
            medicareCap: true,
            medicareSpent: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    console.error('Fetch today appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/next — returns the next upcoming appointment
router.get('/next', authenticate, async (req, res) => {
  try {
    let patientId;
    if (req.user.role === 'PARENT') {
      const patient = await prisma.patient.findFirst({
        where: { parentUserId: req.user.id }
      });
      if (!patient) {
        return res.status(404).json({ error: 'No linked patient found for this parent' });
      }
      patientId = patient.id;
    }

    const appt = await prisma.appointment.findFirst({
      where: {
        startTime: { gte: new Date() },
        ...(patientId ? { patientId } : {})
      },
      orderBy: { startTime: 'asc' },
      include: {
        patient: {
          select: { name: true }
        }
      }
    });
    res.json(appt);
  } catch (error) {
    console.error('Fetch next appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments — returns appointments (optional date filter)
router.get('/', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    let whereClause = {};

    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      whereClause.startTime = { gte: start, lte: end };
    }

    if (req.user.role === 'PARENT') {
      whereClause.patient = { parentUserId: req.user.id };
    }

    // Filter by clinician if role is SLP
    if (req.user.role === 'SLP') {
      const clinician = await prisma.clinician.findUnique({
        where: { userId: req.user.id }
      });
      if (clinician) {
        whereClause.clinicianId = clinician.id;
      }
    } else if (req.user.role === 'SCHOOL_COORDINATOR') {
      return res.status(403).json({ error: 'Forbidden: Appointment access is restricted.' });
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: {
          select: { id: true, name: true, dob: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    console.error('Fetch appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/:id — retrieve single appointment
router.get('/:id', authenticate, async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            dob: true,
            diagnoses: true
          }
        },
        session: true
      }
    });
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    const canAccess = await canAccessAppointment(req.user, appt);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned appointments.' });
    }
    res.json(appt);
  } catch (error) {
    console.error('Fetch appointment by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/appointments — create appointment (Admin/SLP)
router.post('/', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  try {
    const { patientId, clinicianId, startTime, durationMinutes, type, status, isTelepractice } = req.body;
    const canAccess = await canAccessPatient(req.user, patientId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Cannot schedule this patient.' });
    }
    
    let resolvedClinicianId = clinicianId;
    if (!resolvedClinicianId && req.user.role === 'SLP') {
      const clinician = await prisma.clinician.findUnique({
        where: { userId: req.user.id }
      });
      resolvedClinicianId = clinician?.id;
    }

    // Create a draft session if not an IEP screening
    let createdSession = null;
    if (patientId) {
      createdSession = await prisma.session.create({
        data: {
          patientId,
          clinicianId: resolvedClinicianId,
          dateOfService: new Date(startTime),
          durationMinutes: parseInt(durationMinutes),
          cptCode: type === 'Evaluation' ? '92523' : '92507',
          icd10Codes: [],
          status: 'DRAFT',
          telehealthSession: !!isTelepractice,
          exercises: []
        }
      });
    }

    const appt = await prisma.appointment.create({
      data: {
        patientId,
        clinicianId: resolvedClinicianId,
        startTime: new Date(startTime),
        durationMinutes: parseInt(durationMinutes),
        type,
        status: status || 'SCHEDULED',
        isTelepractice: !!isTelepractice,
        sessionId: createdSession ? createdSession.id : null,
      }
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_APPOINTMENT',
        resource: 'APPOINTMENT',
        resourceId: appt.id,
        details: { patientId, startTime, type }
      }
    });

    res.status(201).json(appt);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/appointments/:id/status — update appointment status
router.patch('/:id/status', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  try {
    const { status, dailyRoomUrl } = req.body;
    const statusVal = typeof status === 'object' ? status?.status : status;
    const roomUrlVal = typeof status === 'object' ? status?.dailyRoomUrl : dailyRoomUrl;

    const existingAppt = await prisma.appointment.findUnique({
      where: { id: req.params.id }
    });

    if (!existingAppt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    const canAccess = await canAccessAppointment(req.user, existingAppt);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Cannot update this appointment.' });
    }

    let sessionId = existingAppt.sessionId;
    if (statusVal === 'COMPLETED' && !sessionId) {
      const session = await prisma.session.create({
        data: {
          patientId: existingAppt.patientId,
          clinicianId: existingAppt.clinicianId,
          dateOfService: existingAppt.startTime,
          durationMinutes: existingAppt.durationMinutes,
          cptCode: existingAppt.type === 'Evaluation' ? '92523' : '92507',
          icd10Codes: [],
          status: 'DRAFT',
          telehealthSession: existingAppt.isTelepractice,
          exercises: []
        }
      });
      sessionId = session.id;
    }

    const appt = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        ...(statusVal ? { status: statusVal } : {}),
        ...(roomUrlVal ? { dailyRoomUrl: roomUrlVal } : {}),
        ...(sessionId ? { sessionId } : {})
      }
    });
    res.json(appt);
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/appointments/:id/status — update appointment status
router.put('/:id/status', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  try {
    const { status, dailyRoomUrl } = req.body;
    const statusVal = typeof status === 'object' ? status?.status : status;
    const roomUrlVal = typeof status === 'object' ? status?.dailyRoomUrl : dailyRoomUrl;

    const existingAppt = await prisma.appointment.findUnique({
      where: { id: req.params.id }
    });

    if (!existingAppt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    const canAccess = await canAccessAppointment(req.user, existingAppt);
    if (!canAccess) {
      return res.status(403).json({ error: 'Forbidden: Cannot update this appointment.' });
    }

    let sessionId = existingAppt.sessionId;
    if (statusVal === 'COMPLETED' && !sessionId) {
      const session = await prisma.session.create({
        data: {
          patientId: existingAppt.patientId,
          clinicianId: existingAppt.clinicianId,
          dateOfService: existingAppt.startTime,
          durationMinutes: existingAppt.durationMinutes,
          cptCode: existingAppt.type === 'Evaluation' ? '92523' : '92507',
          icd10Codes: [],
          status: 'DRAFT',
          telehealthSession: existingAppt.isTelepractice,
          exercises: []
        }
      });
      sessionId = session.id;
    }

    const appt = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        ...(statusVal ? { status: statusVal } : {}),
        ...(roomUrlVal ? { dailyRoomUrl: roomUrlVal } : {}),
        ...(sessionId ? { sessionId } : {})
      }
    });
    res.json(appt);
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
