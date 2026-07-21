from __future__ import annotations

import asyncio
import json
from pathlib import Path

from local_scraper.swarm import CrawlSwarm, SwarmConfig


class FakeToolbelt:
    async def scrape(self, url: str):
        links = []
        if url.rstrip("/") == "https://example.com":
            links = ["https://example.com/about", "https://offsite.test/ignored"]
        return {
            "url": url,
            "title": "Example",
            "markdown": f"# {url}",
            "links": links,
            "metadata": {"sourceURL": url},
        }


def test_swarm_scrapes_seed_and_same_host_links(tmp_path: Path) -> None:
    config = SwarmConfig(
        seeds=["https://example.com"],
        output_dir=tmp_path,
        limit=10,
        max_depth=1,
        concurrency=2,
        per_host_delay_seconds=0,
    )
    stats = asyncio.run(CrawlSwarm(FakeToolbelt(), config).run())

    assert stats.fetched == 2
    [run_dir] = list(tmp_path.iterdir())
    records = [
        json.loads(line) for line in (run_dir / "pages.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    fetched_urls = {record["url"].rstrip("/") for record in records}
    assert fetched_urls == {"https://example.com", "https://example.com/about"}
