"""AI screening background task for consignment submissions."""

import asyncio
import logging

from supabase import Client

from app.services import ai_service

logger = logging.getLogger("luxuryloop.consignment")


def run_ai_screening(client, request_id: str) -> None:
    """
    Runs as a FastAPI background task (plain sync function -> dispatched to
    a threadpool, so asyncio.run() here is safe — no event loop already
    running in that thread). Never raises: a failed AI call must never
    leave a submission stuck, so on any error we insert a fallback
    assessment instead and let the trigger route it to manual review.
    """
    request = client.table("authentication_requests").select("*").eq("id", request_id).single().execute().data
    if not request:
        return

    brand_name = ""
    if request.get("brand_id"):
        b = client.table("brands").select("name").eq("id", request["brand_id"]).execute().data
        brand_name = b[0]["name"] if b else ""
    category_name = ""
    if request.get("category_id"):
        c = client.table("categories").select("name").eq("id", request["category_id"]).execute().data
        category_name = c[0]["name"] if c else ""

    image_urls = [
        d["file_url"]
        for d in client.table("request_documents").select("file_url, document_type").eq("request_id", request_id).execute().data or []
        if d["document_type"] == "image"
    ]

    try:
        result = asyncio.run(ai_service.screen_consignment(brand_name, category_name, request.get("model"), image_urls))
        client.table("ai_assessments").insert({
            "request_id": request_id,
            "confidence_score": result["confidence_score"],
            "supporting_indicators": result["supporting_indicators"],
            "suspicious_indicators": result["suspicious_indicators"],
            "explanation": result["explanation"],
            "model_used": "gemini-vision",
            "raw_response": result["raw_response"],
        }).execute()
    except Exception as e:
        logger.warning("AI screening failed for request %s: %s", request_id, e)
        try:
            client.table("ai_assessments").insert({
                "request_id": request_id,
                "confidence_score": None,
                "supporting_indicators": [],
                "suspicious_indicators": [],
                "explanation": f"AI screening unavailable ({e}). Flagged for manual review.",
                "model_used": "fallback",
            }).execute()
        except Exception:
            # A transient database transport failure must not escape a background task.
            logger.exception("Failed to even record a fallback assessment for request %s", request_id)