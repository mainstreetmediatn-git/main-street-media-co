from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class CrawlTask(BaseModel):
    url: HttpUrl
    depth: int = 0
    referrer: str | None = None


class PageResult(BaseModel):
    url: str
    worker_id: str
    ok: bool
    depth: int
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    title: str | None = None
    markdown: str | None = None
    html: str | None = None
    links: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None

