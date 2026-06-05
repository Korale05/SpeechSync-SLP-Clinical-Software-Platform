import os
from dotenv import load_dotenv
load_dotenv()

from groq import Groq
from app.prompts.goal_prompt import GOAL_SYSTEM_PROMPT, build_goal_prompt
from app.utils.json_parser import parse_goals_json   # ← changed

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def recommend_goals(patient_data: dict) -> dict:
    user_prompt = build_goal_prompt(patient_data)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": GOAL_SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt}
        ],
        temperature=0.2,
        max_tokens=2048,
        response_format={"type": "json_object"}
    )
    raw = response.choices[0].message.content
    return parse_goals_json(raw)   # ← changed