#soap_prompt.py
SYSTEM_PROMPT = """You are a licensed Speech Language Pathology clinical documentation specialist.

Generate SOAP notes that meet ASHA documentation standards.

STRICT RULES:
1. NEVER invent or assume any information not explicitly provided.
2. If a field is missing, write "not reported" — never guess.
3. Use the patient's name throughout. Never say "the patient" generically.
4. Every measurable claim must have a number behind it.
5. Cueing level must appear in both Objective and Assessment sections.
6. Assessment must contain ALL four elements:
   - Progress statement (with numbers)
   - Clinical interpretation (what the numbers mean)
   - Cueing impact (did cueing level change or stay same)
   - Recommendation (continue, modify, discharge planning)
7. Objective must use full professional sentences, not just numbers.
8. Plan must use only clinician-provided plan_details. Never invent tasks.
9. goalProgress must calculate improvement = current - previous for every goal.
10. goalPrediction must use this logic:
    - gap = target - current
    - if gap <= 2: "Likely to achieve within 1-2 sessions"
    - if gap <= 5: "Likely to achieve within 3-5 sessions"
    - if gap <= 10: "Progressing steadily, estimated 6-10 sessions"
    - if gap > 10: "Requires continued intervention, reassess in 30 days"
    - if current >= target: "Goal achieved — consider advancing"
11. clinicalSummary must be 1-2 sentences max. Professional. No fluff.

Return ONLY valid JSON. No markdown. No explanation. No extra text.

Required JSON format:
{
  "subjective": "",
  "objective": "",
  "assessment": "",
  "plan": "",
  "clinicalSummary": "",
  "goalProgress": [
    {
      "goal": "",
      "previous": 0,
      "current": 0,
      "target": 0,
      "improvement": 0,
      "cueing": ""
    }
  ],
  "goalPrediction": [
    {
      "goal": "",
      "current": 0,
      "target": 0,
      "gap": 0,
      "status": ""
    }
  ]
}"""


def build_user_prompt(data: dict) -> str:
    name = data['patient']['name']
    age = data['patient']['age']
    diagnoses = ', '.join(data['patient']['diagnosis'])

    # Session block
    session = data['session']
    session_info = f"{session['type']}, {session['duration']} minutes"
    if session.get('frequency'):
        session_info += f", {session['frequency']}"
    if session.get('session_number'):
        session_info += f", session #{session['session_number']}"

    # Clinician notes block
    cn = data.get('clinician_notes', {})
    if cn:
        notes_block = f"""
Clinician observations:
  - Behavior        : {cn.get('behavior', 'not reported')}
  - Cueing level    : {cn.get('cueing_level', 'not reported')}
  - Patient response: {cn.get('patient_response', 'not reported')}
  - Caregiver report: {cn.get('caregiver_report', 'not reported')}"""
    else:
        notes_block = "\nClinician observations: none provided"

    # Goals block — with previous accuracy and target
    goals_block = ""
    for g in data['goals']:
        if isinstance(g, dict):
            prev    = g.get('previous_accuracy', 'not reported')
            target  = g.get('target_accuracy', 80)
            status  = g.get('status', 'in progress')
            goal_text = g.get('description', g.get('goalText', g.get('goal', 'not specified')))
            goals_block += (
                f"\n  - Goal    : {goal_text}"
                f"\n    Previous: {prev}%  |  Target: {target}%  |  Status: {status}"
            )
        else:
            goals_block += f"\n  - {g} (no previous data, no target provided)"

    # Exercises block — full detail
    exercises_block = ""
    for e in data['exercises']:
        line = f"\n  - Activity : {e['activity']}"
        line += f"\n    Accuracy : {e['accuracy']}%"
        if e.get('previous_accuracy') is not None:
            line += f"  |  Previous: {e['previous_accuracy']}%"
        if e.get('trials'):
            line += f"  |  Trials: {e['trials']}"
        if e.get('cueing'):
            line += f"  |  Cueing: {e['cueing']}"
        if e.get('target_accuracy'):
            line += f"  |  Target: {e['target_accuracy']}%"
        exercises_block += line

    # Plan block
    plan = data.get('plan_details', {})
    if plan:
        plan_block = f"""
Plan details provided by clinician:
  - Next session focus: {plan.get('next_session_focus', 'not specified')}
  - Home practice     : {plan.get('home_practice', 'not specified')}
  - Frequency         : {plan.get('frequency', 'not specified')}"""
    else:
        plan_block = "\nPlan details: none provided by clinician"

    return f"""Generate a complete SOAP note using ONLY the data below.
Do not add any information not explicitly listed here.

Patient   : {name}, age {age}
Diagnoses : {diagnoses}
Session   : {session_info}
{notes_block}

Goals addressed:
{goals_block}

Exercises completed:
{exercises_block}
{plan_block}

CALCULATION INSTRUCTIONS:
- For every exercise, calculate: improvement = current_accuracy - previous_accuracy
- For every goal, calculate: gap = target_accuracy - current_accuracy
- Use gap to generate goalPrediction status using the rules in your system prompt
- Include cueing level from exercise data in goalProgress

REMEMBER:
- Assessment needs: progress + interpretation + cueing impact + recommendation
- Objective needs: full professional sentences with trial counts and cueing
- clinicalSummary: 1-2 sentences, dashboard-ready
- Return ONLY valid JSON"""

TRANSLATE_SYSTEM_PROMPT = """You are an expert clinical medical translator specializing in Speech-Language Pathology terminology.

You will receive a SOAP note structured as JSON. Your task is to translate the content values into the requested target language while maintaining maximum clinical accuracy and professionalism.

STRICT RULES:
1. ONLY translate the VALUES of the JSON keys.
2. Do NOT translate the JSON KEYS themselves (keep them exactly as: subjective, objective, assessment, plan, clinicalSummary).
3. Ensure medical terms are translated to their exact professional equivalents in the target language.
4. Keep the structure intact.
5. Return ONLY valid JSON. No markdown. No explanation."""

def build_translate_prompt(soap_data: dict, target_language: str) -> str:
    return f"""Translate the following SOAP note JSON into {target_language}. Maintain the exact JSON keys and only translate the string values.
    
SOAP Note JSON:
{soap_data}"""