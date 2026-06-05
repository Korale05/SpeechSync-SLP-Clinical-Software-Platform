// Fallback mock data for SpeechSync production resilience

export const mockPatients = [
  {
    id: "pat-1",
    name: "Aarav Sharma",
    dob: "2018-05-15",
    guardianName: "Priya Sharma",
    guardianPhone: "+91 98765 43210",
    guardianEmail: "priya@example.com",
    insuranceCarrier: "Star Health",
    insurancePolicy: "SH-99283-A",
    diagnoses: ["Phonological Disorder (F80.0)", "Expressive Language Delay"],
    medicareCap: 2480.0,
    medicareSpent: 450.0
  },
  {
    id: "pat-2",
    name: "Diya Iyer",
    dob: "2019-11-22",
    guardianName: "Rohan Iyer",
    guardianPhone: "+91 91234 56789",
    guardianEmail: "rohan.iyer@example.com",
    insuranceCarrier: "HDFC Ergo",
    insurancePolicy: "HE-33421-B",
    diagnoses: ["Childhood onset fluency disorder (Stuttering) (F80.81)"],
    medicareCap: 2480.0,
    medicareSpent: 1850.0
  }
];

export const mockSessions = [
  {
    id: "sess-1",
    patientId: "pat-1",
    dateOfService: "2026-06-04T10:00:00Z",
    durationMinutes: 45,
    cptCode: "92507",
    icd10Codes: ["F80.0"],
    status: "SIGNED",
    soapNote: {
      subjective: "Client Aarav was highly cooperative during the game-based phoneme practice.",
      objective: "Produced initial /r/ sound in words with 75% accuracy (30/40 trials).",
      assessment: "Aarav responds well to immediate positive reinforcement.",
      plan: "Continue with initial /r/ words and introduce medial /r/ words."
    }
  }
];

export const mockInvoices = [
  {
    id: "inv-1",
    invoiceNumber: "INV-2026-001",
    patientId: "pat-1",
    invoiceDate: "2026-06-01",
    dueDate: "2026-06-15",
    subtotal: 1500.0,
    taxAmount: 270.0,
    totalAmount: 1770.0,
    paidAmount: 1770.0,
    balanceAmount: 0.0,
    status: "PAID"
  }
];
