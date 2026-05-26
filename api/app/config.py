from __future__ import annotations

import os
from pathlib import Path


APP_DIR = Path(__file__).resolve().parent
API_DIR = APP_DIR.parent
PROJECT_DIR = API_DIR.parent
TRACING_ROOT = PROJECT_DIR.parent
DATA_DIR = API_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "tracing_mvp.sqlite3"

SCRAPER_ROOT = TRACING_ROOT
TIKTOK_DIR = SCRAPER_ROOT / "tiktok-anambas"
INSTAGRAM_DIR = SCRAPER_ROOT / "instagram-anambas"
FACEBOOK_DIR = SCRAPER_ROOT / "anambas-facebook"

RUN_OUTPUT_ROOT = DATA_DIR / "runs"
RUN_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
AUTH_ROOT = DATA_DIR / "auth"
AUTH_ROOT.mkdir(parents=True, exist_ok=True)


def _load_allowed_origins() -> list[str]:
    raw = os.getenv("TRACE_ALLOWED_ORIGINS")
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


ALLOWED_ORIGINS = _load_allowed_origins()
