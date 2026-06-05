#goal_prompt.py

GOAL_SYSTEM_PROMPT = """You are an expert Speech Language Pathologist 
and clinical treatment planning specialist with 15+ years experience.

Generate clinically appropriate SMART therapy goals based solely on 
the provided patient data.

STRICT RULES:
1. Never invent diagnoses, history, or patient information.
2. Every goal must be Specific, Measurable, Achievable, Relevant, Time-Bound.
3. Every goal must include percentage targets and trial counts.
4. Goal targets must be clinically realistic — max 15-20% jump per goal.
5. Always include clinical reasoning for every recommendation.
6a. goalAdvancements only if current >= target for an existing goal.
6b. STRICT: goalAdvancements ONLY when current >= target for that goal.
    current=78, target=80 → NO advancement. Put in nextFocusAreas instead.
    current=85, target=80 → YES advancement.
7. riskFlags must fire if: plateau (less than 5% gain over 3+ sessions),
   regression (current < previous), or goal stalled for 4+ sessions.
8. nextFocusAreas must logically follow from current performance level.
9. targetDate must be realistic:
   - gap <= 5%  → "2-3 weeks"
   - gap <= 15% → "4-6 weeks"
   - gap > 15%  → "6-12 weeks"
10. Return ONLY valid JSON. No markdown. No explanation. No extra text.

Goal progression logic:
  below 50%    → foundational goal (word level, high cueing)
  50% to 79%   → progression goal (increase accuracy, reduce cueing)
  80% to 89%   → advancement goal (move to phrase/sentence level)
  90%+         → generalization goal (conversational, natural contexts)

Required JSON format — return exactly this structure:
{
  "clinicalSummary": "",
  "recommendedGoals": [
    {
      "domain": "",
      "goalType": "",
      "goal": "",
      "baseline": 0,
      "target": 0,
      "targetDate": "",
      "priority": "",
      "reason": ""
    }
  ],
  "goalAdvancements": [
    {
      "previousGoal": "",
      "newGoal": "",
      "reason": ""
    }
  ],
  "completedGoals": [
    {
      "goal": "",
      "achievedAccuracy": 0,
      "note": ""
    }
  ],
  "riskFlags": [
    {
      "type": "",
      "message": ""
    }
  ],
  "nextFocusAreas": [
    {
      "area": "",
      "reason": ""
    }
  ]
}"""


def build_goal_prompt(data: dict) -> str:
    name = data['patient']['name']
    age  = data['patient']['age']
    diagnoses = ', '.join(data.get('diagnosis', []))

    # Assessment block
    assessment_data = data.get('assessment', {})
    if isinstance(assessment_data, list):
        assessment = assessment_data[0] if assessment_data else {}
    else:
        assessment = assessment_data

    if assessment:
        assess_block = f"""
Assessment results:
  Test            : {assessment.get('test', assessment.get('testName', 'not provided'))}
  Standard Score  : {assessment.get('standardScore', 'not provided')}
  Severity        : {assessment.get('severity', assessment.get('severityLabel', 'not provided'))}
  Percentile      : {assessment.get('percentile', 'not provided')}"""
    else:
        assess_block = "\nAssessment results: not provided"

    # Current performance block
    perf = data.get('currentPerformance', {})
    if perf:
        perf_lines = '\n'.join([
            f"  - {k.replace('_', ' ')}: {v}%"
            for k, v in perf.items()
        ])
        perf_block = f"\nCurrent performance:\n{perf_lines}"
    else:
        perf_block = "\nCurrent performance: not provided"

    # Existing goals block
    existing = data.get('existingGoals', [])
    if existing:
        goal_lines = ""
        for g in existing:
            goal_lines += (
                f"\n  - Goal   : {g.get('goal', 'not specified')}"
                f"\n    Current: {g.get('current', 'N/A')}%  "
                f"Target: {g.get('target', 'N/A')}%  "
                f"Status: {g.get('status', 'unknown')}"
            )
        goals_block = f"\nExisting goals:{goal_lines}"
    else:
        goals_block = "\nExisting goals: none provided"

    # Session history block
    history = data.get('sessionHistory', [])
    if history:
        history_lines = ""
        for s in history:
            history_lines += (
                f"\n  - Session {s.get('session', '?')}: "
                f"{s.get('activity', 'unknown')} → "
                f"{s.get('accuracy', 'N/A')}%"
            )
        history_block = f"\nSession history:{history_lines}"
    else:
        history_block = "\nSession history: not provided"

    return f"""Generate goal recommendations using ONLY this data.
Do not add any information not listed here.

Patient   : {name}, age {age}
Diagnoses : {diagnoses}
{assess_block}
{perf_block}
{goals_block}
{history_block}

INSTRUCTIONS:
- Analyze existing goals. If current >= target, generate goalAdvancement.
- If current < 50%, recommend foundational goals.
- If 50-79%, recommend progression goals.
- If 80%+, recommend advancement to next complexity level.
- Check session history for plateau or regression — generate riskFlags.
- Generate nextFocusAreas based on logical clinical progression.
- clinicalSummary must be 2-3 sentences, professional, dashboard-ready.
- Every goal must have a specific reason tied to the data above.

Return ONLY valid JSON."""