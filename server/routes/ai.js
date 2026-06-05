import { Router } from 'express';
import Groq from 'groq-sdk';
import authenticate from '../middleware/authenticate.js';

const router = Router();

router.post('/generate-soap', authenticate, async (req, res) => {
  const { patient, session, clinician_notes, exercises, goals } = req.body;

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here' || apiKey.trim() === '') {
    console.warn('No GROQ_API_KEY configured.');
    return res.status(500).json({ error: 'Groq API key is missing or not configured.' });
  }

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      temperature: 0.2,
      response_format: { type: 'json_object' },
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
Diagnosis: ${Array.isArray(patient?.diagnosis) ? patient.diagnosis.join(', ') : 'Phonological Disorder'}
Session type: ${session?.type || 'Individual'}, Duration: ${session?.duration || 45} minutes
Clinician Notes: ${JSON.stringify(clinician_notes || {})}
Exercises completed: ${JSON.stringify(exercises || [])}
Goals addressed: ${Array.isArray(goals) ? goals.map(g => g.description || g).join('; ') : 'Produce /r/ in word-initial position'}`
        }
      ]
    });

    const aiContent = completion.choices[0]?.message?.content || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(aiContent);
    } catch (e) {
      console.error('Failed to parse AI response as JSON', aiContent);
      return res.status(500).json({ error: 'AI returned invalid JSON' });
    }

    res.json({ data: parsedData });
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: 'Groq API request failed.' });
  }
});

router.post('/recommend-goals', authenticate, async (req, res) => {
  const { patient, session, exercises, existingGoals, currentPerformance, plan_details } = req.body;

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here' || apiKey.trim() === '') {
    return res.status(500).json({ error: 'Groq API key is missing or not configured.' });
  }

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert Speech-Language Pathologist reviewing patient progress to recommend new or updated clinical goals.
Return ONLY a valid JSON object with exactly these keys:
- clinicalSummary (string: brief summary of progress)
- goalAdvancements (array of objects with keys: previousGoal, newGoal, reason)
- nextFocusAreas (array of objects with keys: area, reason)
- recommendedGoals (array of objects with keys: domain, target, targetDate, goal, reason)
No markdown formatting, no preamble, raw JSON only.`
        },
        {
          role: 'user',
          content: `Generate goal recommendations for:
Patient: ${patient?.name || 'Aanya Sharma'}, Age: ${patient?.age || '8 years'}
Diagnosis: ${Array.isArray(patient?.diagnosis) ? patient.diagnosis.join(', ') : 'Phonological Disorder'}
Existing Goals: ${JSON.stringify(existingGoals || [])}
Exercises Completed: ${JSON.stringify(exercises || [])}
Current Performance: ${JSON.stringify(currentPerformance || {})}
Next Plan Details: ${JSON.stringify(plan_details || {})}`
        }
      ]
    });

    const aiContent = completion.choices[0]?.message?.content || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(aiContent);
    } catch (e) {
      console.error('Failed to parse AI response as JSON', aiContent);
      return res.status(500).json({ error: 'AI returned invalid JSON' });
    }

    res.json({ data: parsedData });
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: 'Groq API request failed.' });
  }
});

export default router;
