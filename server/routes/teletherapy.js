// server/routes/teletherapy.js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/teletherapy/create-room — create teletherapy room URL
router.post('/create-room', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { appointmentId, sessionId } = req.body;
  const resolvedApptId = appointmentId || sessionId;

  if (!resolvedApptId) {
    return res.status(400).json({ error: 'appointmentId is required' });
  }

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: resolvedApptId }
    });

    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if room URL already exists and is a Jitsi URL
    if (appt.dailyRoomUrl && appt.dailyRoomUrl.includes('8x8.vc')) {
      return res.json({ url: appt.dailyRoomUrl, roomName: `speechsync-${resolvedApptId}` });
    }

    // TODO: Add JITSI_API_KEY and JITSI_JWT_TOKEN to your .env file
    const JITSI_API_KEY = process.env.JITSI_API_KEY || "YOUR_JITSI_API_KEY";
    const JITSI_JWT_TOKEN = process.env.JITSI_JWT_TOKEN || "YOUR_JITSI_JWT_TOKEN";
    const jitsiUrl = `https://8x8.vc/${JITSI_API_KEY}/speechsync-${resolvedApptId}?jwt=${JITSI_JWT_TOKEN}`;

    await prisma.appointment.update({
      where: { id: resolvedApptId },
      data: { dailyRoomUrl: jitsiUrl } // using existing field for backward compatibility
    });

    res.json({ url: jitsiUrl, roomName: `speechsync-${resolvedApptId}` });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teletherapy/create-session — create Jitsi video session
router.post('/create-session', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId is required' });

  try {
    let clinicianId = req.user.id;
    if (req.user.role === 'SLP') {
      const clinician = await prisma.clinician.findUnique({ where: { userId: req.user.id } });
      if (clinician) clinicianId = clinician.id;
    }

    const roomId = `speechsync-${patientId}-${Date.now()}`;
    const meetingUrl = `https://meet.jit.si/${roomId}`;

    const session = await prisma.session.create({
      data: {
        patientId,
        clinicianId,
        dateOfService: new Date(),
        durationMinutes: 0,
        cptCode: '',
        status: 'DRAFT',
        sessionType: 'VIDEO_CALL',
        meetingProvider: 'JITSI',
        meetingUrl,
        meetingRoomId: roomId,
        telehealthSession: true
      }
    });

    res.json({
      sessionId: session.id,
      sessionType: 'VIDEO_CALL',
      meetingUrl
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teletherapy/create-direct-session — create AI workspace session directly
router.post('/create-direct-session', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId is required' });

  try {
    let clinicianId = req.user.id;
    if (req.user.role === 'SLP') {
      const clinician = await prisma.clinician.findUnique({ where: { userId: req.user.id } });
      if (clinician) clinicianId = clinician.id;
    }

    const session = await prisma.session.create({
      data: {
        patientId,
        clinicianId,
        dateOfService: new Date(),
        durationMinutes: 0,
        cptCode: '',
        status: 'DRAFT',
        sessionType: 'DIRECT_AI',
        telehealthSession: false
      }
    });

    res.json({
      sessionId: session.id,
      sessionType: 'DIRECT_AI'
    });
  } catch (error) {
    console.error('Create direct session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teletherapy/end-session — mark a session ended
router.post('/end-session', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { sessionId, duration } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        meetingDuration: duration || 0,
        durationMinutes: duration ? Math.ceil(duration / 60) : 0
      }
    });

    res.json({ success: true, session });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
