from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator

from .config import DB_PATH


def utcnow() -> str:
    return datetime.now(UTC).isoformat()


class Storage:
    def __init__(self, db_path: Path = DB_PATH) -> None:
        self.db_path = db_path
        self._ensure_schema()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _ensure_schema(self) -> None:
        with self.connect() as conn:
            conn.executescript(
                """
                create table if not exists runs (
                    id integer primary key autoincrement,
                    platform text not null,
                    query text not null,
                    region text not null,
                    max_results integer not null,
                    manual_wait_seconds integer not null,
                    status text not null,
                    created_at text not null,
                    completed_at text,
                    error_message text,
                    log_excerpt text default ''
                );

                create table if not exists results (
                    id integer primary key autoincrement,
                    run_id integer not null references runs(id) on delete cascade,
                    title text not null,
                    actor text not null,
                    url text not null,
                    summary text not null,
                    source_label text not null,
                    metadata_json text not null
                );
                """
            )

    def create_run(self, payload: dict[str, Any]) -> int:
        with self.connect() as conn:
            cursor = conn.execute(
                """
                insert into runs (platform, query, region, max_results, manual_wait_seconds, status, created_at)
                values (?, ?, ?, ?, ?, 'queued', ?)
                """,
                (
                    payload["platform"],
                    payload["query"],
                    payload["region"],
                    payload["max_results"],
                    payload["manual_wait_seconds"],
                    utcnow(),
                ),
            )
            return int(cursor.lastrowid)

    def mark_running(self, run_id: int) -> None:
        with self.connect() as conn:
            conn.execute("update runs set status = 'running' where id = ?", (run_id,))

    def complete_run(self, run_id: int, results: list[dict[str, Any]], log_excerpt: str) -> None:
        with self.connect() as conn:
            conn.execute("delete from results where run_id = ?", (run_id,))
            conn.executemany(
                """
                insert into results (run_id, title, actor, url, summary, source_label, metadata_json)
                values (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        run_id,
                        item["title"],
                        item["actor"],
                        item["url"],
                        item["summary"],
                        item["source_label"],
                        json.dumps(item["metadata"], ensure_ascii=False),
                    )
                    for item in results
                ],
            )
            conn.execute(
                """
                update runs
                set status = 'completed',
                    completed_at = ?,
                    error_message = null,
                    log_excerpt = ?
                where id = ?
                """,
                (utcnow(), log_excerpt, run_id),
            )

    def fail_run(self, run_id: int, error_message: str, log_excerpt: str) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                update runs
                set status = 'failed',
                    completed_at = ?,
                    error_message = ?,
                    log_excerpt = ?
                where id = ?
                """,
                (utcnow(), error_message, log_excerpt, run_id),
            )

    def list_runs(self) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute(
                """
                select
                    runs.*,
                    count(results.id) as result_count
                from runs
                left join results on results.run_id = runs.id
                group by runs.id
                order by runs.id desc
                """
            ).fetchall()
        return [self._serialize_run(row) for row in rows]

    def get_run(self, run_id: int) -> dict[str, Any] | None:
        with self.connect() as conn:
            run = conn.execute(
                """
                select
                    runs.*,
                    count(results.id) as result_count
                from runs
                left join results on results.run_id = runs.id
                where runs.id = ?
                group by runs.id
                """,
                (run_id,),
            ).fetchone()
            if run is None:
                return None
            results = conn.execute(
                "select * from results where run_id = ? order by id asc",
                (run_id,),
            ).fetchall()

        payload = self._serialize_run(run)
        payload["results"] = [
            {
                "id": int(row["id"]),
                "title": row["title"],
                "actor": row["actor"],
                "url": row["url"],
                "summary": row["summary"],
                "source_label": row["source_label"],
                "metadata": json.loads(row["metadata_json"]),
            }
            for row in results
        ]
        return payload

    def _serialize_run(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": int(row["id"]),
            "platform": row["platform"],
            "query": row["query"],
            "region": row["region"],
            "max_results": int(row["max_results"]),
            "manual_wait_seconds": int(row["manual_wait_seconds"]),
            "status": row["status"],
            "created_at": row["created_at"],
            "completed_at": row["completed_at"],
            "error_message": row["error_message"],
            "log_excerpt": row["log_excerpt"] or "",
            "result_count": int(row["result_count"] or 0),
        }
