from __future__ import annotations

from ..config import TIKTOK_DIR
from .base import BasePlatformRunner, PlatformContext


class TikTokRunner(BasePlatformRunner):
    platform_name = "tiktok"
    project_dir = TIKTOK_DIR
    python_path = TIKTOK_DIR / ".venv" / "Scripts" / "python.exe"
    script_name = "scrape_anambas.py"

    def build_env(self, context: PlatformContext) -> dict[str, str]:
        env = super().build_env(context)
        env["TRACE_QUERIES"] = context.query
        env["TRACE_MATCH_TERMS"] = "||".join([context.query, context.region])
        return env

    def load_results(self, context: PlatformContext) -> list[dict]:
        rows = self.read_json(context.output_dir / "tiktok_results.json")
        return [
            {
                "title": row.get("title") or row.get("description") or row.get("creator_display_name") or "TikTok item",
                "actor": row.get("creator_username") or row.get("creator_display_name") or "",
                "url": row.get("url") or "",
                "summary": row.get("description") or row.get("location_snippet") or "",
                "source_label": row.get("query") or context.query,
                "metadata": row,
            }
            for row in rows[: context.max_results]
        ]
