from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from .config import load_settings
from .firecrawl_toolbelt import FirecrawlToolbelt
from .swarm import CrawlSwarm, SwarmConfig


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="local-scraper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    swarm = subparsers.add_parser("swarm", help="Run the local crawling swarm.")
    swarm.add_argument("seeds", nargs="+")
    swarm.add_argument("--limit", type=int, default=100)
    swarm.add_argument("--max-depth", type=int, default=2)
    swarm.add_argument("--concurrency", type=int)
    swarm.add_argument("--output-dir", type=Path)
    swarm.add_argument("--allow-offsite", action="store_true")

    search = subparsers.add_parser("search", help="Search with Firecrawl and print URL results.")
    search.add_argument("query")
    search.add_argument("--limit", type=int, default=5)

    crawl = subparsers.add_parser("firecrawl-crawl", help="Delegate a crawl to Firecrawl.")
    crawl.add_argument("url")
    crawl.add_argument("--limit", type=int, default=50)

    mapper = subparsers.add_parser("map", help="Ask Firecrawl to map URLs for a site.")
    mapper.add_argument("url")
    mapper.add_argument("--limit", type=int, default=100)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    settings = load_settings()
    toolbelt = FirecrawlToolbelt.from_api_key(settings.firecrawl_api_key)

    if args.command == "swarm":
        config = SwarmConfig(
            seeds=args.seeds,
            output_dir=args.output_dir or settings.output_dir,
            limit=args.limit,
            max_depth=args.max_depth,
            concurrency=args.concurrency or settings.concurrency,
            same_host_only=not args.allow_offsite,
            per_host_delay_seconds=settings.per_host_delay_seconds,
        )
        stats = asyncio.run(CrawlSwarm(toolbelt, config).run())
        _print_json(stats.__dict__)
        return 0

    if args.command == "search":
        results = asyncio.run(toolbelt.search(args.query, limit=args.limit))
        _print_json(results)
        return 0

    if args.command == "firecrawl-crawl":
        result = asyncio.run(toolbelt.crawl(args.url, limit=args.limit))
        _print_json(result)
        return 0

    if args.command == "map":
        results = asyncio.run(toolbelt.map(args.url, limit=args.limit))
        _print_json(results)
        return 0

    raise AssertionError(f"Unhandled command: {args.command}")


def _print_json(value: Any) -> None:
    print(json.dumps(value, indent=2, ensure_ascii=False, default=str))


if __name__ == "__main__":
    raise SystemExit(main())

