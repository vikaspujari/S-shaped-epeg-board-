import asyncio
import json
import os
import urllib.error
import urllib.request
from typing import Any, Optional


GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-2.5-flash"


def _format_rounds(events: list[dict]) -> str:
    lines = []
    for index, event in enumerate(events, start=1):
        lines.append(
            f"{index}. {event.get('shape')} {event.get('side')} hole {event.get('hole_id')}: "
            f"{event.get('time_taken')}s, {event.get('wrong_attempts')} wrong attempts"
        )
    return "\n".join(lines)


def _build_prompt(summary: dict) -> str:
    prompt_id = summary.get("ai_request_id") or summary.get("session_id") or "new-session"
    return f"""
You are assisting a rehabilitation pegboard training app.
Create fresh coaching guidance for this exact session. Do not reuse advice from a prior session.
Use plain language, avoid medical diagnosis, and respond only with valid JSON.
The JSON object must use this shape:
{{
  "summary": "One encouraging sentence summarizing this run.",
  "focus": "One short focus area based on the slowest or most error-prone result.",
  "tips": [
    {{"area": "Speed", "recommendation": "One practical tip.", "reason": "Why this helps."}},
    {{"area": "Accuracy", "recommendation": "One practical tip.", "reason": "Why this helps."}}
  ],
  "next_step": {{"difficulty": "Easy, Medium, or Hard", "why": "One sentence explaining the next difficulty."}}
}}

Session:
- Unique AI request id: {prompt_id}
- Session id: {summary.get("session_id")}
- Generated at: {summary.get("generated_at")}
- Total time: {summary.get("total_time")} seconds
- Average time per hole: {summary.get("avg_time")} seconds
- Slowest hole: {summary.get("slowest_hole")}
- Current difficulty: {summary.get("difficulty")}
- Suggested difficulty: {summary.get("suggested_difficulty")}
- Per-round events:
{_format_rounds(summary.get("events", []))}
""".strip()


def _extract_text(response: dict) -> Optional[str]:
    candidates = response.get("candidates") or []
    for candidate in candidates:
        parts = candidate.get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts).strip()
        if text:
            return text
    return None


def _parse_json_text(text: str) -> Optional[dict[str, Any]]:
    clean_text = text.strip()
    if clean_text.startswith("```"):
        clean_text = clean_text.removeprefix("```json").removeprefix("```").strip()
        clean_text = clean_text.removesuffix("```").strip()

    try:
        parsed = json.loads(clean_text)
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None


def _fallback_structured_text(text: str) -> dict[str, Any]:
    return {
        "summary": text,
        "focus": "Review the slowest round and repeat that shape-side pattern with steady pacing.",
        "tips": [],
        "next_step": {
            "difficulty": "Current",
            "why": "Use the numeric recommendation above if AI structure is unavailable.",
        },
    }


def _request_gemini(prompt: str) -> Optional[dict[str, Any]]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[AI] GEMINI_API_KEY is not set for this backend process.")
        return None

    model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
    url = f"{GEMINI_API_URL.format(model=model)}?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 420,
            "responseMimeType": "application/json",
        },
    }
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"[AI] Gemini request failed: {exc}")
        return None

    text = _extract_text(data)
    if not text:
        return None

    return _parse_json_text(text) or _fallback_structured_text(text)


async def generate_session_recommendation(summary: dict) -> Optional[dict[str, Any]]:
    prompt = _build_prompt(summary)
    return await asyncio.to_thread(_request_gemini, prompt)
