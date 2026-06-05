import os
from dotenv import load_dotenv
load_dotenv()

from groq import Groq
from app.prompts.extract_prompt import EXTRACT_SYSTEM_PROMPT, build_extract_prompt
from app.utils.json_parser import safe_parse_json

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def normalize_accuracy(value):
    """Convert decimal accuracy to whole number. 0.78 → 78"""
    if value is None:
        return None
    if isinstance(value, (int, float)) and value <= 1.0 and value > 0:
        return round(value * 100)
    return value


def normalize_body(data: dict) -> dict:
    """
    Post-processing safety net.
    Fixes decimal accuracies and missing targets throughout the body.
    """
    # Fix exercises
    for ex in data.get("exercises", []):
        ex["accuracy"]          = normalize_accuracy(ex.get("accuracy"))
        ex["previous_accuracy"] = normalize_accuracy(ex.get("previous_accuracy"))
        ex["target_accuracy"]   = normalize_accuracy(ex.get("target_accuracy")) or 80

    # Fix existingGoals
    for g in data.get("existingGoals", []):
        g["current"] = normalize_accuracy(g.get("current") or g.get("current_accuracy"))
        g["target"]  = normalize_accuracy(g.get("target") or g.get("target_accuracy")) or 80
        # Remove old key names if present
        g.pop("current_accuracy", None)
        g.pop("target_accuracy", None)
        if "status" not in g:
            g["status"] = "In Progress"

    # Fix currentPerformance
    for key in data.get("currentPerformance", {}):
        data["currentPerformance"][key] = normalize_accuracy(
            data["currentPerformance"][key]
        )

    # Fix sessionHistory format
    fixed_history = []
    for i, s in enumerate(data.get("sessionHistory", [])):
        # Handle both old and new formats
        entry = {"session": i + 1, "activity": "therapy session", "accuracy": 0}
        if "accuracy" in s:
            entry["accuracy"] = normalize_accuracy(s["accuracy"])
        elif "r_sound_accuracy" in s:
            entry["accuracy"] = normalize_accuracy(s["r_sound_accuracy"])
        if "activity" in s:
            entry["activity"] = s["activity"]
        if "session" in s and s["session"]:
            entry["session"] = s["session"]
        fixed_history.append(entry)
    data["sessionHistory"] = fixed_history

    # Fix goals — remove fragments, ensure full statements
    clean_goals = []
    for g in data.get("goals", []):
        if isinstance(g, str) and len(g) > 15:
            clean_goals.append(g)
        elif isinstance(g, dict):
            clean_goals.append(g)
    data["goals"] = clean_goals

    return data


def extract_session_from_transcript(transcript: str, patient_info: dict = None) -> dict:
    user_prompt = build_extract_prompt(transcript, patient_info)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": EXTRACT_SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt}
        ],
        temperature=0.1,
        max_tokens=2048,
        response_format={"type": "json_object"}
    )

    raw  = response.choices[0].message.content
    data = safe_parse_json(raw)

    # Always normalize — catches any remaining decimal issues
    data = normalize_body(data)

    return data