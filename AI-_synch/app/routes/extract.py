from flask import Blueprint, request, jsonify
from app.services.extract_service import extract_session_from_transcript
from app.services.groq_service import generate_soap_note
from app.services.goal_service import recommend_goals

extract_bp = Blueprint("extract", __name__)


@extract_bp.post("/extract-session")
def extract_session():
    """
    Route 1 — extract only.
    Input : { "transcript": "...", "patientInfo": {...} }
    Output: structured JSON body
    """
    data = request.get_json()

    if not data or "transcript" not in data:
        return jsonify({
            "status": "error",
            "message": "Missing 'transcript' field"
        }), 400

    try:
        structured = extract_session_from_transcript(
            transcript=data["transcript"],
            patient_info=data.get("patientInfo")
        )
        return jsonify({"status": "success", "data": structured}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@extract_bp.post("/transcript-to-soap")
def transcript_to_soap():
    """
    Route 5 — does everything automatically.
    Input : { "transcript": "...", "patientInfo": {...} }
    Output: extractedBody + soapNote + goalRecommendations + masterInsight
    """
    data = request.get_json()

    if not data or "transcript" not in data:
        return jsonify({
            "status": "error",
            "message": "Missing 'transcript' field"
        }), 400

    results = {}
    errors  = {}

    # ── STEP 1: extract structured body from transcript ──────────────
    try:
        structured = extract_session_from_transcript(
            transcript=data["transcript"],
            patient_info=data.get("patientInfo")
        )
        results["extractedBody"] = structured
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Extraction failed: {str(e)}"
        }), 500

    # ── STEP 2: generate SOAP note ────────────────────────────────────
    try:
        results["soapNote"] = generate_soap_note(structured)
    except Exception as e:
        errors["soapNote"] = str(e)

    # ── STEP 3: generate goal recommendations ─────────────────────────
    try:
        goal_input = {
            "patient"           : structured.get("patient"),
            "diagnosis"         : structured.get("patient", {}).get("diagnosis", []),
            "assessment"        : structured.get("assessment", {}),
            "currentPerformance": structured.get("currentPerformance", {}),
            "existingGoals"     : structured.get("existingGoals", []),
            "sessionHistory"    : structured.get("sessionHistory", [])
        }
        results["goalRecommendations"] = recommend_goals(goal_input)
    except Exception as e:
        errors["goalRecommendations"] = str(e)

    # ── STEP 4: build masterInsight ───────────────────────────────────
    soap_summary = ""
    goal_summary = ""

    if "soapNote" in results:
        soap_summary = results["soapNote"].get("clinicalSummary", "")

    if "goalRecommendations" in results:
        goal_summary = results["goalRecommendations"].get("clinicalSummary", "")

    # One clean sentence from each — no repetition
    soap_first = soap_summary.split('.')[0].strip() if soap_summary else ""
    goal_first = goal_summary.split('.')[0].strip() if goal_summary else ""

    if soap_first and goal_first:
        results["masterInsight"] = f"{soap_first}. {goal_first}."
    elif soap_first:
        results["masterInsight"] = f"{soap_first}."
    else:
        results["masterInsight"] = goal_first

    # ── RETURN ────────────────────────────────────────────────────────
    return jsonify({
        "status" : "success" if not errors else "partial",
        "data"   : results,
        "errors" : errors if errors else None
    }), 200