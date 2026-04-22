from __future__ import annotations

from ..config import INSTAGRAM_DIR
from .base import BasePlatformRunner, PlatformContext


class InstagramRunner(BasePlatformRunner):
    platform_name = "instagram"
    project_dir = INSTAGRAM_DIR
    python_path = INSTAGRAM_DIR / ".venv" / "Scripts" / "python.exe"
    script_name = "scrape_instagram.py"

    def build_env(self, context: PlatformContext) -> dict[str, str]:
        env = super().build_env(context)
        env["TRACE_SEEDS"] = context.query
        return env

    def load_results(self, context: PlatformContext) -> list[dict]:
        rows = self.read_json(context.output_dir / "instagram_posts.json")
        return [
            {
                "title": row.get("caption") or row.get("location_text") or row.get("author_username") or "Instagram post",
                "actor": row.get("author_username") or "",
                "url": row.get("post_url") or "",
                "summary": row.get("hashtags") or row.get("location_text") or "",
                "source_label": row.get("source_seed") or context.query,
                "metadata": row,
            }
            for row in rows[: context.max_results]
        ]
