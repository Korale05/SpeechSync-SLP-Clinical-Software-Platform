import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, ChevronRight } from 'lucide-react';

const PatientVisitHistoryTable = ({ patient, sessions, assessments }) => {
  // Combine sessions and assessments into a unified chronological visit list
  const combinedVisits = [];
  
  if (sessions && sessions.length > 0) {
    sessions.forEach(s => {
      combinedVisits.push({
        id: s.id,
        date: new Date(s.dateOfService),
        type: s.cptCode === '92523' || s.cptCode?.includes('Eval') ? 'Initial Assessment' : (s.telehealthSession ? 'Teletherapy Session' : 'Follow-up Session'),
        slp: patient?.assignedSlp?.name ? `${patient.assignedSlp.name} (SLP)` : 'Assigned SLP',
        purpose: s.soapNote?.subjective ? (s.soapNote.subjective.substring(0, 30) + '...') : (s.cptCode || 'Therapy'),
        notes: s.soapNote ? [
          s.soapNote.objective ? s.soapNote.objective.substring(0, 60) + '...' : null,
          s.soapNote.assessment ? s.soapNote.assessment.substring(0, 60) + '...' : null
        ].filter(Boolean) : ['No specific notes recorded'],
        goalsUpdated: Math.floor(Math.random() * 2) + 1 + ' Updated', // Placeholder for actual calculation
        nextSteps: s.soapNote?.plan ? s.soapNote.plan.split('. ').map(step => step.trim()).filter(Boolean).slice(0, 2) : ['Continue current plan'],
        documents: ['SOAP Note', 'Session Report'],
        isAssessment: false
      });
    });
  }

  if (assessments && assessments.length > 0) {
    assessments.forEach(a => {
      combinedVisits.push({
        id: a.id,
        date: new Date(a.dateAdministered),
        type: 'Standardized Assessment',
        slp: patient?.assignedSlp?.name ? `${patient.assignedSlp.name} (SLP)` : 'Assigned SLP',
        purpose: a.testName,
        notes: [
          `Raw Score: ${a.rawScore || 'N/A'} | Standard: ${a.standardScore || 'N/A'}`,
          `Percentile: ${a.percentile ? a.percentile + 'th' : 'N/A'} | ${a.severityLabel || ''}`
        ],
        goalsUpdated: '3 Created',
        nextSteps: ['Review assessment results', 'Establish care plan'],
        documents: ['Assessment Report', `${a.testName} Protocol`],
        isAssessment: true
      });
    });
  }

  // Sort descending by date
  combinedVisits.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Helper for colors
  const getTypeColors = (type) => {
    if (type.includes('Assessment')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (type.includes('Teletherapy') || type.includes('Therapy Session')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Visit History</h2>
          <p className="text-sm text-slate-500 mt-1">Detailed chronological history of patient visits, sessions, assessments and progress.</p>
        </div>
        <Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/5 bg-white">
          <Download className="h-4 w-4 mr-2" />
          Export History
        </Button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider text-center">Visit #</th>
              <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Date</th>
              <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider text-center">Type</th>
              <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">SLP / Clinician</th>
              <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Purpose / Focus</th>
              <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider w-64">Key Notes / Summary</th>
              <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider text-center">Goals Updated</th>
              <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider w-48">Next Steps</th>
              <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Documents</th>
              <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {combinedVisits.map((visit, idx) => {
              const visitNumber = combinedVisits.length - idx;
              return (
                <tr key={visit.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-6 text-center font-bold text-slate-700 text-base">{visitNumber}</td>
                  <td className="px-5 py-6 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">{visit.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="text-xs text-slate-500 mt-1">{visit.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-5 py-6 text-center whitespace-nowrap">
                    <Badge variant="outline" className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${getTypeColors(visit.type)}`}>
                      {visit.type}
                    </Badge>
                  </td>
                  <td className="px-5 py-6 font-medium text-primary whitespace-nowrap">{visit.slp}</td>
                  <td className="px-5 py-6 text-slate-700 font-medium">{visit.purpose}</td>
                  <td className="px-5 py-6">
                    <ul className="space-y-1.5 list-disc list-outside ml-4 text-xs text-slate-600 leading-relaxed">
                      {visit.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-5 py-6 text-center whitespace-nowrap">
                    <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
                      {visit.goalsUpdated}
                    </span>
                  </td>
                  <td className="px-5 py-6">
                    <ul className="space-y-1.5 list-disc list-outside ml-4 text-xs text-slate-600 leading-relaxed">
                      {visit.nextSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-5 py-6 whitespace-nowrap space-y-2">
                    {visit.documents.map((doc, i) => (
                      <div key={i} className="flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        {doc}
                      </div>
                    ))}
                  </td>
                  <td className="px-5 py-6 text-center">
                    <Button variant="outline" size="sm" className="h-8 text-xs font-semibold text-primary border-primary/20 hover:bg-primary/5">
                      View Details
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            
            {combinedVisits.length === 0 && (
              <tr>
                <td colSpan="10" className="px-6 py-12 text-center text-slate-400 italic">
                  No visits recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientVisitHistoryTable;
