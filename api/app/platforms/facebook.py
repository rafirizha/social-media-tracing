from __future__ import annotations

from ..config import FACEBOOK_DIR
from .base import BasePlatformRunner, PlatformContext


class FacebookMarketplaceRunner(BasePlatformRunner):
    platform_name = "facebook_marketplace"
    project_dir = FACEBOOK_DIR
    python_path = FACEBOOK_DIR / ".venv" / "Scripts" / "python.exe"
    script_name = "anambas_facebook_marketplace_v2.py"

    def load_results(self, context: PlatformContext) -> list[dict]:
        rows = self.read_json(context.output_dir / "facebook_marketplace_results.json")
        return [
            {
                "title": row.get("title") or "Marketplace item",
                "actor": row.get("seller_name") or row.get("seller_text") or "",
                "url": row.get("item_url") or "",
                "summary": row.get("price") or row.get("location") or row.get("description") or "",
                "source_label": context.query,
                "metadata": row,
            }
            for row in rows[: context.max_results]
        ]
