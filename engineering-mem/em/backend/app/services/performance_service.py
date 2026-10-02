"""
Measured performance telemetry for the diagnosis workflow (brief Part 9 / Part 10).

Every number surfaced here comes from a stopwatch around real work in this
process. Nothing is estimated, smoothed or synthesised: a stage that did not run
records ``None`` (rendered as "—") rather than a plausible-looking zero.

Storage
-------
Records are appended as JSON lines to ``data/performance_log.jsonl`` so the
Performance page keeps its history across a backend restart — a demo that shows
"average diagnosis time" would otherwise always start from an empty table. The
file is trimmed in place once it exceeds ``MAX_RECORDS`` so it cannot grow
without bound on a machine that runs all day.
"""

import json
import os
import threading
import time
from typing import Any, Dict, List, Optional

from backend.app.core import config

LOG_PATH = os.path.join(config.DATA_DIR, "performance_log.jsonl")
# Enough history for a demo (and a whole judging session) without an unbounded file.
MAX_RECORDS = 500
# Rolling window used for the summary tiles.
SUMMARY_WINDOW = 200

# Part 10 status bands, applied to the measured average total diagnosis time.
TARGET_SECONDS = 30.0
IDEAL_SECONDS = 15.0
AMBER_SECONDS = 60.0

_STAGE_KEYS = [
    "query_parsing_ms",
    "embedding_ms",
    "faiss_ms",
    "machine_lookup_ms",
    "sensor_analysis_ms",
    "evidence_fusion_ms",
    "candidate_ranking_ms",
    "llm_ms",
    "audit_ms",
    "retrieval_total_ms",
    "total_ms",
]

_lock = threading.Lock()


def _percentile(sorted_values: List[float], fraction: float) -> Optional[float]:
    if not sorted_values:
        return None
    index = min(len(sorted_values) - 1, max(0, int(round(fraction * (len(sorted_values) - 1)))))
    return round(sorted_values[index], 2)


def _mean(values: List[float]) -> Optional[float]:
    if not values:
        return None
    return round(sum(values) / len(values), 2)


