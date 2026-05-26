from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS
from .platforms.base import PlatformContext, PlatformExecutionError
from .platforms.registry import RUNNERS
from .schemas import MarketplaceLoginCreate, RunCreate, RunDetail, RunRecord
from .storage import Storage


app = FastAPI(title="Tracing API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage = Storage()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/platforms")
def list_platforms() -> list[dict[str, object]]:
    marketplace_auth = storage.get_platform_auth("facebook_marketplace")
    return [
        {
            "id": "tiktok",
            "label": "TikTok",
            "description": "Search-based public TikTok scrape.",
            "requires_login": False,
            "authenticated_at": None,
        },
        {
            "id": "instagram",
            "label": "Instagram",
            "description": "Hashtag/query-driven public Instagram scrape.",
            "requires_login": False,
            "authenticated_at": None,
        },
        {
            "id": "facebook_marketplace",
            "label": "Facebook Marketplace",
            "description": "Marketplace scrape after a dedicated login step in the opened browser.",
            "requires_login": True,
            "authenticated_at": marketplace_auth["authenticated_at"] if marketplace_auth else None,
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


@app.post("/api/platforms/facebook_marketplace/login")
def login_facebook_marketplace(input_data: MarketplaceLoginCreate) -> dict[str, str]:
    runner = RUNNERS["facebook_marketplace"]
    try:
        log_excerpt = runner.prepare_login(input_data.manual_wait_seconds)
        payload = storage.set_platform_auth("facebook_marketplace")
        payload["log_excerpt"] = log_excerpt
        return payload
    except PlatformExecutionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/runs", response_model=RunDetail)
def create_run(input_data: RunCreate) -> dict:
    if input_data.platform == "facebook_marketplace" and not storage.is_platform_authenticated(
        "facebook_marketplace"
    ):
        raise HTTPException(status_code=409, detail="Login Facebook Marketplace dulu sebelum tracing.")

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


@app.delete("/api/runs/{run_id}")
def delete_run(run_id: int) -> dict[str, str]:
    deleted = storage.delete_run(run_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"status": "deleted"}
