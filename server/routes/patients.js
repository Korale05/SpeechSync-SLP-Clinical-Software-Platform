import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
const prisma = new PrismaClient();

// Get all clinicians (SLPs) - put before GET /:id to prevent param collision
router.get('/clinicians/all', authenticate, async (req, res) => {
  try {
    const clinicians = await prisma.clinician.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(clinicians);
  } catch (error) {
    console.error('Fetch clinicians error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all patients
router.get('/', authenticate, async (req, res) => {
  try {
    let patients;
    const includeArchived = req.query.archived === 'true';

    const whereClause = {
      isArchived: includeArchived ? undefined : false
    };

    if (req.user.role === 'PARENT') {
      whereClause.parentUserId = req.user.id;
      patients = await prisma.patient.findMany({
        where: whereClause,
        include: {
          goals: true,
          assessments: true,
          sessions: true,
          appointments: {
            where: { startTime: { gte: new Date() } },
            orderBy: { startTime: 'asc' },
            take: 1
          }
        },
      });
    } else if (req.query.role === 'school' || req.user.role === 'SCHOOL_COORDINATOR') {
      let clinician = await prisma.clinician.findFirst({
        where: { userId: req.user.id }
      });
      if (!clinician) {
        clinician = await prisma.clinician.findFirst();
      }
      const clinicianId = clinician ? clinician.id : '';
      whereClause.assignedSlpId = clinicianId;
      patients = await prisma.patient.findMany({
        where: whereClause,
        include: {
          goals: true,
          assessments: true,
          sessions: true,
          appointments: {
            where: { startTime: { gte: new Date() } },
            orderBy: { startTime: 'asc' },
            take: 1
          }
        },
      });
    } else if (req.user.role === 'SLP') {
      const clinician = await prisma.clinician.findUnique({
        where: { userId: req.user.id },
      });
      if (!clinician) {
        return res.status(404).json({ error: 'Clinician profile not found' });
      }

      whereClause.assignedSlpId = clinician.id;
      patients = await prisma.patient.findMany({
        where: whereClause,
        include: {
          goals: true,
          assessments: true,
          sessions: true,
          appointments: {
            where: { startTime: { gte: new Date() } },
            orderBy: { startTime: 'asc' },
            take: 1
          }
        },
      });
    } else {
      // ADMIN sees all patients
      patients = await prisma.patient.findMany({
        where: whereClause,
        include: {
          goals: true,
          assessments: true,
          sessions: true,
          appointments: {
            where: { startTime: { gte: new Date() } },
            orderBy: { startTime: 'asc' },
            take: 1
          }
        },
      });
    }

    res.json(patients);
  } catch (error) {
    console.error('Fetch patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient by ID
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { dateOfService: 'desc' },
        },
        assessments: {
          orderBy: { dateAdministered: 'desc' },
        },
        goals: {
          orderBy: { createdAt: 'desc' },
        },
        billingRecords: {
          orderBy: { dateOfService: 'desc' },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // HIPAA check for Parent role
    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned parent account.' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Fetch patient by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new patient (SLP/ADMIN only)
router.post('/', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { name, dob, gender, guardianName, guardianPhone, guardianEmail, insuranceCarrier, insurancePolicy, diagnoses, diagnosis, assignedSlpId, createParentPortalAccount } = req.body;

  if (!name || !dob || !guardianName || !guardianPhone) {
    return res.status(400).json({ error: 'Missing required fields: name, dob, guardianName, and guardianPhone are required.' });
  }

  const finalDiagnoses = diagnoses || (diagnosis ? [diagnosis] : []);
  if (finalDiagnoses.length === 0) {
    return res.status(400).json({ error: 'At least one diagnosis is required.' });
  }

  try {
    let clinicianId = assignedSlpId;
    if (!clinicianId && req.user.role === 'SLP') {
      const clinician = await prisma.clinician.findUnique({
        where: { userId: req.user.id }
      });
      clinicianId = clinician?.id;
    }

    if (!clinicianId) {
      return res.status(400).json({ error: 'Assigned SLP is required.' });
    }

    let parentUserId = null;
    let parentAccount = null;

    if (createParentPortalAccount) {
      if (!guardianEmail) {
        return res.status(400).json({ error: 'Guardian Email is required to create a Parent Portal account.' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: guardianEmail }
      });

      if (existingUser) {
        parentUserId = existingUser.id;
      } else {
        const temporaryPassword = `Temp@${Math.floor(10000 + Math.random() * 90000)}`;
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        const parentUser = await prisma.user.create({
          data: {
            email: guardianEmail,
            name: guardianName,
            password: hashedPassword,
            role: 'PARENT',
            createdBy: req.user.id
          }
        });
        parentUserId = parentUser.id;
        parentAccount = {
          email: guardianEmail,
          temporaryPassword
        };

        // Log parent account creation
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'USER_CREATED',
            resource: 'USER',
            resourceId: parentUser.id,
            details: { email: guardianEmail, role: 'PARENT' }
          }
        });
      }
    }

    const birthDate = new Date(dob);
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);

    const patient = await prisma.patient.create({
      data: {
        name,
        dob: birthDate,
        guardianName,
        guardianPhone,
        guardianEmail,
        insuranceCarrier,
        insurancePolicy,
        diagnoses: finalDiagnoses,
        assignedSlpId: clinicianId,
        parentUserId,
        metadata: {
          gender: gender || 'Not Specified',
          age: calculatedAge
        }
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_PATIENT',
        resource: 'PATIENT',
        resourceId: patient.id,
        details: { name }
      }
    });

    res.status(201).json({
      ...patient,
      parentAccount
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit patient
router.patch('/:id', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, dob, gender, guardianName, guardianPhone, guardianEmail, insuranceCarrier, insurancePolicy, diagnoses, diagnosis, assignedSlpId, isArchived } = req.body;

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (dob !== undefined) updateData.dob = new Date(dob);
    if (guardianName !== undefined) updateData.guardianName = guardianName;
    if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone;
    if (guardianEmail !== undefined) updateData.guardianEmail = guardianEmail;
    if (insuranceCarrier !== undefined) updateData.insuranceCarrier = insuranceCarrier;
    if (insurancePolicy !== undefined) updateData.insurancePolicy = insurancePolicy;
    if (assignedSlpId !== undefined) updateData.assignedSlpId = assignedSlpId;
    if (isArchived !== undefined) updateData.isArchived = isArchived;

    if (diagnoses !== undefined) {
      updateData.diagnoses = diagnoses;
    } else if (diagnosis !== undefined) {
      updateData.diagnoses = [diagnosis];
    }

    if (dob !== undefined || gender !== undefined) {
      const existing = await prisma.patient.findUnique({ where: { id } });
      const currentMeta = typeof existing.metadata === 'object' ? existing.metadata || {} : {};
      
      let calculatedAge = currentMeta.age;
      if (dob !== undefined) {
        const birthDate = new Date(dob);
        const ageDiff = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDiff);
        calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      }

      updateData.metadata = {
        ...currentMeta,
        ...(gender !== undefined ? { gender } : {}),
        age: calculatedAge
      };
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: updateData,
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_PATIENT',
        resource: 'PATIENT',
        resourceId: patient.id,
        details: { name: patient.name }
      }
    });

    res.json(patient);
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Soft delete / Archive patient
router.delete('/:id', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const patient = await prisma.patient.update({
      where: { id },
      data: { isArchived: true },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ARCHIVE_PATIENT',
        resource: 'PATIENT',
        resourceId: patient.id,
        details: { name: patient.name }
      }
    });

    res.json({ message: 'Patient archived successfully', patient });
  } catch (error) {
    console.error('Archive patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