class PerformanceService:
    """Append-only store of measured diagnosis runs plus derived aggregates."""

    def __init__(self, path: str = LOG_PATH):
        self.path = path
        self.started_at = time.time()
        # Fast path for the current process; the file remains the durable record.
        self._recent: List[Dict[str, Any]] = []
        self._records_written = 0
        self._cache_hits = 0
        self._cache_misses = 0
        self._llm_runs = 0
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
        except Exception as error:  # pragma: no cover - defensive
            print(f"[Performance] Cannot create log directory: {error}")

    # -- writing --------------------------------------------------------------
    def record(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        """Store one measured run. The entry is returned with its record id."""
        record = dict(entry)
        record.setdefault("recorded_at", time.time())
        record["record_id"] = f"RUN-{int(record['recorded_at'] * 1000) % 10_000_000:07d}"

        with _lock:
            self._recent.append(record)
            if len(self._recent) > MAX_RECORDS:
                self._recent = self._recent[-MAX_RECORDS:]
            if record.get("cache_hit"):
                self._cache_hits += 1
            else:
                self._cache_misses += 1
            if (record.get("timings") or {}).get("llm_ms"):
                self._llm_runs += 1
            self._records_written += 1
            self._append_line(record)
        return record

    def _append_line(self, record: Dict[str, Any]) -> None:
        try:
            with open(self.path, "a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, default=str) + "\n")
            # Trim occasionally rather than on every write.
            if self._records_written % 25 == 0:
                self._trim()
        except Exception as error:  # pragma: no cover - defensive
            print(f"[Performance] Could not append record: {error}")

    def _trim(self) -> None:
        try:
            with open(self.path, "r", encoding="utf-8") as handle:
                lines = handle.readlines()
            if len(lines) <= MAX_RECORDS:
                return
            with open(self.path, "w", encoding="utf-8") as handle:
                handle.writelines(lines[-MAX_RECORDS:])
        except Exception:
            pass

    # -- reading --------------------------------------------------------------
    def history(self, limit: int = SUMMARY_WINDOW) -> List[Dict[str, Any]]:
        """Most recent runs, newest first. File-backed, so it survives restarts."""
        records: List[Dict[str, Any]] = []
        try:
            if os.path.exists(self.path):
                with open(self.path, "r", encoding="utf-8") as handle:
                    for line in handle:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            records.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue  # a torn final line must not break the page
        except Exception as error:  # pragma: no cover - defensive
            print(f"[Performance] Could not read history: {error}")
            records = list(self._recent)

        if not records:
            records = list(self._recent)
        records.sort(key=lambda item: item.get("recorded_at") or 0, reverse=True)
        return records[:limit]

    def latest(self) -> Optional[Dict[str, Any]]:
        history = self.history(limit=1)
        return history[0] if history else None

    def summary(self, window: int = SUMMARY_WINDOW) -> Dict[str, Any]:
        """Aggregates over the measured window, plus the Part 10 status band."""
        history = self.history(limit=window)
        total = len(history)

        stage_stats: Dict[str, Any] = {}
        for key in _STAGE_KEYS:
            values = [
                float((record.get("timings") or {}).get(key))
                for record in history
                if (record.get("timings") or {}).get(key) is not None
            ]
            ordered = sorted(values)
            stage_stats[key] = {
                "samples": len(values),
                "avg_ms": _mean(values),
                "p50_ms": _percentile(ordered, 0.50),
                "p95_ms": _percentile(ordered, 0.95),
                "max_ms": round(ordered[-1], 2) if ordered else None,
            }

        totals = sorted(
            float(record["total_ms"]) for record in history if record.get("total_ms") is not None
        )
        avg_total = _mean(totals)
        cache_hits = sum(1 for record in history if record.get("cache_hit"))
        llm_runs = sum(1 for record in history if (record.get("timings") or {}).get("llm_ms"))

        status = "no_data"
        if avg_total is not None:
            if avg_total <= TARGET_SECONDS * 1000:
                status = "green"
            elif avg_total <= AMBER_SECONDS * 1000:
                status = "amber"
            else:
                status = "red"

        llm_values = [
            float((record.get("timings") or {}).get("llm_ms"))
            for record in history
            if (record.get("timings") or {}).get("llm_ms") is not None
        ]

        return {
            "window": window,
            "records_in_window": total,
            "records_total_in_process": self._records_written,
            "uptime_seconds": round(time.time() - self.started_at, 1),
            "average_total_ms": avg_total,
            "p50_total_ms": _percentile(totals, 0.50),
            "p95_total_ms": _percentile(totals, 0.95),
            "fastest_total_ms": round(totals[0], 2) if totals else None,
            "slowest_total_ms": round(totals[-1], 2) if totals else None,
            "cache_hit_rate": round(cache_hits / total, 3) if total else None,
            "cache_hits": cache_hits,
            "cache_misses": total - cache_hits,
            "ai_explanation_runs": llm_runs,
            "average_ai_explanation_ms": _mean(llm_values),
            "stages": stage_stats,
            "targets": {
                "target_seconds": TARGET_SECONDS,
                "ideal_seconds": IDEAL_SECONDS,
                "amber_seconds": AMBER_SECONDS,
                "measured_average_seconds": round(avg_total / 1000, 2) if avg_total is not None else None,
                "status": status,
                "status_basis": (
                    "Measured average total diagnosis time over the recorded window. "
                    "GREEN <= 30 s, AMBER 30-60 s, RED > 60 s."
                ),
            },
            "basis": (
                "Every figure is a stopwatch around real work in the backend process: BGE query "
                "embedding, FAISS search, sensor classification, evidence fusion, candidate ranking, "
                "optional local-LLM explanation and the audit write. Cached responses report their own "
                "serve time and are counted in the cache-hit rate."
            ),
        }


performance_service = PerformanceService()
