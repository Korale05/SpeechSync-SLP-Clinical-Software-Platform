import json, re

def safe_parse_json(text: str) -> dict:
    """Generic JSON parser — no key validation"""
    text = re.sub(r"```json|```", "", text).strip()
    try:
        return json.loads(text)
    except Exception as e:
        raise ValueError(f"AI returned invalid JSON: {e}\nRaw output: {text[:300]}")

def parse_soap_json(text: str) -> dict:
    """Parser specifically for SOAP notes — validates required keys"""
    parsed = safe_parse_json(text)
    required = {"subjective", "objective", "assessment", "plan"}
    if not required.issubset(parsed.keys()):
        raise ValueError(f"Missing required SOAP keys in AI response\nRaw output: {text[:300]}")
    return parsed

def parse_goals_json(text: str) -> dict:
    """Parser specifically for goal recommendations — validates required keys"""
    parsed = safe_parse_json(text)
    required = {"clinicalSummary", "recommendedGoals"}
    if not required.issubset(parsed.keys()):
        raise ValueError(f"Missing required goal keys in AI response\nRaw output: {text[:300]}")
    return parsed