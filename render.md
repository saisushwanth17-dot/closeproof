# CloseProof Render Deployment Guide

This guide details the deployment configuration for hosting the CloseProof FastAPI backend on Render.

## Service Configuration

- **Environment**: Python 3
- **Region**: Oregon (US West) or Ohio (US East)
- **Branch**: `main`

### Build Command
```bash
pip install -r requirements.txt
```

### Start Command
```bash
uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

## Environment Variables

Configure the following environment variables in the Render Dashboard:

| Variable | Description | Required | Default |
|---|---|---|---|
| `PORT` | Assigned dynamically by Render | Yes | 10000 |
| `NEBIUS_API_KEY` | Nebius Token Factory API key for Nemotron-3-Ultra | Optional | None (fallback explanation used) |
| `NEBIUS_MODEL_ULTRA` | Nebius model identifier | Optional | `nvidia/Nemotron-3-Ultra-550b-a55b` |
| `TAVILY_API_KEY` | Tavily search API key for live citation enrichment | Optional | None (fallback citation used) |
| `PYTHONUNBUFFERED` | Ensures real-time stdout log streaming | Optional | `1` |

## Endpoints Verified
- `GET /`: Health check
- `POST /api/runs`: Initiates asynchronous reconciliation run and streams Contract C telemetry
- `GET /api/runs/{run_id}`: Retrieves run status and items
- `GET /api/runs/{run_id}/events`: Retrieves telemetry envelope history
- `GET /api/runs/{run_id}/packet.md`: Generates dynamic accountant Markdown packet at request time
- `POST /api/runs/{run_id}/items/{item_id}/action`: Records human accountant decision and broadcasts `action_applied`
- `GET /ws/telemetry`: WebSocket stream for real-time telemetry envelopes
