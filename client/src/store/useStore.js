import { create } from 'zustand'
import api from '../services/api.js'

const useStore = create((set, get) => ({
  patients: [],
  sessions: [],
  assessments: [],
  goals: [],
  billing: [],
  currentPatientId: '',
  hasConsented: false,
  isLoading: false,
  meetUrl: 'https://meet.google.com/abc-defg-hij',

  // Initialize and fetch all data from backend
  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      const dbPatients = await api.patients.getAll();
      const dbSessions = await api.sessions.getAll();
      const dbAssessments = await api.assessments.getAll();
      const dbBilling = await api.billing.getAll();

      // Extract goals from patients since goals are linked in the backend schema
      const dbGoals = dbPatients.reduce((acc, p) => {
        if (p.goals) {
          const goalsWithPatient = p.goals.map(g => {
            const mappedHistory = (g.progressHistory && g.progressHistory.length > 0)
              ? g.progressHistory.map(ph => ({
                  date: new Date(ph.recordedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
                  accuracy: ph.accuracy
                }))
              : [{ date: 'Baseline', accuracy: g.baseline }];
            return {
              ...g,
              patientName: p.name,
              progressHistory: mappedHistory
            };
          });
          return [...acc, ...goalsWithPatient];
        }
        return acc;
      }, []);

      set({
        patients: dbPatients,
        sessions: dbSessions,
        assessments: dbAssessments,
        billing: dbBilling,
        goals: dbGoals,
        currentPatientId: get().currentPatientId || dbPatients[0]?.id || '',
        isLoading: false
      });
      console.log('Successfully loaded clinical data from backend database.');
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to load data from backend:', error);
      throw error;
    }
  },

  // Set Current Patient
  setCurrentPatientId: (id) => set({ currentPatientId: id }),

  // Set DPDPA Consent
  setConsent: (consented) => set({ hasConsented: consented }),

  // Set Google Meet Link
  setMeetUrl: (url) => set({ meetUrl: url }),

  // Add a new clinical session / SOAP draft
  addSession: async (session) => {
    try {
      const newSession = await api.sessions.create(session);
      set((state) => ({
        sessions: [newSession, ...state.sessions]
      }));
      return newSession;
    } catch (error) {
      console.error('Failed to create session on backend:', error);
      throw error;
    }
  },

  // Update a session (e.g. Save Draft, Sign & Lock)
  updateSession: async (id, updatedFields) => {
    try {
      const updated = await api.sessions.update(id, updatedFields);
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? updated : s))
      }));
      return updated;
    } catch (error) {
      console.error('Failed to update session on backend:', error);
      throw error;
    }
  },

  // Add standardized assessment GFTA-3 or CELF-5
  addAssessment: async (assessment) => {
    try {
      const newAssessment = await api.assessments.create(assessment);
      set((state) => ({
        assessments: [newAssessment, ...state.assessments]
      }));
      return newAssessment;
    } catch (error) {
      console.error('Failed to save assessment to backend:', error);
      throw error;
    }
  },

  // Add clinical goal
  addGoal: async (goal) => {
    try {
      const newGoal = await api.goals.create(goal);
      set((state) => ({
        goals: [newGoal, ...state.goals]
      }));
      return newGoal;
    } catch (error) {
      console.error('Failed to save goal to backend:', error);
      throw error;
    }
  },

  // Update goal progress with new data points
  updateGoalProgress: async (goalId, newAccuracy) => {
    try {
      const updatedGoal = await api.goals.updateProgress(goalId, newAccuracy);
      
      const mappedHistory = (updatedGoal.progressHistory && updatedGoal.progressHistory.length > 0)
        ? updatedGoal.progressHistory.map(ph => ({
            date: new Date(ph.recordedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            accuracy: ph.accuracy
          }))
        : null;

      set((state) => ({
        goals: state.goals.map((g) => (g.id === goalId ? {
          ...g,
          current: updatedGoal.current,
          status: updatedGoal.status,
          progressHistory: mappedHistory || [...(g.progressHistory || []), {
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            accuracy: updatedGoal.current
          }]
        } : g))
      }));
      return updatedGoal;
    } catch (error) {
      console.error('Failed to update goal progress on backend:', error);
      throw error;
    }
  },

  // Update billing record
  updateBillingClaim: async (id, updatedFields) => {
    try {
      const updated = await api.billing.update(id, updatedFields);
      set((state) => ({
        billing: state.billing.map((b) => (b.id === id ? updated : b))
      }));
      return updated;
    } catch (error) {
      console.error('Failed to update billing claim on backend:', error);
      throw error;
    }
  },

  // Get current patient details
  getCurrentPatient: () => {
    const { patients, currentPatientId } = get();
    return patients.find((p) => p.id === currentPatientId) || patients[0] || null;
  },

  // Get active session count / pending SOAP notes count for dashboard
  getPendingNotesCount: () => {
    const { sessions } = get();
    return sessions.filter((s) => s.status === 'DRAFT' || s.status === 'PENDING_COSIGN').length;
  }
}));

export default useStore;
export { useStore };
