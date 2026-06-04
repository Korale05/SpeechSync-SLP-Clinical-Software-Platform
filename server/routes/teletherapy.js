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

    // Check if room URL already exists
    if (appt.dailyRoomUrl) {
      return res.json({ url: appt.dailyRoomUrl, roomName: `speechsync-${resolvedApptId}`, isMock: !process.env.DAILY_CO_API_KEY });
    }

    if (!process.env.DAILY_CO_API_KEY) {
      // Mock response for demo without Daily.co key
      const mockUrl = `https://meet.google.com/mock-${resolvedApptId}`;
      await prisma.appointment.update({
        where: { id: resolvedApptId },
        data: { dailyRoomUrl: mockUrl }
      });
      return res.json({ url: mockUrl, roomName: `speechsync-${resolvedApptId}`, isMock: true });
    }

    // Make request to Daily.co API
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DAILY_CO_API_KEY}`
      },
      body: JSON.stringify({
        name: `speechsync-${resolvedApptId}-${Date.now()}`,
        privacy: 'private',
        properties: {
          exp: Math.round(Date.now() / 1000) + 3600, // 1 hour expiration
          enable_recording: 'cloud',
          enable_screenshare: true,
          max_participants: 4
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Daily.co API error, falling back to mock:', errorText);
      const mockUrl = `https://meet.google.com/mock-${resolvedApptId}`;
      await prisma.appointment.update({
        where: { id: resolvedApptId },
        data: { dailyRoomUrl: mockUrl }
      });
      return res.json({ url: mockUrl, roomName: `speechsync-${resolvedApptId}`, isMock: true });
    }

    const room = await response.json();

    // Save room URL to appointment
    await prisma.appointment.update({
      where: { id: resolvedApptId },
      data: { dailyRoomUrl: room.url }
    });

    res.json({ url: room.url, roomName: room.name, isMock: false });
  } catch (error) {
    console.error('Create room error:', error);
    // Fallback to mock on error
    const mockUrl = `https://meet.google.com/mock-${resolvedApptId}`;
    try {
      await prisma.appointment.update({
        where: { id: resolvedApptId },
        data: { dailyRoomUrl: mockUrl }
      });
    } catch (e) {}
    res.json({ url: mockUrl, roomName: `speechsync-${resolvedApptId}`, isMock: true });
  }
});

export default router;
