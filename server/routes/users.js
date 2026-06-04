import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
const prisma = new PrismaClient();

// Get all users
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { clinician: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { name, email, password, role, phone, specialty, licenseNo, credentials, department, schoolName, linkedPatientId } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields: email, password, and role are required.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userMetadata = {};
    if (phone) userMetadata.phone = phone;
    if (schoolName) userMetadata.schoolName = schoolName;
    if (linkedPatientId) userMetadata.linkedPatientId = linkedPatientId;

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hashedPassword,
        role,
        createdBy: req.user.id,
        metadata: userMetadata
      }
    });

    let clinician = null;
    if (role === 'SLP') {
      clinician = await prisma.clinician.create({
        data: {
          userId: user.id,
          name: name || email.split('@')[0],
          credentials: credentials || 'CCC-SLP',
          specialty: specialty || null,
          licenseNo: licenseNo || null,
          phone: phone || null,
          department: department || null
        }
      });
    }

    // Link parent account to patient if selected
    if (role === 'PARENT' && linkedPatientId) {
      await prisma.patient.update({
        where: { id: linkedPatientId },
        data: { parentUserId: user.id }
      });
    }

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_CREATED',
        resource: 'USER',
        resourceId: user.id,
        details: { email, role }
      }
    });

    res.status(201).json({
      success: true,
      user,
      clinician,
      username: email,
      temporaryPassword: password
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user details
router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, email, role, isActive, phone, specialty, licenseNo, credentials, department, schoolName, linkedPatientId } = req.body;

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { clinician: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const currentMeta = typeof existing.metadata === 'object' ? existing.metadata || {} : {};
    const updatedMeta = { ...currentMeta };
    if (phone !== undefined) updatedMeta.phone = phone;
    if (schoolName !== undefined) updatedMeta.schoolName = schoolName;
    if (linkedPatientId !== undefined) updatedMeta.linkedPatientId = linkedPatientId;
    updateData.metadata = updatedMeta;

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Update clinician if exists
    if (existing.clinician) {
      const clinicianUpdate = {};
      if (name !== undefined) clinicianUpdate.name = name;
      if (credentials !== undefined) clinicianUpdate.credentials = credentials;
      if (specialty !== undefined) clinicianUpdate.specialty = specialty;
      if (licenseNo !== undefined) clinicianUpdate.licenseNo = licenseNo;
      if (phone !== undefined) clinicianUpdate.phone = phone;
      if (department !== undefined) clinicianUpdate.department = department;

      await prisma.clinician.update({
        where: { id: existing.clinician.id },
        data: clinicianUpdate
      });
    } else if (role === 'SLP' && !existing.clinician) {
      // Create clinician record if changing role to SLP
      await prisma.clinician.create({
        data: {
          userId: user.id,
          name: name || user.name || user.email.split('@')[0],
          credentials: credentials || 'CCC-SLP',
          specialty: specialty || null,
          licenseNo: licenseNo || null,
          phone: phone || null,
          department: department || null
        }
      });
    }

    // Link parent account if role is PARENT and linkedPatientId changed
    if (role === 'PARENT' && linkedPatientId) {
      await prisma.patient.update({
        where: { id: linkedPatientId },
        data: { parentUserId: user.id }
      });
    }

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_UPDATED',
        resource: 'USER',
        resourceId: user.id,
        details: { email: user.email }
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate user
router.patch('/:id/deactivate', authenticate, authorize('ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_DEACTIVATED',
        resource: 'USER',
        resourceId: user.id,
        details: { email: user.email }
      }
    });

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate user
router.patch('/:id/activate', authenticate, authorize('ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_ACTIVATED',
        resource: 'USER',
        resourceId: user.id,
        details: { email: user.email }
      }
    });

    res.json({ success: true, message: 'User activated successfully' });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password
router.post('/:id/reset-password', authenticate, authorize('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const tempPassword = 'Temp@12345';

  try {
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const user = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PASSWORD_RESET',
        resource: 'USER',
        resourceId: user.id,
        details: { email: user.email }
      }
    });

    res.json({ success: true, temporaryPassword: tempPassword });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign patients to doctor/clinician
router.post('/assign-patients', authenticate, authorize('ADMIN'), async (req, res) => {
  const { clinicianId, patientIds } = req.body;

  if (!clinicianId || !Array.isArray(patientIds)) {
    return res.status(400).json({ error: 'clinicianId and patientIds array are required.' });
  }

  try {
    // Unassign currently assigned patients first
    await prisma.patient.updateMany({
      where: { assignedSlpId: clinicianId },
      data: { assignedSlpId: null }
    });

    // Assign the new batch of patients
    if (patientIds.length > 0) {
      await prisma.patient.updateMany({
        where: { id: { in: patientIds } },
        data: { assignedSlpId: clinicianId }
      });
    }

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PATIENT_ASSIGNED',
        resource: 'CLINICIAN',
        resourceId: clinicianId,
        details: { patientIds }
      }
    });

    res.json({ success: true, message: 'Caseload assigned successfully' });
  } catch (error) {
    console.error('Assign caseload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
