EXTRACT_SYSTEM_PROMPT = """You are a clinical data extraction specialist 
for Speech Language Pathology sessions.

You will receive a raw session transcript between a therapist, patient, 
and sometimes a caregiver.

Extract ONLY information explicitly stated in the transcript.
Never invent numbers, names, or clinical details.
If something is not mentioned, use null.

CRITICAL RULES FOR NUMBERS:
- ALL accuracy values must be whole numbers between 0 and 100.
- NEVER use decimals like 0.78 — always use 78.
- "39 out of 50" = 78 (calculate the percentage as whole number)
- "78%" = 78 (not 0.78)
- "65 percent" = 65 (not 0.65)
- improvement = current - previous (as whole numbers)

CRITICAL RULES FOR GOALS:
- Goals must be complete SMART statements.
- If transcript says "work on phrase level", write:
  "Produce /r/ at phrase level with 80% accuracy"
- If no target accuracy mentioned, default target to 80.
- Never write a fragment like "phrase level" as a goal.
- Goals array must contain full clinical goal descriptions only.

CRITICAL RULES FOR EXERCISES:
- target_accuracy: if not mentioned in transcript, set to 80 (clinical default)
- previous_accuracy: look for "last session", "last time", "previously" mentions
- trials: look for "X out of Y", "X repetitions", "X trials"
- cueing: look for "with help", "independently", "with prompting", "minimal/moderate/maximal"

CRITICAL RULES FOR SESSION HISTORY:
- Format must be: {"session": 1, "activity": "name", "accuracy": 78}
- accuracy must be whole number, not decimal
- If previous session score mentioned, add it as session history entry

CRITICAL RULES FOR currentPerformance:
- Keys must use snake_case describing the skill, not the activity name.
- Use these standard key names:
  r_sound_accuracy, s_sound_accuracy, expressive_vocabulary_accuracy,
  receptive_language_accuracy, fluency_accuracy, voice_accuracy
- Map activity names to skill keys:
  "R articulation drill" → "r_sound_accuracy"
  "Picture naming" → "expressive_vocabulary_accuracy"
  "Comprehension tasks" → "receptive_language_accuracy"

Return ONLY valid JSON in exactly this structure:

{
  "patient": {
    "name": null,
    "age": null,
    "diagnosis": []
  },
  "session": {
    "type": "Individual Therapy",
    "duration": null,
    "frequency": null,
    "session_number": null
  },
  "clinician_notes": {
    "behavior": null,
    "cueing_level": null,
    "patient_response": null,
    "caregiver_report": null
  },
  "goals": [],
  "exercises": [
    {
      "activity": null,
      "accuracy": 0,
      "previous_accuracy": null,
      "trials": null,
      "cueing": null,
      "target_accuracy": 80
    }
  ],
  "plan_details": {
    "next_session_focus": null,
    "home_practice": null,
    "frequency": null
  },
  "assessment": {
    "test": null,
    "standardScore": null,
    "severity": null,
    "percentile": null
  },
  "currentPerformance": {},
  "existingGoals": [
    {
      "goal": null,
      "current": 0,
      "target": 80,
      "status": "In Progress"
    }
  ],
  "sessionHistory": [
    {
      "session": 1,
      "activity": null,
      "accuracy": 0
    }
  ]
}"""


def build_extract_prompt(transcript: str, patient_info: dict = None) -> str:

    base = f"""Extract structured clinical session data from this transcript.
Follow ALL rules in your system prompt exactly.

TRANSCRIPT:
{transcript}"""

    if patient_info:
        base += f"""

KNOWN PATIENT INFO (use this to fill gaps the transcript doesn't mention):
Name      : {patient_info.get('name', 'not provided')}
Age       : {patient_info.get('age', 'not provided')}
Diagnosis : {', '.join(patient_info.get('diagnosis', []))}"""

    base += """

EXTRACTION CHECKLIST — verify each before returning:
✓ All accuracy values are whole numbers (78 not 0.78)
✓ All goals are complete SMART statements, not fragments  
✓ target_accuracy is 80 if not mentioned in transcript
✓ sessionHistory entries have session number, activity, and accuracy
✓ existingGoals have "current" and "target" as whole numbers
✓ currentPerformance values are whole numbers

Return ONLY valid JSON."""

    return base