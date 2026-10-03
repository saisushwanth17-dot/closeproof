"""
CloseProof Batch Jobs Engine (core/jobs.py).
Provides parallelized and batch background jobs, including OCR document ingestion
powered by Tesseract OCR and NVIDIA Nemotron-3-Nano for structured entity extraction.
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

MODEL_NANO = os.environ.get("NEBIUS_MODEL_NANO", "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B")

EXTRACTION_SYSTEM_PROMPT = """You are a financial receipt and invoice OCR extraction AI.
Given raw OCR text from a financial document, extract the following structured entities:
- merchant: Vendor or business name (string)
- date: Date of purchase or invoice formatted as YYYY-MM-DD (string)
- total: Numerical grand total amount (numeric float)
- currency: ISO 3-letter currency code (e.g. USD, EUR, GBP) (string)

Return STRICT JSON format only:
{
  "merchant": "Vendor Name",
  "date": "2026-09-15",
  "total": 320.00,
  "currency": "USD"
}"""


def _get_nano_client():
    """
    Retrieves or initializes the OpenAI-compatible client for Nebius Token Factory.
    Falls back gracefully across core/nebius.py or core/explain.py if present.
    """
    try:
        from core.nebius import client as nebius_client
        return nebius_client
    except (ImportError, AttributeError):
        pass

    try:
        from core.explain import _get_client
        client = _get_client()
        if client is not None:
            return client
    except (ImportError, AttributeError):
        pass

    from openai import OpenAI
    api_key = os.environ.get("NEBIUS_API_KEY", "")
    return OpenAI(
        base_url=os.environ.get("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1"),
        api_key=api_key or "mock-key",
    )


def _mock_ocr_extraction(path: str) -> Dict[str, Any]:
    """
    Returns deterministic mock financial extractions for NEBIUS_MOCK=1 mode.
    Guarantees strict schema adherence without invoking Tesseract or network APIs.
    """
    p_lower = str(path).lower()
    if "coffee" in p_lower or "personal" in p_lower or "18" in p_lower:
        return {
            "merchant": "Blue Bottle Coffee",
            "date": "2026-09-18",
            "total": 18.50,
            "currency": "USD",
        }
    elif "acme" in p_lower or "invoice" in p_lower or "1042" in p_lower:
        return {
            "merchant": "Acme Corp",
            "date": "2026-09-10",
            "total": 1250.00,
            "currency": "USD",
        }
    elif "fee" in p_lower or "147" in p_lower:
        return {
            "merchant": "Chase Commercial Banking",
            "date": "2026-09-01",
            "total": 147.00,
            "currency": "USD",
        }
    else:
        # Default mock extraction for receipts (e.g. Home Depot $320.00)
        return {
            "merchant": "Home Depot",
            "date": "2026-09-15",
            "total": 320.00,
            "currency": "USD",
        }


def run_ocr_batch(image_paths: List[str]) -> List[Dict[str, Any]]:
    """
    Executes a batch OCR extraction job on a list of image file paths.

    1. If NEBIUS_MOCK=1, returns deterministic mock extractions without calling Tesseract or Nebius.
    2. Otherwise, uses pytesseract and PIL to extract raw text, and passes it to Nemotron Nano
       (tier="nano") with a strict JSON prompt to extract: {merchant, date, total, currency}.
    """
    is_mock = os.environ.get("NEBIUS_MOCK") == "1"
    if is_mock:
        return [_mock_ocr_extraction(p) for p in image_paths]

    try:
        from PIL import Image
        import pytesseract
    except ImportError as e:
        raise ImportError(f"pytesseract and Pillow are required for live OCR jobs: {e}")

    client = _get_nano_client()
    results: List[Dict[str, Any]] = []

    for img_path in image_paths:
        try:
            img = Image.open(img_path)
            raw_text = pytesseract.image_to_string(img)

            prompt = f"OCR TEXT FROM DOCUMENT:\n```\n{raw_text}\n```"
            completion = client.chat.completions.create(
                model=MODEL_NANO,
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.0,
            )

            content = completion.choices[0].message.content or "{}"
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            data = json.loads(content.strip())
            results.append({
                "merchant": str(data.get("merchant", "Unknown Merchant")),
                "date": str(data.get("date", "2026-09-15")),
                "total": float(data.get("total", 0.0)),
                "currency": str(data.get("currency", "USD")),
            })
        except Exception as e:
            results.append({
                "merchant": "Unknown Merchant",
                "date": "2026-09-15",
                "total": 0.0,
                "currency": "USD",
                "error": str(e),
            })

    return results
