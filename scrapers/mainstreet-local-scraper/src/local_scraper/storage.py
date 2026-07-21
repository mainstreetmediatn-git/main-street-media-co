from __future__ import annotations

import json
from pathlib import Path
from threading import Lock

from .models import PageResult


class JsonlRunStore:
    def __init__(self, run_dir: Path) -> None:
        self.run_dir = run_dir
        self.pages_path = run_dir / "pages.jsonl"
        self._lock = Lock()

    def open(self) -> None:
        self.run_dir.mkdir(parents=True, exist_ok=True)

    def write_page(self, result: PageResult) -> None:
        payload = result.model_dump(mode="json")
        with self._lock:
            with self.pages_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(payload, ensure_ascii=False) + "\n")

