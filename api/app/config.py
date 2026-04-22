from __future__ import annotations

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
