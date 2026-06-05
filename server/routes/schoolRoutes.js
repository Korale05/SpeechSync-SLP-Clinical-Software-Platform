import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
const prisma = new PrismaClient();

// Get school dashboard summary
router.get('/dashboard', authenticate, authorize('SCHOOL_COORDINATOR'), async (req, res) => {
  try {
    const schoolUserId = req.user.id;

    // Get patients mapped to this school
    const schoolRecord = await prisma.school.findUnique({
      where: { userId: schoolUserId },
      include: {
        patients: {
          include: {
            patient: {
              include: {
                assignedSlp: true,
                sessions: true,
                goals: {
                  where: {
                    domain: { in: ['Academic', 'Behavioral', 'Communication', 'Language'] }
                  }
                },
                assessments: true
              }
            }
          }
        }
      }
    });

    if (!schoolRecord) {
      return res.status(404).json({ error: 'School record not found' });
    }

    const students = schoolRecord.patients.map(p => p.patient);

    const studentSummaries = students.map(student => {
      const activeGoals = student.goals.filter(g => g.status === 'IN_PROGRESS');
      const completedGoals = student.goals.filter(g => g.status === 'MET');
      
      const goalCompletionPercentage = (activeGoals.length + completedGoals.length) > 0 
        ? Math.round((completedGoals.length / (activeGoals.length + completedGoals.length)) * 100) 
        : 0;

      return {
        id: student.id,
        name: student.name,
        assignedSlp: student.assignedSlp?.name,
        diagnoses: student.diagnoses,
        metrics: {
          totalSessions: student.sessions.length,
          completedSessions: student.sessions.filter(s => ['SIGNED', 'COMPLETED', 'LOCKED'].includes(s.status)).length,
          activeGoalsCount: activeGoals.length,
          progressPercentage: goalCompletionPercentage
        },
        goals: student.goals,
        recentAssessments: student.assessments.slice(0, 3)
      };
    });

    res.json({
      metrics: {
        totalStudentsAssigned: students.length,
      },
      students: studentSummaries
    });

  } catch (error) {
    console.error('School dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
