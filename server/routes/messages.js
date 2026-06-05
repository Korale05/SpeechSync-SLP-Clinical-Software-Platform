import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { emitToUser } from '../socket.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/messages — inbox/outbox for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const msgs = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: req.user.id },
          { toUserId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(msgs);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/history/:userId
router.get('/history/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const msgs = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: req.user.id, toUserId: userId },
          { fromUserId: userId, toUserId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(msgs);
  } catch (error) {
    console.error('Fetch message history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages — send message
router.post('/', authenticate, async (req, res) => {
  try {
    const { toUserId, patientId, subject, body, attachmentUrl } = req.body;
    
    // Fallback/lookup logic for default SLP or Parent user if not fully specified
    let resolvedToUserId = toUserId;
    let resolvedPatientId = patientId;

    if (req.user.role === 'PARENT') {
      // Find patient linked directly via parentUserId
      const patient = await prisma.patient.findFirst({
        where: { 
          parentUserId: req.user.id,
          ...(patientId ? { id: patientId } : {}) 
        },
        include: { assignedSlp: true }
      });
      
      if (patient) {
        resolvedPatientId = patient.id;
        resolvedToUserId = patient.assignedSlp?.userId;
      }
    } else if (req.user.role === 'SLP') {
      if (patientId) {
        const patient = await prisma.patient.findUnique({
          where: { id: patientId }
        });
        
        if (patient && patient.parentUserId) {
          resolvedToUserId = patient.parentUserId;
        }
      }
    }

    if (!resolvedToUserId) {
      return res.status(400).json({ error: 'Recipient userId could not be determined.' });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participantIds: { has: req.user.id } },
          { participantIds: { has: resolvedToUserId } }
        ]
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participantIds: [req.user.id, resolvedToUserId]
        }
      });
    }

    const msg = await prisma.message.create({
      data: {
        fromUserId: req.user.id,
        toUserId: resolvedToUserId,
        patientId: resolvedPatientId || '',
        subject: subject || 'Secure message',
        body,
        attachmentUrl,
        conversationId: conversation.id
      }
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });

    // Create Notification for the recipient
    await prisma.notification.create({
      data: {
        userId: resolvedToUserId,
        title: 'New Message',
        body: `You received a new message from ${req.user.email}`,
        type: 'MESSAGE'
      }
    });

    // Emit real-time event
    emitToUser(resolvedToUserId, 'new_message', msg);
    emitToUser(resolvedToUserId, 'new_notification', { message: 'You have a new message' });

    res.status(201).json(msg);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/messages/:id/read — mark as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const msg = await prisma.message.update({
      where: { id: req.params.id },
      data: { readAt: new Date() }
    });
    res.json(msg);
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
