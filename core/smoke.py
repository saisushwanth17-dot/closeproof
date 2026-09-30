import os, time
from openai import OpenAI
from tavily import TavilyClient

t0 = time.time()
c = OpenAI(base_url="https://api.tokenfactory.nebius.com/v1", api_key=os.environ["NEBIUS_API_KEY"])
r = c.chat.completions.create(
    model=os.environ.get("NEBIUS_MODEL_NANO", "nvidia/nemotron-3-nano"),
    messages=[{"role": "user", "content": "Reply with the single word: READY"}])
print(f"TokenFactory OK -> {r.choices[0].message.content!r} ({(time.time()-t0)*1000:.0f} ms)")

t0 = time.time()
t = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
print(f"Tavily OK -> {t.search('Nebius Token Factory', max_results=1)['results'][0]['title']!r} ({(time.time()-t0)*1000:.0f} ms)")
