from flask import Blueprint, request, jsonify
from app.services.goal_service import recommend_goals

goals_bp = Blueprint("goals", __name__)

def unwrap(data: dict) -> dict:
    if data and "data" in data and "status" in data:
        return data["data"]
    return data

@goals_bp.post("/recommend-goals")
def get_goal_recommendations():
    raw  = request.get_json()
    data = unwrap(raw)

    if not data:
        return jsonify({"status": "error", "message": "Request body is empty"}), 400

    if "patient" not in data:
        return jsonify({"status": "error", "message": "Missing patient field"}), 400

    # ← Fix: diagnosis lives inside patient, not at top level
    # Extract it from patient if not at top level
    if "diagnosis" not in data:
        patient_diagnosis = data.get("patient", {}).get("diagnosis", [])
        data["diagnosis"] = patient_diagnosis

    try:
        result = recommend_goals(data)
        return jsonify({"status": "success", "data": result}), 200

    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 422

    except Exception as e:
        return jsonify({"status": "error", "message": f"AI error: {str(e)}"}), 500