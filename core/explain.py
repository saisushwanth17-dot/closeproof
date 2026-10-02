import os
import json
from pathlib import Path
from typing import List, Optional
from openai import OpenAI
from .reconcile import ReconItem, Evidence

# Ensure .env is loaded if running standalone or via uvicorn
def _load_env_if_needed():
    if not os.environ.get("NEBIUS_API_KEY"):
        env_file = Path(__file__).resolve().parent.parent / ".env"
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    l = line.strip()
                    if l and not l.startswith("#") and "=" in l:
                        k, v = l.split("=", 1)
                        if k.strip() not in os.environ:
                            os.environ[k.strip()] = v.strip().strip('"').strip("'")

_load_env_if_needed()

# Initialize Nebius Token Factory Client
client = OpenAI(
    base_url="https://api.tokenfactory.nebius.com/v1",
    api_key=os.environ.get("NEBIUS_API_KEY")
)
MODEL_ULTRA = os.environ.get("NEBIUS_MODEL_ULTRA", "nvidia/Nemotron-3-Ultra-550b-a55b")

EXPLAIN_SYSTEM_PROMPT = """You are a forensic bookkeeper AI. 
Your job is to explain WHY a transaction is an exception and what the human should do.
You MUST ONLY use the provided evidence. DO NOT invent documents, amounts, or vendors.
If you don't know, say "Insufficient evidence to determine root cause."

Return your response in STRICT JSON format:
{
  "explanation": "A 1-2 sentence forensic explanation of the discrepancy.",
  "missing_evidence": ["List of specific documents needed to resolve this"],
  "confidence": 0.85,
  "recommended_action": "write_off OR request_receipt OR contact_vendor OR escalate_accountant"
}"""


def explain_exceptions(items: List[ReconItem]) -> List[ReconItem]:
    """
    Loops through exceptions and asks Nemotron Ultra to explain them.
    """
    for item in items:
        if item.status == "exception" and not item.explanation:
            # Build the context for the LLM
            evidence_text = "\n".join([f"- {e.source} ({e.doc_id}): {e.field} = {e.value}" for e in item.candidates])
            user_prompt = f"""
            EXCEPTION AMOUNT: ${item.amount}
            HUMAN ACTION REQUIRED: {item.human_action}
            AVAILABLE EVIDENCE:
            {evidence_text if evidence_text else "No matching evidence found in any tracked source."}
            
            Analyze this exception and return the JSON.
            """

            try:
                response = client.chat.completions.create(
                    model=MODEL_ULTRA,
                    messages=[
                        {"role": "system", "content": EXPLAIN_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )

                # Parse and update the item
                result = json.loads(response.choices[0].message.content)
                item.explanation = result.get("explanation", "AI analysis completed.")
                if "confidence" in result and isinstance(result["confidence"], (int, float)):
                    item.confidence = float(result["confidence"])

                # If the AI suggests a different/better action, update it
                if result.get("recommended_action"):
                    item.human_action = result["recommended_action"]

            except Exception as e:
                item.explanation = f"AI Explanation Error: {str(e)}"

    return items
