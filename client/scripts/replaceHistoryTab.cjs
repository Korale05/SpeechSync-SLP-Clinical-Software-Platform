const fs = require('fs');

let code = fs.readFileSync('e:/SpeechSync-SLP-Clinical-Software-Platform-main/client/src/pages/PatientProfile.jsx', 'utf8');

// 1. Add import
if (!code.includes('PatientVisitHistoryTable')) {
  code = code.replace("import { toast } from 'sonner'", "import { toast } from 'sonner';\nimport PatientVisitHistoryTable from '../components/PatientVisitHistoryTable';");
}

// 2. Replace mega history tab with PatientVisitHistoryTable
const startStr = '{/* Complete Mega History Tab */}';
const endStr = '{/* Complete History Tab (formerly Timeline) */}';
const start = code.indexOf(startStr);
const end = code.indexOf(endStr);

if (start > -1 && end > -1) {
  const replacement = `{/* Complete Mega History Tab */}\n        <TabsContent value="history" className="mt-6">\n          <PatientVisitHistoryTable patient={patient} sessions={patientSessions} assessments={patientAssessments} />\n        </TabsContent>\n        `;
  code = code.slice(0, start) + replacement + code.slice(end);
  fs.writeFileSync('e:/SpeechSync-SLP-Clinical-Software-Platform-main/client/src/pages/PatientProfile.jsx', code);
  console.log('Successfully replaced History tab content');
} else {
  console.log('Could not find boundaries', start, end);
}
