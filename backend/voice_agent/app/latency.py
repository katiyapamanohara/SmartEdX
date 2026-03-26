"""Lightweight latency tracker for the Articom Voice Agent Service.

Collects timing samples across transports and API calls.
Thread-safe via simple append-only lists. Keeps the last N samples
per metric to bound memory usage.
"""

import time
from collections import deque
from contextlib import contextmanager
from dataclasses import dataclass, field
from threading import Lock

MAX_SAMPLES = 200


@dataclass
class LatencySample:
    value_ms: float
    session_id: str = ""
    timestamp: float = field(default_factory=time.time)


class LatencyTracker:
    """Singleton-ish tracker that collects latency samples by metric name."""

    def __init__(self):
        self._data: dict[str, deque[LatencySample]] = {}
        self._lock = Lock()

    def record(self, metric: str, duration_ms: float, session_id: str = "") -> None:
        with self._lock:
            if metric not in self._data:
                self._data[metric] = deque(maxlen=MAX_SAMPLES)
            self._data[metric].append(LatencySample(value_ms=duration_ms, session_id=session_id))

    @contextmanager
    def measure(self, metric: str, session_id: str = ""):
        """Context manager that records elapsed time in milliseconds."""
        start = time.monotonic()
        yield
        elapsed_ms = (time.monotonic() - start) * 1000
        self.record(metric, elapsed_ms, session_id)

    def start_timer(self) -> float:
        """Return a monotonic start time for manual timing."""
        return time.monotonic()

    def stop_timer(self, metric: str, start: float, session_id: str = "") -> float:
        """Record elapsed ms since start. Returns the elapsed value."""
        elapsed_ms = (time.monotonic() - start) * 1000
        self.record(metric, elapsed_ms, session_id)
        return elapsed_ms

    def summary(self) -> dict:
        """Return a summary of all metrics with last/avg/min/max/count."""
        with self._lock:
            result = {}
            for name, samples in self._data.items():
                if not samples:
                    continue
                values = [s.value_ms for s in samples]
                result[name] = {
                    "last": round(values[-1], 1),
                    "avg": round(sum(values) / len(values), 1),
                    "min": round(min(values), 1),
                    "max": round(max(values), 1),
                    "count": len(values),
                }
            return result

    def recent(self, metric: str, n: int = 20) -> list[dict]:
        """Return the N most recent samples for a given metric."""
        with self._lock:
            samples = self._data.get(metric, deque())
            return [
                {"ms": round(s.value_ms, 1), "session": s.session_id, "ts": s.timestamp} for s in list(samples)[-n:]
            ]


# Module-level singleton
latency = LatencyTracker()
