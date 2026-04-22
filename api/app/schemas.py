from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


PlatformName = Literal["tiktok", "instagram", "facebook_marketplace"]
RunStatus = Literal["queued", "running", "completed", "failed"]


class RunCreate(BaseModel):
    platform: PlatformName
    query: str = Field(default="", max_length=120)
    region: str = Field(default="Anambas", max_length=120)
    max_results: int = Field(default=20, ge=1, le=100)
    manual_wait_seconds: int = Field(default=60, ge=0, le=300)

    @model_validator(mode="after")
    def validate_query_for_platform(self) -> "RunCreate":
        self.query = self.query.strip()
        if self.platform != "facebook_marketplace" and not self.query:
            raise ValueError("Query wajib diisi untuk TikTok dan Instagram.")
        return self


class ResultItem(BaseModel):
    id: int
    title: str
    actor: str
    url: str
    summary: str
    source_label: str
    metadata: dict[str, Any]


class RunRecord(BaseModel):
    id: int
    platform: PlatformName
    query: str
    region: str
    max_results: int
    manual_wait_seconds: int
    status: RunStatus
    created_at: datetime
    completed_at: datetime | None = None
    error_message: str | None = None
    log_excerpt: str = ""
    result_count: int = 0


class RunDetail(RunRecord):
    results: list[ResultItem]
