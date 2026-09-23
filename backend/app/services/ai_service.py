import base64
import json
import asyncio
import httpx
from app.core.config import settings

ASSESSMENT_SYSTEM_PROMPT = """You are an authenticity screening assistant for a luxury resale platform.
You are given a declared brand, category, and model for a consigned item, along with photos
submitted by the seller. Assess how consistent the photos are with genuine production for that
brand/model — stitching, hardware, materials, proportions, visible serial/date markings.

You are a PRELIMINARY, ASSISTIVE screen only — a human specialist always makes the final call in
person. Respond ONLY with a JSON object in this exact shape:
{
  "confidence_score": <number 0-100>,
  "supporting_indicators": [<short strings — things consistent with authenticity>],
  "suspicious_indicators": [<short strings — things that raise doubt; empty list if none>],
  "explanation": "<2-4 sentences of reasoning, ending with one clear recommendation sentence
                   for the human inspector, e.g. 'Recommend physical inspection to confirm X.'>"
}
"""


class AIScreeningError(Exception):
    pass


async def screen_consignment(brand: str, category: str, model: str | None, image_urls: list[str]) -> dict:
    if not settings.ai_assessment_api_key:
        raise AIScreeningError("AI screening is not configured")
    if not image_urls:
        raise AIScreeningError("No photos to screen")

    gemini_model = settings.ai_assessment_provider or "gemini-3.6-flash"
    if gemini_model in {"gemeni-2.0-flash", "gemini-2.0-flash", "gemini-2.5-flash"}:
        gemini_model = "gemini-3.6-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={settings.ai_assessment_api_key}"

    parts = [{
        "text": f"Declared brand: {brand}\nDeclared category: {category}\nDeclared model: {model or 'not specified'}",
    }]

    async with httpx.AsyncClient(timeout=30) as http:
        for image_url in image_urls[:6]:  # cap request size
            img_resp = await http.get(image_url)
            img_resp.raise_for_status()
            b64 = base64.b64encode(img_resp.content).decode()
            mime_type = img_resp.headers.get("content-type", "image/jpeg")
            parts.append({"inline_data": {"mime_type": mime_type, "data": b64}})

        payload = {
            "system_instruction": {"parts": [{"text": ASSESSMENT_SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "response_mime_type": "application/json",  # forces clean JSON, no markdown fences
                "maxOutputTokens": 1000,
            },
        }
        models = list(dict.fromkeys([gemini_model, "gemini-3.5-flash", "gemini-flash-latest"]))
        data = None
        last_error = None
        for model in models:
            model_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.ai_assessment_api_key}"
            for attempt in range(2):
                try:
                    resp = await http.post(model_url, headers={"Content-Type": "application/json"}, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    break
                except httpx.HTTPStatusError as exc:
                    last_error = exc
                    if exc.response.status_code not in (429, 500, 502, 503, 504):
                        break
                    await asyncio.sleep(1)
            if data is not None:
                break
        if data is None:
            raise last_error or AIScreeningError("All AI screening models are unavailable")

    try:
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(raw_text)
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        raise AIScreeningError(f"Could not parse AI response: {data}") from exc

    return {
        "confidence_score": float(parsed["confidence_score"]),
        "supporting_indicators": parsed.get("supporting_indicators", []),
        "suspicious_indicators": parsed.get("suspicious_indicators", []),
        "explanation": parsed.get("explanation", ""),
        "raw_response": data,
    }