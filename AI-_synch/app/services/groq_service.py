import os
from dotenv import load_dotenv
load_dotenv()

from groq import Groq
from app.prompts.soap_prompt import SYSTEM_PROMPT, build_user_prompt
from app.utils.json_parser import parse_soap_json   # ← changed

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_soap_note(session_data: dict) -> dict:
    user_prompt = build_user_prompt(session_data)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt}
        ],
        temperature=0.3,
        max_tokens=1024,
        response_format={"type": "json_object"}
    )
    raw = response.choices[0].message.content
    return parse_soap_json(raw)   # ← changed