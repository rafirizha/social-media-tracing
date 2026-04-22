from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .platforms.base import PlatformContext, PlatformExecutionError
from .platforms.registry import RUNNERS
from .schemas import RunCreate, RunDetail, RunRecord
from .storage import Storage


app = FastAPI(title="Tracing MVP API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage = Storage()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/platforms")
def list_platforms() -> list[dict[str, str]]:
    return [
        {
            "id": "tiktok",
            "label": "TikTok",
            "description": "Search-based public TikTok scrape.",
        },
        {
            "id": "instagram",
            "label": "Instagram",
            "description": "Hashtag/query-driven public Instagram scrape.",
        },
        {
            "id": "facebook_marketplace",
            "label": "Facebook Marketplace",
            "description": "Marketplace scrape with manual location/filter setup in the opened browser.",
        },
    ]


@app.get("/api/runs", response_model=list[RunRecord])
def list_runs() -> list[dict]:
    return storage.list_runs()


@app.get("/api/runs/{run_id}", response_model=RunDetail)
def get_run(run_id: int) -> dict:
    payload = storage.get_run(run_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return payload


@app.post("/api/runs", response_model=RunDetail)
def create_run(input_data: RunCreate) -> dict:
    runner = RUNNERS[input_data.platform]
    run_id = storage.create_run(input_data.model_dump())
    storage.mark_running(run_id)

    try:
        context = PlatformContext(
            run_id=run_id,
            query=input_data.query,
            region=input_data.region,
            max_results=input_data.max_results,
            manual_wait_seconds=input_data.manual_wait_seconds,
        )
        execution = runner.run(context)
        storage.complete_run(run_id, execution.results, execution.log_excerpt)
    except PlatformExecutionError as exc:
        storage.fail_run(run_id, str(exc), str(exc))
    except Exception as exc:  # pragma: no cover
        storage.fail_run(run_id, str(exc), str(exc))

    payload = storage.get_run(run_id)
    if payload is None:
        raise HTTPException(status_code=500, detail="Run state missing after execution")
    return payload
