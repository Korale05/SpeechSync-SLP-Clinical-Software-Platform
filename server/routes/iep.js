import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import PDFDocument from 'pdfkit';

const router = Router();
const prisma = new PrismaClient();

// GET /api/iep/students — returns all IEP students (SCHOOL_COORDINATOR or ADMIN only)
router.get('/students', authenticate, authorize('SCHOOL_COORDINATOR', 'ADMIN', 'SLP'), async (req, res) => {
  try {
    const students = await prisma.iepStudent.findMany({
      orderBy: { iepDueDate: 'asc' }
    });
    res.json(students);
  } catch (error) {
    console.error('Fetch IEP students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/iep/schedule-screening — bulk schedule screenings
router.post('/schedule-screening', authenticate, authorize('SCHOOL_COORDINATOR', 'ADMIN'), async (req, res) => {
  const { date, room, studentIds } = req.body;

  if (!date || !studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ error: 'date and studentIds list are required.' });
  }

  try {
    // Retrieve clinician profile
    const clinician = await prisma.clinician.findFirst();
    const clinicianId = clinician ? clinician.id : 'ADMIN';

    // Validate all students have a valid patientId linked
    const invalidStudents = [];
    const validStudents = [];
    for (const sid of studentIds) {
      const student = await prisma.iepStudent.findUnique({ where: { id: sid } });
      if (!student) {
        return res.status(404).json({ error: `Student with ID ${sid} not found.` });
      }
      if (!student.patientId) {
        invalidStudents.push(student.name);
      } else {
        validStudents.push(student);
      }
    }

    if (invalidStudents.length > 0) {
      return res.status(400).json({
        error: `The following students do not have linked patient profiles: ${invalidStudents.join(', ')}. Please link them before scheduling.`
      });
    }

    // Create appointments for each student (30 min increments)
    const appointments = await Promise.all(validStudents.map(async (student, i) => {
      return prisma.appointment.create({
        data: {
          patientId: student.patientId,
          clinicianId,
          startTime: new Date(new Date(date).getTime() + i * 30 * 60 * 1000), // 30 min slots
          durationMinutes: 30,
          type: 'IEP Screening',
          status: 'SCHEDULED'
        }
      });
    }));

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SCHEDULE_BULK_SCREENING',
        resource: 'IEP',
        resourceId: null,
        details: { studentIds, date }
      }
    });

    res.json({ scheduled: appointments.length });
  } catch (error) {
    console.error('Schedule IEP screening error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/iep/progress-report/:studentId — duplicate redirect helper for safety
router.get('/progress-report/:studentId', authenticate, authorize('SCHOOL_COORDINATOR', 'ADMIN', 'SLP'), async (req, res) => {
  try {
    const student = await prisma.iepStudent.findUnique({
      where: { id: req.params.studentId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const patient = student.patientId ? await prisma.patient.findUnique({
      where: { id: student.patientId },
      include: { goals: true }
    }) : null;

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=IEP_Report_${student.name.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1E3A8A').text('SpeechSync', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('FERPA-Compliant Progress Report', 50, 75);
    doc.moveTo(50, 95).lineTo(545, 95).stroke('#E5E7EB');

    // Student Info
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#111827').text('IEP Progress Summary', 50, 115);
    doc.fontSize(11).font('Helvetica').fillColor('#374151');
    doc.text(`Student: ${student.name}`, 50, 145);
    doc.text(`Grade: ${student.grade}`, 50, 162);
    doc.text(`Primary Disorder: ${student.disorder}`, 50, 179);
    doc.text(`IEP Due: ${new Date(student.iepDueDate).toLocaleDateString('en-IN')}`, 50, 196);
    doc.text(`Report Generated: ${new Date().toLocaleDateString('en-IN')}`, 50, 213);

    // Goals
    const goals = patient ? patient.goals : [];
    if (goals.length) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1E3A8A').text('Current Goals', 50, 250);
      let y = 275;
      for (const goal of goals) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text(goal.domain, 50, y);
        doc.font('Helvetica').fillColor('#374151').text(goal.goalText, 50, y + 15, { width: 495 });
        const pct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
        doc.text(`Progress: ${goal.current}% of ${goal.target}% target (${pct}% of goal met) — Status: ${goal.status}`, 50, y + 40);
        
        doc.rect(50, y + 58, 495, 8).fillColor('#E5E7EB').fill();
        const progressWidth = 495 * (Math.min(100, goal.current) / 100);
        if (progressWidth > 0) {
          doc.rect(50, y + 58, progressWidth, 8).fillColor(goal.status === 'MET' ? '#10B981' : '#F59E0B').fill();
        }
        
        doc.fillColor('#374151');
        y += 90;
        if (y > 700) { doc.addPage(); y = 50; }
      }
    }

    doc.fontSize(8).fillColor('#9CA3AF').text('This document is FERPA-compliant. Generated by SpeechSync Clinical Platform. HIPAA compliant.', 50, 750, { width: 495, align: 'center' });
    doc.end();

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'EXPORT',
        resource: 'IEP_REPORT',
        resourceId: student.id,
        details: { studentName: student.name }
      }
    });
  } catch (error) {
    console.error('Generate IEP progress report error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/iep/bulk-export — exports progress summaries for selected students
router.post('/bulk-export', authenticate, authorize('SCHOOL_COORDINATOR', 'ADMIN'), async (req, res) => {
  const { studentIds } = req.body;

  if (!studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ error: 'studentIds list is required' });
  }

  try {
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=IEP_Bulk_Report.pdf');
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1E3A8A').text('SpeechSync IEP Progress Summary', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text(`FERPA-Compliant Bulk Export — Generated: ${new Date().toLocaleDateString('en-IN')}`, 50, 75);
    doc.moveTo(50, 95).lineTo(545, 95).stroke('#E5E7EB');

    let y = 115;
    for (const sid of studentIds) {
      const student = await prisma.iepStudent.findUnique({ where: { id: sid } });
      if (!student) continue;

      if (y > 650) {
        doc.addPage();
        y = 50;
      }

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text(`${student.name} (${student.grade} Grade)`, 50, y);
      doc.fontSize(10).font('Helvetica').fillColor('#374151');
      doc.text(`Disorder: ${student.disorder} | Goal progress: ${student.currentGoalPercent}% | IEP Due: ${new Date(student.iepDueDate).toLocaleDateString('en-IN')}`, 50, y + 18);
      doc.moveTo(50, y + 35).lineTo(545, y + 35).stroke('#F3F4F6');
      y += 50;
    }

    doc.fontSize(8).fillColor('#9CA3AF').text('This document is FERPA-compliant. Generated by SpeechSync Clinical Platform.', 50, 750, { width: 495, align: 'center' });
    doc.end();

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'EXPORT',
        resource: 'IEP_BULK_REPORT',
        resourceId: null,
        details: { count: studentIds.length }
      }
    });
  } catch (error) {
    console.error('Bulk export IEP progress error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
