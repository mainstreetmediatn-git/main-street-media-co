from __future__ import annotations

import asyncio
import hashlib
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urldefrag, urljoin, urlparse

from .firecrawl_toolbelt import FirecrawlToolbelt
from .models import CrawlTask, PageResult
from .storage import JsonlRunStore


@dataclass
class SwarmConfig:
    seeds: list[str]
    output_dir: Path
    limit: int = 100
    max_depth: int = 2
    concurrency: int = 4
    same_host_only: bool = True
    per_host_delay_seconds: float = 1.0


@dataclass
class SwarmStats:
    run_id: str
    queued: int = 0
    fetched: int = 0
    failed: int = 0
    skipped: int = 0


@dataclass
class CrawlSwarm:
    toolbelt: FirecrawlToolbelt
    config: SwarmConfig
    seen: set[str] = field(default_factory=set)
    last_host_fetch: dict[str, float] = field(default_factory=lambda: defaultdict(float))

    async def run(self) -> SwarmStats:
        run_id = self._run_id(self.config.seeds)
        store = JsonlRunStore(self.config.output_dir / run_id)
        store.open()
        queue: asyncio.Queue[CrawlTask | None] = asyncio.Queue()
        stats = SwarmStats(run_id=run_id)

        for seed in self.config.seeds:
            normalized = self._normalize(seed)
            if normalized:
                self.seen.add(normalized)
                await queue.put(CrawlTask(url=normalized, depth=0))
                stats.queued += 1

        workers = [
            asyncio.create_task(self._worker(f"worker-{idx + 1}", queue, store, stats))
            for idx in range(self.config.concurrency)
        ]

        await queue.join()
        for _ in workers:
            await queue.put(None)
        await asyncio.gather(*workers)
        return stats

    async def _worker(
        self,
        worker_id: str,
        queue: asyncio.Queue[CrawlTask | None],
        store: JsonlRunStore,
        stats: SwarmStats,
    ) -> None:
        while True:
            task = await queue.get()
            try:
                if task is None:
                    return
                if stats.fetched >= self.config.limit:
                    stats.skipped += 1
                    continue
                await self._respect_host_delay(str(task.url))
                result = await self._fetch(worker_id, task)
                store.write_page(result)
                if result.ok:
                    stats.fetched += 1
                    await self._enqueue_links(queue, task, result.links, stats)
                else:
                    stats.failed += 1
            finally:
                queue.task_done()

    async def _fetch(self, worker_id: str, task: CrawlTask) -> PageResult:
        url = str(task.url)
        try:
            scraped = await self.toolbelt.scrape(url)
            return PageResult(
                url=scraped.get("url", url),
                worker_id=worker_id,
                ok=True,
                depth=task.depth,
                title=scraped.get("title"),
                markdown=scraped.get("markdown"),
                html=scraped.get("html"),
                links=scraped.get("links", []),
                metadata=scraped.get("metadata", {}),
            )
        except Exception as exc:  # noqa: BLE001 - persisted for crawl diagnostics.
            return PageResult(url=url, worker_id=worker_id, ok=False, depth=task.depth, error=str(exc))

    async def _enqueue_links(
        self,
        queue: asyncio.Queue[CrawlTask | None],
        task: CrawlTask,
        links: Iterable[str],
        stats: SwarmStats,
    ) -> None:
        if task.depth >= self.config.max_depth or len(self.seen) >= self.config.limit:
            return
        seed_hosts = {urlparse(seed).netloc for seed in self.config.seeds}
        for raw_link in links:
            if len(self.seen) >= self.config.limit:
                return
            normalized = self._normalize(urljoin(str(task.url), raw_link))
            if not normalized or normalized in self.seen:
                continue
            if self.config.same_host_only and urlparse(normalized).netloc not in seed_hosts:
                continue
            self.seen.add(normalized)
            await queue.put(CrawlTask(url=normalized, depth=task.depth + 1, referrer=str(task.url)))
            stats.queued += 1

    async def _respect_host_delay(self, url: str) -> None:
        host = urlparse(url).netloc
        elapsed = time.monotonic() - self.last_host_fetch[host]
        delay = self.config.per_host_delay_seconds - elapsed
        if delay > 0:
            await asyncio.sleep(delay)
        self.last_host_fetch[host] = time.monotonic()

    def _normalize(self, url: str) -> str | None:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return None
        clean, _fragment = urldefrag(url)
        return clean.rstrip("/")

    def _run_id(self, seeds: list[str]) -> str:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        digest = hashlib.sha1("|".join(seeds).encode("utf-8")).hexdigest()[:8]
        return f"{stamp}-{digest}"

