from flask import Blueprint, request, jsonify
from app.services.groq_service import generate_soap_note
from app.services.goal_service import recommend_goals

analyze_bp = Blueprint("analyze", __name__)

@analyze_bp.post("/analyze-session")
def analyze_session():
    data = request.get_json()

    if not data:
        return jsonify({"status": "error", "message": "Request body is empty"}), 400

    results = {}
    errors  = {}

    # Run SOAP generation
    try:
        soap_data = {
            "patient" : data.get("patient"),
            "session" : data.get("session"),
            "goals"   : data.get("goals", []),
            "exercises": data.get("exercises", []),
            "clinician_notes": data.get("clinician_notes", {}),
            "plan_details"   : data.get("plan_details", {})
        }
        results["soapNote"] = generate_soap_note(soap_data)
    except Exception as e:
        errors["soapNote"] = str(e)

    # Run Goal recommendations
    try:
        goal_data = {
            "patient"           : data.get("patient"),
            "diagnosis"         : data.get("patient", {}).get("diagnosis", []),
            "assessment"        : data.get("assessment", {}),
            "currentPerformance": data.get("currentPerformance", {}),
            "existingGoals"     : data.get("existingGoals", []),
            "sessionHistory"    : data.get("sessionHistory", [])
        }
        results["goalRecommendations"] = recommend_goals(goal_data)
    except Exception as e:
        errors["goalRecommendations"] = str(e)

    return jsonify({
        "status" : "success" if not errors else "partial",
        "data"   : results,
        "errors" : errors if errors else None
    }), 200