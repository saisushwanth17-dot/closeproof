import os
from functools import lru_cache
from pathlib import Path
from typing import List, Tuple, Dict, Optional
from tavily import TavilyClient
from .reconcile import ReconItem

# Ensure .env is loaded if running standalone or via uvicorn
def _load_env_if_needed():
    if not os.environ.get("TAVILY_API_KEY"):
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

# Contract C v0.2 / Mission 2: Query templates keyed by human_action
ENRICHMENT_TEMPLATES: Dict[str, str] = {
    "write_off": "{merchant} official fee schedule",
    "request_receipt": "{merchant} receipt portal",
    "contact_vendor": "{merchant} official contact / invoice portal",
    "escalate_accountant": "{merchant} business registration",
    "approve_match": "{merchant} business verification",
}


def _extract_merchant(item: ReconItem) -> str:
    """Extracts merchant or vendor name from item evidence candidates."""
    for c in item.candidates:
        if c.field == "merchant" and c.value:
            return str(c.value).strip()
    for c in item.candidates:
        if c.source in ("bank", "invoice", "stripe", "receipt") and c.field in ("memo", "name") and c.value:
            return str(c.value).strip()
    if item.candidates:
        return str(item.candidates[0].value).strip()
    return "vendor"


def get_enrichment_query(merchant: str, action: str) -> str:
    """Generates the targeted search query for a merchant and action using Contract templates."""
    template = ENRICHMENT_TEMPLATES.get(action, "{merchant} business registration")
    return template.format(merchant=merchant.strip())


@lru_cache(maxsize=512)
def _cached_tavily_search(query: str, api_key: str) -> Tuple[str, ...]:
    """
    Cached low-level Tavily search. Returns tuple of authentic URLs.
    Never caches synthesized or hardcoded fallback domains.
    """
    client = TavilyClient(api_key=api_key)
    res = client.search(query, max_results=2, timeout=3.0)
    urls = []
    for r in res.get("results", []):
        u = r.get("url")
        if u and (u.startswith("http://") or u.startswith("https://")):
            if u not in urls:
                urls.append(u)
    return tuple(urls)


@lru_cache(maxsize=512)
def search_tavily(query: str) -> List[str]:
    """
    Searches Tavily with LRU caching (512 entries).
    Returns list of real URLs found by Tavily.
    """
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY not configured")
    return list(_cached_tavily_search(query, api_key))


def enrich_exception(item: ReconItem) -> ReconItem:
    """
    Enriches an exception item using human_action query templates and Tavily Search.
    
    INTEGRITY CONTRACT:
    - Citations may ONLY ever be (a) doc_ids present in the supplied evidence or
      (b) URLs actually returned by Tavily.
    - Never synthesizes fallback domains.
    - On Tavily timeout/error: citations = [] AND appends
      'External verification unavailable at run time.' to the explanation.
    """
    if item.status != "exception":
        return item

    merchant = _extract_merchant(item)
    query = get_enrichment_query(merchant, item.human_action or "")

    try:
        urls = search_tavily(query)

        # Retain only valid doc_ids from supplied evidence
        valid_doc_ids = {c.doc_id for c in item.candidates if c.doc_id}
        kept_citations = [c for c in item.citations if c in valid_doc_ids]

        # Append only authentic URLs returned by Tavily
        for u in urls:
            if u not in kept_citations:
                kept_citations.append(u)

        item.citations = kept_citations

    except Exception:
        # On Tavily timeout/error: citations = [] AND append the sentence
        # "External verification unavailable at run time." to the explanation.
        item.citations = []
        unavailable_phrase = "External verification unavailable at run time."
        if item.explanation:
            if "external verification unavailable" not in item.explanation.lower():
                item.explanation = f"{item.explanation.rstrip()} {unavailable_phrase}"
        else:
            item.explanation = unavailable_phrase

    return item
