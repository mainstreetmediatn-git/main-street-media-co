from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    firecrawl_api_key: str | None
    output_dir: Path
    concurrency: int
    per_host_delay_seconds: float


def load_settings() -> Settings:
    load_dotenv()
    return Settings(
        firecrawl_api_key=os.getenv("FIRECRAWL_API_KEY"),
        output_dir=Path(os.getenv("LOCAL_SCRAPER_OUTPUT_DIR", "data/runs")),
        concurrency=int(os.getenv("LOCAL_SCRAPER_CONCURRENCY", "4")),
        per_host_delay_seconds=float(os.getenv("LOCAL_SCRAPER_PER_HOST_DELAY_SECONDS", "1.0")),
    )

