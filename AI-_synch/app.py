from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from app.routes.soap    import soap_bp
from app.routes.goals   import goals_bp
from app.routes.analyze import analyze_bp
from app.routes.extract import extract_bp    # ← ADD HERE

load_dotenv()
app = Flask(__name__)
CORS(app)

app.register_blueprint(soap_bp,    url_prefix="/api/ai")
app.register_blueprint(goals_bp,   url_prefix="/api/ai")
app.register_blueprint(analyze_bp, url_prefix="/api/ai")
app.register_blueprint(extract_bp, url_prefix="/api/ai")  # ← ADD HERE

@app.get("/")
def root():
    return {
        "status": "SpeechSync AI Service running",
        "endpoints": {
            "soap_only"       : "POST /api/ai/generate-soap",
            "goals_only"      : "POST /api/ai/recommend-goals",
            "unified"         : "POST /api/ai/analyze-session",
            "extract_only"    : "POST /api/ai/extract-session",     # ← ADD HERE
            "transcript_full" : "POST /api/ai/transcript-to-soap",  # ← ADD HERE
            "translate_soap"  : "POST /api/ai/translate-soap"
        }
    }

if __name__ == "__main__":
    app.run(debug=True, port=8001, host="0.0.0.0")