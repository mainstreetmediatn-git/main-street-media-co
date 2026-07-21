from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Protocol


class FirecrawlLike(Protocol):
    def scrape(self, url: str, **kwargs: Any) -> Any: ...

    def crawl(self, url: str, **kwargs: Any) -> Any: ...

    def search(self, query: str, **kwargs: Any) -> Any: ...


@dataclass
class FirecrawlToolbelt:
    """Async-friendly wrapper around the synchronous Firecrawl Python SDK."""

    client: FirecrawlLike

    @classmethod
    def from_api_key(cls, api_key: str | None = None) -> "FirecrawlToolbelt":
        from firecrawl import Firecrawl

        return cls(Firecrawl(api_key=api_key) if api_key else Firecrawl())

    async def scrape(self, url: str, formats: list[str] | None = None) -> dict[str, Any]:
        return await asyncio.to_thread(
            self._scrape_sync,
            url,
            formats or ["markdown", "html", "links"],
        )

    async def crawl(self, url: str, limit: int = 50) -> dict[str, Any]:
        return await asyncio.to_thread(self._as_dict, self.client.crawl(url, limit=limit))

    async def search(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        response = await asyncio.to_thread(self.client.search, query, limit=limit)
        payload = self._as_dict(response)
        web = payload.get("web", payload.get("data", payload.get("results", [])))
        return [self._as_dict(item) for item in web]

    async def map(self, url: str, limit: int = 100) -> list[str]:
        mapper = getattr(self.client, "map", None)
        if mapper is None:
            return []
        response = await asyncio.to_thread(mapper, url, limit=limit)
        payload = self._as_dict(response)
        links = payload.get("links", payload.get("urls", payload.get("data", [])))
        return [str(link) for link in links]

    def _scrape_sync(self, url: str, formats: list[str]) -> dict[str, Any]:
        response = self.client.scrape(url, formats=formats)
        payload = self._as_dict(response)
        metadata = self._as_dict(payload.get("metadata", {}))
        links = payload.get("links") or metadata.get("links") or []
        return {
            "url": metadata.get("sourceURL") or metadata.get("source_url") or url,
            "title": metadata.get("title"),
            "markdown": payload.get("markdown"),
            "html": payload.get("html"),
            "links": [str(link) for link in links],
            "metadata": metadata,
        }

    def _as_dict(self, value: Any) -> dict[str, Any]:
        if value is None:
            return {}
        if isinstance(value, dict):
            return value
        if hasattr(value, "model_dump"):
            return value.model_dump()
        if hasattr(value, "dict"):
            return value.dict()
        if hasattr(value, "__dict__"):
            return vars(value)
        return {"value": value}
