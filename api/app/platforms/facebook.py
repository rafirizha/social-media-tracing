from __future__ import annotations

from ..config import AUTH_ROOT, FACEBOOK_DIR
from .base import BasePlatformRunner, PlatformContext, PlatformExecutionError


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

    def prepare_login(self, manual_wait_seconds: int) -> str:
        login_dir = AUTH_ROOT / "facebook_marketplace"
        login_dir.mkdir(parents=True, exist_ok=True)
        completed = self._execute(
            {
                "TRACE_OUTPUT_DIR": str(login_dir),
                "TRACE_QUERY": "",
                "TRACE_REGION": "Anambas",
                "TRACE_MAX_RESULTS": "1",
                "TRACE_MANUAL_WAIT_SECONDS": str(manual_wait_seconds),
                "TRACE_LOGIN_ONLY": "1",
            }
        )
        log_excerpt = self._build_log_excerpt(completed.stdout, completed.stderr)
        if completed.returncode != 0:
            raise PlatformExecutionError(log_excerpt or "Facebook Marketplace login preparation failed")
        return log_excerpt
