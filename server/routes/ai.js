import { Router } from 'express';
import Groq from 'groq-sdk';
import authenticate from '../middleware/authenticate.js';

const router = Router();

router.post('/generate-soap', authenticate, async (req, res) => {
  const { patient, sessionType, duration, exercises, goals } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here' || apiKey.trim() === '') {
    console.warn('No GROQ_API_KEY configured. Groq AI stream requires a valid API key.');
    res.write(`data: ${JSON.stringify({ error: 'Groq API key is missing or not configured in environment variables (GROQ_API_KEY).' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // Active Groq Connection
  try {
    const groq = new Groq({ apiKey });
    const stream = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are a clinical documentation assistant for Speech-Language Pathology.
Generate a professional SOAP note following ASHA preferred practice patterns.
Use objective, measurable, third-person clinical language.
Return ONLY a valid JSON object with exactly these keys: subjective, objective, assessment, plan.
No markdown, no preamble, no explanation — raw JSON only.`
        },
        {
          role: 'user',
          content: `Generate a SOAP note for:
Patient: ${patient?.name || 'Aanya Sharma'}, Age: ${patient?.age || '8 years'}
Diagnosis: ${Array.isArray(patient?.diagnoses) ? patient.diagnoses.join(', ') : 'Phonological Disorder'}
Session type: ${sessionType || 'Individual'}, Duration: ${duration || 45} minutes
Exercises completed: ${JSON.stringify(exercises || [])}
Goals addressed: ${Array.isArray(goals) ? goals.map(g => g.goalText || g).join('; ') : 'Produce /r/ in word-initial position'}`
        }
      ]
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Groq API error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Groq API request failed.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

export default router;
