#soap.py
from flask import Blueprint, request, jsonify
from app.services.groq_service import generate_soap_note
from app.validators.session_validator import validate_request

soap_bp = Blueprint("soap", __name__)

@soap_bp.post("/generate-soap")
def generate_soap():
    data = request.get_json()

    # Validate
    error = validate_request(data)
    if error:
        return jsonify({"status": "error", "message": error}), 400

    try:
        result = generate_soap_note(data)
        return jsonify({"status": "success", "data": result}), 200

    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 422

    except Exception as e:
        return jsonify({"status": "error", "message": f"AI service error: {str(e)}"}), 500