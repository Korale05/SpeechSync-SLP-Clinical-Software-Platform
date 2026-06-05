const fs = require('fs');
const code = fs.readFileSync('e:/SpeechSync-SLP-Clinical-Software-Platform-main/client/src/pages/PatientProfile.jsx', 'utf8');

const getBlock = (tag) => {
  const start = code.indexOf(`<TabsContent value="${tag}"`);
  if (start === -1) return '';
  let open = 0, i = start;
  while (i < code.length) {
    if (code.slice(i, i + 12) === '<TabsContent') open++;
    else if (code.slice(i, i + 14) === '</TabsContent>') {
      open--;
      if (open === 0) return code.slice(start, i + 14);
    }
    i++;
  }
  return '';
};

// Extract internal JSX content, stripping out the wrapper Tags
const extractInner = (tag, str) => {
  const block = getBlock(tag);
  if(!block) return '';
  // find first > after start
  const firstClose = block.indexOf('>');
  if(firstClose === -1) return '';
  const inner = block.slice(firstClose + 1, block.lastIndexOf('</TabsContent>')).trim();
  return inner;
};

const overview = extractInner('overview');
const assessments = extractInner('assessments');
const sessions = extractInner('sessions');
const billing = extractInner('billing');
const goals = extractInner('goals');
const documents = extractInner('documents');
const soapNotes = extractInner('soap-notes');

const historyTab = `
        {/* Complete Mega History Tab */}
        <TabsContent value="history" className="space-y-12">
          <div className="bg-slate-900 text-white p-4 rounded-xl font-bold text-lg mb-6 shadow-md sticky top-0 z-10 flex items-center gap-3">
            <User className="h-6 w-6 text-primary" /> 
            <span>Complete Patient History Record</span>
          </div>
          
          <div className="space-y-16">
            <section className="scroll-mt-6" id="history-overview">
              <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2"><User className="h-5 w-5 text-primary"/> Patient Overview</h3>
              ${overview}
            </section>
            
            <section className="scroll-mt-6" id="history-assessments">
              <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/> Assessments Log</h3>
              ${assessments}
            </section>

            <section className="scroll-mt-6" id="history-soap-notes">
              <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/> SOAP Notes</h3>
              ${soapNotes}
            </section>
            
            <section className="scroll-mt-6" id="history-sessions">
              <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2"><Calendar className="h-5 w-5 text-primary"/> Session History</h3>
              ${sessions}
            </section>
            
            <section className="scroll-mt-6" id="history-billing">
              <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2"><Receipt className="h-5 w-5 text-primary"/> Billing & Invoices</h3>
              ${billing}
            </section>
            
            <section className="scroll-mt-6" id="history-goals">
              <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/> Goals & Progress</h3>
              ${goals}
            </section>
            
            <section className="scroll-mt-6" id="history-documents">
              <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2"><File className="h-5 w-5 text-primary"/> Documents</h3>
              ${documents}
            </section>
          </div>
        </TabsContent>
`;

let newCode = code.replace('{/* Complete History Tab (formerly Timeline) */}', historyTab + '\n        {/* Complete History Tab (formerly Timeline) */}');

fs.writeFileSync('e:/SpeechSync-SLP-Clinical-Software-Platform-main/client/src/pages/PatientProfile.jsx', newCode);
console.log('Successfully injected History tab');
