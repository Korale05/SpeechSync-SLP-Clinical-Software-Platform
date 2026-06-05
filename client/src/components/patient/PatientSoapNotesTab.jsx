import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Edit, Trash2, X, Eye } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';

const PatientSoapNotesTab = ({ patient, soapNotes, isLoading }) => {
  const queryClient = useQueryClient();
  const [viewingNote, setViewingNote] = useState(null);

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId) => api.soapNotes.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-soap-notes', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['patient-timeline', patient.id] });
      toast.success('SOAP Note deleted successfully!');
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`);
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 italic">Loading SOAP notes...</div>;
  }

  return (
    <Card className="rounded-xl border-slate-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>SOAP Notes</CardTitle>
          <CardDescription>Clinical documentation history</CardDescription>
        </div>
        <Button variant="outline" onClick={() => window.location.href = `/sessions/new?patientId=${patient.id}`}>
          <FileText className="h-4 w-4 mr-2" /> New Note
        </Button>
      </CardHeader>
      <CardContent>
        {soapNotes && soapNotes.length > 0 ? (
          <div className="space-y-4 border-l-2 border-slate-200 ml-4 pl-6 relative">
            {soapNotes.map((note) => {
              const { soapNote } = note;
              return (
                <div key={note.id} className="relative mb-8 last:mb-2 group">
                  <div className="absolute -left-[35px] top-1.5 h-4.5 w-4.5 rounded-full border-4 border-white bg-blue-500 shadow-xs"></div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-2">
                      <span>{new Date(note.dateOfService).toLocaleDateString('en-IN')}</span>
                      <span>•</span>
                      <span>Clinician ID: {note.clinicianId}</span>
                    </p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setViewingNote(note)}>
                        <Eye className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => toast('Edit feature coming soon!')}>
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2" 
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this SOAP note?')) {
                            deleteNoteMutation.mutate(note.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer" onClick={() => setViewingNote(note)}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-sm text-slate-900">Speech Therapy Session</h4>
                      <Badge variant={note.status === 'LOCKED' || note.status === 'SIGNED' ? 'success' : 'warning'}>
                        {note.status}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                      {soapNote ? (
                        <>
                          <div className="flex gap-2"><span className="font-bold w-4">S:</span> <span className="line-clamp-1">{soapNote.subjective || '--'}</span></div>
                          <div className="flex gap-2"><span className="font-bold w-4">O:</span> <span className="line-clamp-1">{soapNote.objective || '--'}</span></div>
                          <div className="flex gap-2"><span className="font-bold w-4">A:</span> <span className="line-clamp-1">{soapNote.assessment || '--'}</span></div>
                          <div className="flex gap-2"><span className="font-bold w-4">P:</span> <span className="line-clamp-1">{soapNote.plan || '--'}</span></div>
                        </>
                      ) : (
                        <p className="italic text-slate-400">No content.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-8 text-slate-400 italic">No SOAP notes found for this patient.</div>
        )}

        {/* View Modal */}
        {viewingNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden transform animate-in zoom-in-95 duration-200 text-left flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">SOAP Note</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{new Date(viewingNote.dateOfService).toLocaleDateString('en-IN')}</p>
                </div>
                <button onClick={() => setViewingNote(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Subjective (S)</h4>
                  <p className="text-slate-600 bg-slate-50/50 p-3 rounded-lg">{viewingNote.soapNote?.subjective || 'No subjective record'}</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Objective (O)</h4>
                  <p className="text-slate-600 bg-slate-50/50 p-3 rounded-lg">{viewingNote.soapNote?.objective || 'No objective record'}</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Assessment (A)</h4>
                  <p className="text-slate-600 bg-slate-50/50 p-3 rounded-lg">{viewingNote.soapNote?.assessment || 'No assessment record'}</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Plan (P)</h4>
                  <p className="text-slate-600 bg-slate-50/50 p-3 rounded-lg">{viewingNote.soapNote?.plan || 'No plan record'}</p>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <Button onClick={() => setViewingNote(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientSoapNotesTab;
