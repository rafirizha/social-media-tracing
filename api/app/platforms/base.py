from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..config import RUN_OUTPUT_ROOT


class PlatformExecutionError(RuntimeError):
    pass


@dataclass
class PlatformContext:
    run_id: int
    query: str
    region: str
    max_results: int
    manual_wait_seconds: int

    @property
    def output_dir(self) -> Path:
        path = RUN_OUTPUT_ROOT / f"run-{self.run_id}"
        path.mkdir(parents=True, exist_ok=True)
        return path


@dataclass
class PlatformExecution:
    results: list[dict[str, Any]]
    log_excerpt: str


class BasePlatformRunner:
    platform_name: str
    project_dir: Path
    python_path: Path
    script_name: str

    def run(self, context: PlatformContext) -> PlatformExecution:
        env = os.environ.copy()
        env.update(self.build_env(context))

        completed = subprocess.run(
            [str(self.python_path), self.script_name],
            cwd=self.project_dir,
            env=env,
            text=True,
            capture_output=True,
            timeout=1800,
        )
        log_excerpt = self._build_log_excerpt(completed.stdout, completed.stderr)
        if completed.returncode != 0:
            raise PlatformExecutionError(log_excerpt or f"{self.platform_name} scraper failed")

        return PlatformExecution(results=self.load_results(context), log_excerpt=log_excerpt)

    def build_env(self, context: PlatformContext) -> dict[str, str]:
        return {
            "TRACE_OUTPUT_DIR": str(context.output_dir),
            "TRACE_QUERY": context.query,
            "TRACE_REGION": context.region,
            "TRACE_MAX_RESULTS": str(context.max_results),
            "TRACE_MANUAL_WAIT_SECONDS": str(context.manual_wait_seconds),
        }

    def read_json(self, path: Path) -> list[dict[str, Any]]:
        if not path.exists():
            return []
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            return payload
        return []

    def load_results(self, context: PlatformContext) -> list[dict[str, Any]]:
        raise NotImplementedError

    def _build_log_excerpt(self, stdout: str, stderr: str) -> str:
        text = "\n".join(part.strip() for part in [stdout, stderr] if part.strip())
        return text[-4000:]
