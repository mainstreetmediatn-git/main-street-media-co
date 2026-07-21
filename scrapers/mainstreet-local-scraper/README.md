# mainstreet local scraper

`local scraper` is a small crawling swarm that gives worker agents a Firecrawl toolbelt:

- `scrape`: capture one URL as markdown/html/json
- `crawl`: delegate a bounded site crawl to Firecrawl
- `search`: discover seed URLs
- `map`: discover site URLs when the installed Firecrawl SDK supports it

The swarm runs locally, coordinates URL work with an async queue, respects per-host delays, and writes results as JSONL so long crawls can be streamed into other tools.

## Setup

```bash
cd /home/kalikali/main-street-media-co/scrapers/mainstreet-local-scraper
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
```

Set `FIRECRAWL_API_KEY` in `.env` or your shell.

## Usage

Scrape a few seed URLs with four local workers:

```bash
mainstreet-scraper swarm https://example.com https://docs.firecrawl.dev --limit 25 --concurrency 4
```

Discover URLs from web search first:

```bash
mainstreet-scraper search "site:docs.firecrawl.dev crawl endpoint" --limit 5
```

Ask Firecrawl to run a server-side crawl:

```bash
mainstreet-scraper firecrawl-crawl https://docs.firecrawl.dev --limit 20
```

Output is written under `data/mainstreet-runs/<run-id>/pages.jsonl`.

## Development

```bash
ruff check .
pytest
```
