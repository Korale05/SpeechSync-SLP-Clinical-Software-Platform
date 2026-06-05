#session_validator.py
def validate_request(data: dict) -> str:
    """Returns error message string if invalid, None if valid"""

    if not data:
        return "Request body is empty"

    # Check top level keys
    for key in ["patient", "session", "goals", "exercises"]:
        if key not in data:
            return f"Missing required field: '{key}'"

    # Check patient fields
    patient = data["patient"]
    for key in ["name", "age", "diagnosis"]:
        if key not in patient:
            return f"Missing patient field: '{key}'"

    # Check session fields
    session = data["session"]
    for key in ["type", "duration"]:
        if key not in session:
            return f"Missing session field: '{key}'"

    # Check goals and exercises are lists
    if not isinstance(data["goals"], list) or len(data["goals"]) == 0:
        return "Goals must be a non-empty list"

    if not isinstance(data["exercises"], list) or len(data["exercises"]) == 0:
        return "Exercises must be a non-empty list"

    # Check each exercise has activity and accuracy
    for i, ex in enumerate(data["exercises"]):
        if "activity" not in ex or "accuracy" not in ex:
            return f"Exercise {i+1} missing 'activity' or 'accuracy'"

    return None  # All good