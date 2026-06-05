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
    } else if (req.user.role === 'SCHOOL_COORDINATOR') {
      const school = await prisma.school.findUnique({
        where: { userId: req.user.id }
      });
      if (!school) {
        return res.status(404).json({ error: 'School profile not found' });
      }
      patients = await prisma.patient.findMany({
        where: {
          ...whereClause,
          schools: {
            some: { schoolId: school.id }
          }
        },
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
        assignedSlp: true,
        sessions: {
          orderBy: { dateOfService: 'desc' },
        },
        assessments: {
          orderBy: { dateAdministered: 'desc' },
        },
        goals: {
          include: {
            progressHistory: {
              orderBy: { recordedAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' },
        },
        billingRecords: {
          orderBy: { dateOfService: 'desc' },
        },
        invoices: {
          include: {
            payments: {
              orderBy: { paymentDate: 'desc' }
            }
          },
          orderBy: { invoiceDate: 'desc' }
        }
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // HIPAA check for Parent & School roles
    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned parent account.' });
    }
    
    if (req.user.role === 'SCHOOL_COORDINATOR') {
      const school = await prisma.school.findUnique({ where: { userId: req.user.id } });
      if (!school) return res.status(403).json({ error: 'Forbidden: No school profile found.' });
      
      const mapping = await prisma.schoolPatientMapping.findUnique({
        where: { schoolId_patientId: { schoolId: school.id, patientId: patient.id } }
      });
      if (!mapping) return res.status(403).json({ error: 'Forbidden: Student not assigned to your school.' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Fetch patient by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new patient (SLP/ADMIN only)
router.post('/', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { name, dob, gender, guardianName, guardianPhone, guardianEmail, insuranceCarrier, insurancePolicy, diagnoses, diagnosis, assignedSlpId, createParentPortalAccount, createSchoolPortalAccount, schoolName, schoolCoordinatorName, schoolEmail, schoolPhone } = req.body;

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

      let existingUser = await prisma.user.findUnique({
        where: { email: guardianEmail }
      });

      if (!existingUser) {
        const temporaryPassword = `Temp@${Math.floor(10000 + Math.random() * 90000)}`;
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        existingUser = await prisma.user.create({
          data: {
            email: guardianEmail,
            name: guardianName,
            password: hashedPassword,
            role: 'PARENT',
            createdBy: req.user.id
          }
        });
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
            resourceId: existingUser.id,
            details: { email: guardianEmail, role: 'PARENT' }
          }
        });
      }
      parentUserId = existingUser.id;

      // Ensure Parent record exists
      const existingParent = await prisma.parent.findUnique({ where: { userId: parentUserId } });
      if (!existingParent) {
        await prisma.parent.create({
          data: {
            userId: parentUserId,
            name: guardianName || existingUser.name,
            email: guardianEmail,
            phone: guardianPhone,
            relationship: 'Guardian'
          }
        });
      }
    }

    let schoolUserId = null;
    let schoolAccount = null;

    if (createSchoolPortalAccount) {
      if (!schoolEmail) {
        return res.status(400).json({ error: 'School Email is required to create a School Portal account.' });
      }

      let existingSchoolUser = await prisma.user.findUnique({
        where: { email: schoolEmail }
      });

      if (!existingSchoolUser) {
        const temporaryPassword = `Temp@${Math.floor(10000 + Math.random() * 90000)}`;
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        existingSchoolUser = await prisma.user.create({
          data: {
            email: schoolEmail,
            name: schoolCoordinatorName || schoolName,
            password: hashedPassword,
            role: 'SCHOOL_COORDINATOR',
            createdBy: req.user.id
          }
        });
        schoolAccount = {
          email: schoolEmail,
          temporaryPassword
        };

        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'USER_CREATED',
            resource: 'USER',
            resourceId: existingSchoolUser.id,
            details: { email: schoolEmail, role: 'SCHOOL_COORDINATOR' }
          }
        });
      }
      schoolUserId = existingSchoolUser.id;

      // Ensure School record exists
      const existingSchool = await prisma.school.findUnique({ where: { userId: schoolUserId } });
      if (!existingSchool) {
        await prisma.school.create({
          data: {
            userId: schoolUserId,
            name: schoolName || 'Unknown School',
            coordinatorName: schoolCoordinatorName,
            email: schoolEmail,
            phone: schoolPhone
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

    // Create Mappings
    if (parentUserId) {
      const parentRecord = await prisma.parent.findUnique({ where: { userId: parentUserId } });
      if (parentRecord) {
        await prisma.parentPatientMapping.create({
          data: {
            parentId: parentRecord.id,
            patientId: patient.id
          }
        });
      }
    }

    if (schoolUserId) {
      const schoolRecord = await prisma.school.findUnique({ where: { userId: schoolUserId } });
      if (schoolRecord) {
        await prisma.schoolPatientMapping.create({
          data: {
            schoolId: schoolRecord.id,
            patientId: patient.id
          }
        });
      }
    }

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
      parentAccount,
      schoolAccount
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

    let parentAccount = null;
    let schoolAccount = null;

    if (req.body.createParentPortalAccount && guardianEmail) {
      let existingUser = await prisma.user.findUnique({ where: { email: guardianEmail } });
      if (!existingUser) {
        const temporaryPassword = `Temp@${Math.floor(10000 + Math.random() * 90000)}`;
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        existingUser = await prisma.user.create({
          data: {
            email: guardianEmail,
            name: guardianName || patient.guardianName,
            password: hashedPassword,
            role: 'PARENT',
            createdBy: req.user.id
          }
        });
        parentAccount = { email: guardianEmail, temporaryPassword };

        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'USER_CREATED',
            resource: 'USER',
            resourceId: existingUser.id,
            details: { email: guardianEmail, role: 'PARENT' }
          }
        });
      }

      let existingParent = await prisma.parent.findUnique({ where: { userId: existingUser.id } });
      if (!existingParent) {
        existingParent = await prisma.parent.create({
          data: {
            userId: existingUser.id,
            name: guardianName || patient.guardianName || existingUser.name,
            email: guardianEmail,
            phone: patient.guardianPhone,
            relationship: 'Guardian'
          }
        });
      }

      await prisma.patient.update({
        where: { id },
        data: { parentUserId: existingUser.id }
      });

      const existingMapping = await prisma.parentPatientMapping.findUnique({
        where: { parentId_patientId: { parentId: existingParent.id, patientId: id } }
      });
      if (!existingMapping) {
        await prisma.parentPatientMapping.create({
          data: { parentId: existingParent.id, patientId: id }
        });
      }
    }

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

    res.json({ ...patient, parentAccount, schoolAccount });
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

// GET /api/patients/:id/timeline — Chronological timeline of patient events
router.get('/:id/timeline', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        sessions: { orderBy: { dateOfService: 'desc' } },
        assessments: { orderBy: { dateAdministered: 'desc' } },
        goals: {
          include: {
            progressHistory: { orderBy: { recordedAt: 'desc' } }
          }
        },
        appointments: { orderBy: { startTime: 'desc' } },
        invoices: {
          include: {
            payments: { orderBy: { paymentDate: 'desc' } }
          },
          orderBy: { invoiceDate: 'desc' }
        },
        documents: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted' });
    }

    if (req.user.role === 'SCHOOL_COORDINATOR') {
      const school = await prisma.school.findUnique({ where: { userId: req.user.id } });
      if (!school) return res.status(403).json({ error: 'Forbidden: No school profile' });
      const mapping = await prisma.schoolPatientMapping.findUnique({
        where: { schoolId_patientId: { schoolId: school.id, patientId: id } }
      });
      if (!mapping) return res.status(403).json({ error: 'Forbidden' });
    }

    const events = [];

    // 1. Assessment Created / Administered
    patient.assessments.forEach(a => {
      events.push({
        id: `assessment-${a.id}`,
        date: new Date(a.dateAdministered),
        type: 'assessment',
        title: `Assessment Administered: ${a.testName}`,
        description: `Standard Score: ${a.standardScore || 'N/A'} (${a.percentile || 0}th percentile)`,
        details: `Severity: ${a.severityLabel || 'N/A'} | Raw Score: ${a.rawScore || 0}`,
        status: a.severityLabel || 'COMPLETED'
      });
      events.push({
        id: `assessment-created-${a.id}`,
        date: new Date(a.createdAt),
        type: 'assessment_created',
        title: `Assessment Record Created: ${a.testName}`,
        description: `Assessment metadata entered in database`,
        details: `Type: ${a.testName}`,
        status: 'CREATED'
      });
    });

    // 2. SOAP Saved & Signed & Teletherapy Completed
    patient.sessions.forEach(s => {
      events.push({
        id: `session-${s.id}`,
        date: new Date(s.dateOfService),
        type: s.status === 'DRAFT' ? 'soap_saved' : 'soap_signed',
        title: s.status === 'DRAFT' ? 'SOAP Note Drafted' : 'SOAP Note Signed',
        description: `CPT Code: ${s.cptCode} | Duration: ${s.durationMinutes} mins`,
        details: `Clinician ID: ${s.clinicianId}`,
        status: s.status
      });

      if (s.telehealthSession) {
        events.push({
          id: `telehealth-${s.id}`,
          date: new Date(s.dateOfService),
          type: 'teletherapy_completed',
          title: 'Teletherapy Session Completed',
          description: `Remote video session conducted`,
          details: `Duration: ${s.durationMinutes} mins | CPT: ${s.cptCode}`,
          status: 'COMPLETED'
        });
      }
    });

    // 3. Goal Updated
    patient.goals.forEach(g => {
      g.progressHistory.forEach(p => {
        events.push({
          id: `progress-${p.id}`,
          date: new Date(p.recordedAt),
          type: 'goal_progress',
          title: `Goal Progress Logged: ${g.domain}`,
          description: `Accuracy achieved: ${p.value}% (Target: ${g.target}%)`,
          details: `Goal Text: ${g.goalText}`,
          status: g.status
        });
      });
    });

    // 4. Appointment Scheduled / Completed
    patient.appointments.forEach(appt => {
      events.push({
        id: `appt-created-${appt.id}`,
        date: new Date(appt.createdAt),
        type: 'appointment_created',
        title: 'Appointment Scheduled',
        description: `Scheduled for: ${new Date(appt.startTime).toLocaleString('en-IN')}`,
        details: `Type: ${appt.type} | Duration: ${appt.durationMinutes} mins`,
        status: 'SCHEDULED'
      });

      if (appt.status === 'COMPLETED') {
        events.push({
          id: `appt-completed-${appt.id}`,
          date: new Date(appt.startTime),
          type: 'appointment_completed',
          title: 'Appointment Completed',
          description: `Session marked complete on schedule`,
          details: `Type: ${appt.type}`,
          status: 'COMPLETED'
        });
      }
    });

    // 5. Invoice Created
    patient.invoices.forEach(inv => {
      events.push({
        id: `invoice-${inv.id}`,
        date: new Date(inv.invoiceDate),
        type: 'invoice_created',
        title: `Invoice Created: ${inv.invoiceNumber}`,
        description: `Billed Amount: ₹${inv.totalAmount.toLocaleString('en-IN')}`,
        details: `Due Date: ${new Date(inv.dueDate).toLocaleDateString('en-IN')}`,
        status: inv.status
      });

      // 6. Payment Received / Refunded
      inv.payments.forEach(p => {
        const isRefund = p.amount < 0;
        events.push({
          id: `payment-${p.id}`,
          date: new Date(p.paymentDate),
          type: isRefund ? 'billing_refund' : 'payment_received',
          title: isRefund ? 'Refund Processed' : 'Payment Received',
          description: isRefund 
            ? `Amount: ₹${Math.abs(p.amount).toLocaleString('en-IN')} (Refunded)`
            : `Amount: ₹${p.amount.toLocaleString('en-IN')} via ${p.paymentMethod}`,
          details: `Invoice Ref: ${inv.invoiceNumber}${p.transactionId ? ` | Txn: ${p.transactionId}` : ''}`,
          status: isRefund ? 'REFUNDED' : 'PAID'
        });
      });
    });

    // 7. Document Uploaded
    patient.documents.forEach(doc => {
      events.push({
        id: `doc-${doc.id}`,
        date: new Date(doc.createdAt),
        type: 'document_uploaded',
        title: `Document Uploaded: ${doc.fileName}`,
        description: `Category: ${doc.documentType}`,
        details: `Uploaded by: ${doc.uploadedBy}`,
        status: 'UPLOADED'
      });
    });

    // Sort timeline events chronologically descending (newest first)
    events.sort((a, b) => b.date.getTime() - a.date.getTime());

    res.json(events);
  } catch (error) {
    console.error('Fetch timeline error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/assessments
router.get('/:id/assessments', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted' });
    }
    if (req.user.role === 'SCHOOL_COORDINATOR') {
      const school = await prisma.school.findUnique({ where: { userId: req.user.id } });
      if (!school) return res.status(403).json({ error: 'Forbidden' });
      const mapping = await prisma.schoolPatientMapping.findUnique({
        where: { schoolId_patientId: { schoolId: school.id, patientId: id } }
      });
      if (!mapping) return res.status(403).json({ error: 'Forbidden' });
    }

    const assessments = await prisma.assessment.findMany({
      where: { patientId: id },
      orderBy: { dateAdministered: 'desc' }
    });
    res.json(assessments);
  } catch (error) {
    console.error('Fetch assessments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/goals
router.get('/:id/goals', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted' });
    }
    if (req.user.role === 'SCHOOL_COORDINATOR') {
      const school = await prisma.school.findUnique({ where: { userId: req.user.id } });
      if (!school) return res.status(403).json({ error: 'Forbidden' });
      const mapping = await prisma.schoolPatientMapping.findUnique({
        where: { schoolId_patientId: { schoolId: school.id, patientId: id } }
      });
      if (!mapping) return res.status(403).json({ error: 'Forbidden' });
    }

    const goals = await prisma.goal.findMany({
      where: { patientId: id },
      include: {
        progressHistory: { orderBy: { recordedAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (error) {
    console.error('Fetch goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/sessions
router.get('/:id/sessions', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted' });
    }
    if (req.user.role === 'SCHOOL_COORDINATOR') {
      const school = await prisma.school.findUnique({ where: { userId: req.user.id } });
      if (!school) return res.status(403).json({ error: 'Forbidden' });
      const mapping = await prisma.schoolPatientMapping.findUnique({
        where: { schoolId_patientId: { schoolId: school.id, patientId: id } }
      });
      if (!mapping) return res.status(403).json({ error: 'Forbidden' });
    }

    const sessions = await prisma.session.findMany({
      where: { patientId: id },
      orderBy: { dateOfService: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/billing
router.get('/:id/billing', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted' });
    }
    if (req.user.role === 'SCHOOL_COORDINATOR') {
      const school = await prisma.school.findUnique({ where: { userId: req.user.id } });
      if (!school) return res.status(403).json({ error: 'Forbidden' });
      const mapping = await prisma.schoolPatientMapping.findUnique({
        where: { schoolId_patientId: { schoolId: school.id, patientId: id } }
      });
      if (!mapping) return res.status(403).json({ error: 'Forbidden' });
    }

    const invoices = await prisma.invoice.findMany({
      where: { patientId: id },
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
      orderBy: { invoiceDate: 'desc' }
    });

    const payments = await prisma.payment.findMany({
      where: { patientId: id },
      orderBy: { paymentDate: 'desc' }
    });

    const outstandingBalance = invoices
      .filter(inv => inv.status !== 'CANCELLED')
      .reduce((sum, inv) => sum + inv.balanceAmount, 0);

    res.json({
      invoices,
      payments,
      outstandingBalance
    });
  } catch (error) {
    console.error('Fetch billing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/documents
router.get('/:id/documents', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted' });
    }

    const documents = await prisma.document.findMany({
      where: { patientId: id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/soap-notes
router.get('/:id/soap-notes', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted' });
    }

    const sessions = await prisma.session.findMany({
      where: { 
        patientId: id,
        soapNote: { not: null }
      },
      orderBy: { dateOfService: 'desc' },
      include: {
        patient: true
      }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Fetch soap notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients/:id/soap-notes
router.post('/:id/soap-notes', authenticate, authorize('SLP', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { dateOfService, durationMinutes, cptCode, icd10Codes, telehealthSession, subjective, objective, assessment, plan, status } = req.body;

  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const clinician = await prisma.clinician.findUnique({
      where: { userId: req.user.id },
    });

    if (!clinician) {
      return res.status(403).json({ error: 'Only clinicians can create sessions/soap notes' });
    }

    const session = await prisma.session.create({
      data: {
        patientId: id,
        clinicianId: clinician.id,
        dateOfService: dateOfService ? new Date(dateOfService) : new Date(),
        durationMinutes: parseInt(durationMinutes) || 45,
        cptCode: cptCode || '92507',
        icd10Codes: icd10Codes || [],
        telehealthSession: telehealthSession || false,
        soapNote: { subjective, objective, assessment, plan },
        status: status || 'DRAFT',
      },
      include: { patient: true }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_SOAP_NOTE',
        resource: 'SESSION',
        resourceId: session.id,
        details: { patientId: id }
      }
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Create soap note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/progress
router.get('/:id/progress', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (req.user.role === 'PARENT' && patient.parentUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted' });
    }

    const assessments = await prisma.assessment.findMany({
      where: { patientId: id },
      orderBy: { dateAdministered: 'asc' }
    });

    const sessions = await prisma.session.findMany({
      where: { patientId: id },
      orderBy: { dateOfService: 'asc' }
    });

    const goals = await prisma.goal.findMany({
      where: { patientId: id },
      include: {
        progressHistory: {
          orderBy: { recordedAt: 'asc' }
        }
      }
    });

    // Formatting progress data
    const assessmentScores = assessments.map(a => ({
      date: new Date(a.dateAdministered).toLocaleDateString('en-IN'),
      score: a.standardScore || a.rawScore || 0,
      testName: a.testName
    }));

    const sessionAttendance = sessions.map(s => ({
      date: new Date(s.dateOfService).toLocaleDateString('en-IN'),
      attended: s.status === 'COMPLETED' || s.status === 'SIGNED' || s.status === 'LOCKED' ? 1 : 0
    }));

    // Format goals for trendlines
    const goalTrends = goals.map(g => {
      return {
        id: g.id,
        goalText: g.goalText,
        domain: g.domain,
        target: g.target,
        history: g.progressHistory.map(p => ({
          date: new Date(p.recordedAt).toLocaleDateString('en-IN'),
          value: p.value
        }))
      };
    });

    res.json({
      assessmentScores,
      sessionAttendance,
      goalTrends,
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'COMPLETED' || s.status === 'SIGNED' || s.status === 'LOCKED').length,
      assessmentsCompleted: assessments.length,
      lastAssessmentDate: assessments.length > 0 ? new Date(assessments[assessments.length - 1].dateAdministered).toLocaleDateString('en-IN') : null
    });
  } catch (error) {
    console.error('Fetch progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/assessments
router.get('/:id/assessments', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const assessments = await prisma.assessment.findMany({
      where: { patientId: id },
      orderBy: { dateAdministered: 'desc' }
    });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/goals
router.get('/:id/goals', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const goals = await prisma.goal.findMany({
      where: { patientId: id },
      include: { progressHistory: { orderBy: { recordedAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/sessions
router.get('/:id/sessions', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const sessions = await prisma.session.findMany({
      where: { patientId: id },
      orderBy: { dateOfService: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/billing
router.get('/:id/billing', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const invoices = await prisma.invoice.findMany({
      where: { patientId: id },
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
      orderBy: { invoiceDate: 'desc' }
    });
    const payments = await prisma.payment.findMany({
      where: { patientId: id },
      orderBy: { paymentDate: 'desc' }
    });
    const outstandingBalance = invoices.filter(inv => inv.status !== 'CANCELLED').reduce((sum, inv) => sum + inv.balanceAmount, 0);
    res.json({ invoices, payments, outstandingBalance });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/documents
router.get('/:id/documents', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const documents = await prisma.document.findMany({
      where: { patientId: id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/timeline
router.get('/:id/timeline', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const sessions = await prisma.session.findMany({ where: { patientId: id } });
    const assessments = await prisma.assessment.findMany({ where: { patientId: id } });
    
    let events = [];
    sessions.forEach(s => events.push({ type: 'session', date: s.dateOfService, title: 'Session', description: s.cptCode, data: s }));
    assessments.forEach(a => events.push({ type: 'assessment', date: a.dateAdministered, title: 'Assessment', description: a.testName, data: a }));
    
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
