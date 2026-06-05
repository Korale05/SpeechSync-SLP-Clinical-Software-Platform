import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
const prisma = new PrismaClient();

// Get parent dashboard summary
router.get('/dashboard', authenticate, authorize('PARENT'), async (req, res) => {
  try {
    const parentUserId = req.user.id;

    // Get patients mapped to this parent
    const parentRecord = await prisma.parent.findUnique({
      where: { userId: parentUserId },
      include: {
        patients: {
          include: {
            patient: {
              include: {
                assignedSlp: true,
                sessions: true,
                goals: true,
                appointments: {
                  where: { startTime: { gte: new Date() } },
                  orderBy: { startTime: 'asc' },
                  take: 5
                },
                invoices: {
                  where: { status: { notIn: ['PAID', 'CANCELLED'] } }
                }
              }
            }
          }
        }
      }
    });

    if (!parentRecord) {
      return res.status(404).json({ error: 'Parent record not found' });
    }

    const patients = parentRecord.patients.map(p => p.patient);

    let totalSessions = 0;
    let completedSessions = 0;
    let upcomingSessions = 0;
    let activeGoalsCount = 0;
    let completedGoalsCount = 0;
    let outstandingBillsTotal = 0;

    const patientSummaries = patients.map(patient => {
      const patientTotalSessions = patient.sessions.length;
      const patientCompletedSessions = patient.sessions.filter(s => ['SIGNED', 'COMPLETED', 'LOCKED'].includes(s.status)).length;
      
      const patientActiveGoals = patient.goals.filter(g => g.status === 'IN_PROGRESS');
      const patientCompletedGoals = patient.goals.filter(g => g.status === 'MET');
      
      const patientOutstandingBills = patient.invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

      totalSessions += patientTotalSessions;
      completedSessions += patientCompletedSessions;
      upcomingSessions += patient.appointments.length;
      activeGoalsCount += patientActiveGoals.length;
      completedGoalsCount += patientCompletedGoals.length;
      outstandingBillsTotal += patientOutstandingBills;

      return {
        id: patient.id,
        name: patient.name,
        assignedSlp: patient.assignedSlp?.name,
        diagnoses: patient.diagnoses,
        metrics: {
          totalSessions: patientTotalSessions,
          completedSessions: patientCompletedSessions,
          activeGoals: patientActiveGoals.length,
          outstandingBills: patientOutstandingBills
        },
        appointments: patient.appointments
      };
    });

    const goalCompletionPercentage = (activeGoalsCount + completedGoalsCount) > 0 
      ? Math.round((completedGoalsCount / (activeGoalsCount + completedGoalsCount)) * 100) 
      : 0;

    res.json({
      metrics: {
        totalSessions,
        completedSessions,
        upcomingSessions,
        activeGoals: activeGoalsCount,
        progressPercentage: goalCompletionPercentage,
        outstandingBillsTotal
      },
      patients: patientSummaries
    });

  } catch (error) {
    console.error('Parent dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
