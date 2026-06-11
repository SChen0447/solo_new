import asyncio
import time
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TaskCreate(BaseModel):
    name: str
    startDate: str
    endDate: str
    estimatedHours: float
    actualHours: float = 0
    assignee: str
    colorTag: str
    dependencies: list[str] = []


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    estimatedHours: Optional[float] = None
    actualHours: Optional[float] = None
    assignee: Optional[str] = None
    colorTag: Optional[str] = None
    dependencies: Optional[list[str]] = None
    progress: Optional[float] = None


class TaskOut(BaseModel):
    id: str
    name: str
    startDate: str
    endDate: str
    estimatedHours: float
    actualHours: float
    assignee: str
    colorTag: str
    dependencies: list[str]
    progress: float


class DependencyCreate(BaseModel):
    predecessorId: str
    successorId: str
    type: str = "FS"


class DependencyOut(BaseModel):
    id: str
    predecessorId: str
    successorId: str
    type: str


class TimeEntryIn(BaseModel):
    taskId: str
    date: str
    hours: float
    assignee: str


class TimeEntryOut(BaseModel):
    id: str
    taskId: str
    date: str
    hours: float
    assignee: str


class BatchDebounceResponse(BaseModel):
    entries: list[TimeEntryOut]
    debounced: bool
    skippedCount: int
    message: str


class DailySummaryOut(BaseModel):
    date: str
    totalHours: float
    byAssignee: dict[str, float]


class ComparisonItemOut(BaseModel):
    taskId: str
    taskName: str
    estimated: float
    actual: float


class CumulativePointOut(BaseModel):
    date: str
    cumulativeHours: float


tasks_db: dict[str, dict] = {
    "task-1": {
        "id": "task-1", "name": "需求分析", "startDate": "2026-06-01", "endDate": "2026-06-05",
        "estimatedHours": 40, "actualHours": 36, "assignee": "张三", "colorTag": "#3498DB",
        "dependencies": [], "progress": 90,
    },
    "task-2": {
        "id": "task-2", "name": "架构设计", "startDate": "2026-06-05", "endDate": "2026-06-10",
        "estimatedHours": 32, "actualHours": 20, "assignee": "李四", "colorTag": "#E67E22",
        "dependencies": ["task-1"], "progress": 60,
    },
    "task-3": {
        "id": "task-3", "name": "前端开发", "startDate": "2026-06-10", "endDate": "2026-06-20",
        "estimatedHours": 80, "actualHours": 0, "assignee": "王五", "colorTag": "#2ECC71",
        "dependencies": ["task-2"], "progress": 0,
    },
    "task-4": {
        "id": "task-4", "name": "后端开发", "startDate": "2026-06-10", "endDate": "2026-06-18",
        "estimatedHours": 64, "actualHours": 8, "assignee": "张三", "colorTag": "#9B59B6",
        "dependencies": ["task-2"], "progress": 12,
    },
    "task-5": {
        "id": "task-5", "name": "集成测试", "startDate": "2026-06-20", "endDate": "2026-06-25",
        "estimatedHours": 40, "actualHours": 0, "assignee": "李四", "colorTag": "#E74C3C",
        "dependencies": ["task-3", "task-4"], "progress": 0,
    },
}

deps_db: dict[str, dict] = {
    "dep-1": {"id": "dep-1", "predecessorId": "task-1", "successorId": "task-2", "type": "FS"},
    "dep-2": {"id": "dep-2", "predecessorId": "task-2", "successorId": "task-3", "type": "FS"},
    "dep-3": {"id": "dep-3", "predecessorId": "task-2", "successorId": "task-4", "type": "FS"},
    "dep-4": {"id": "dep-4", "predecessorId": "task-3", "successorId": "task-5", "type": "FS"},
    "dep-5": {"id": "dep-5", "predecessorId": "task-4", "successorId": "task-5", "type": "FS"},
}

time_entries_db: dict[str, dict] = {
    "te-1": {"id": "te-1", "taskId": "task-1", "date": "2026-06-01", "hours": 8, "assignee": "张三"},
    "te-2": {"id": "te-2", "taskId": "task-1", "date": "2026-06-02", "hours": 8, "assignee": "张三"},
    "te-3": {"id": "te-3", "taskId": "task-1", "date": "2026-06-03", "hours": 8, "assignee": "张三"},
    "te-4": {"id": "te-4", "taskId": "task-1", "date": "2026-06-04", "hours": 8, "assignee": "张三"},
    "te-5": {"id": "te-5", "taskId": "task-1", "date": "2026-06-05", "hours": 4, "assignee": "张三"},
    "te-6": {"id": "te-6", "taskId": "task-2", "date": "2026-06-05", "hours": 4, "assignee": "李四"},
    "te-7": {"id": "te-7", "taskId": "task-2", "date": "2026-06-06", "hours": 8, "assignee": "李四"},
    "te-8": {"id": "te-8", "taskId": "task-2", "date": "2026-06-07", "hours": 8, "assignee": "李四"},
    "te-9": {"id": "te-9", "taskId": "task-4", "date": "2026-06-10", "hours": 8, "assignee": "张三"},
}

DEBOUNCE_WINDOW = 0.3


class DebouncedBatcher:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._pending: dict[str, list[TimeEntryIn]] = {}
        self._timers: dict[str, asyncio.TimerHandle] = {}

    def _get_key(self, entry: TimeEntryIn) -> str:
        return f"{entry.assignee}:{entry.date}:{entry.taskId}"

    async def add_and_process(self, entries: list[TimeEntryIn]) -> tuple[list[dict], int]:
        async with self._lock:
            created: list[dict] = []
            skipped_count = 0
            keys_to_process: set[str] = set()

            for entry in entries:
                key = self._get_key(entry)
                if key not in self._pending:
                    self._pending[key] = []
                self._pending[key].append(entry)
                keys_to_process.add(key)

                if key in self._timers:
                    self._timers[key].cancel()

                loop = asyncio.get_event_loop()
                self._timers[key] = loop.call_later(
                    DEBOUNCE_WINDOW,
                    lambda k=key: asyncio.create_task(self._process_key(k))
                )

            await asyncio.sleep(DEBOUNCE_WINDOW + 0.01)

            for key in keys_to_process:
                if key in self._pending:
                    pending_entries = self._pending[key]
                    if len(pending_entries) == 0:
                        continue
                    latest = pending_entries[-1]
                    skipped_count += len(pending_entries) - 1

                    if latest.taskId not in tasks_db:
                        raise HTTPException(status_code=400, detail=f"Task {latest.taskId} not found")

                    te_id = f"te-{uuid.uuid4().hex[:8]}"
                    te = {
                        "id": te_id,
                        "taskId": latest.taskId,
                        "date": latest.date,
                        "hours": latest.hours,
                        "assignee": latest.assignee,
                    }
                    time_entries_db[te_id] = te
                    created.append(te)
                    _recalc_progress(latest.taskId)

                    del self._pending[key]
                    if key in self._timers:
                        self._timers[key].cancel()
                        del self._timers[key]

            return created, skipped_count

    async def _process_key(self, key: str):
        async with self._lock:
            if key not in self._pending:
                return
            pending_entries = self._pending[key]
            if len(pending_entries) == 0:
                del self._pending[key]
                return
            latest = pending_entries[-1]

            if latest.taskId in tasks_db:
                te_id = f"te-{uuid.uuid4().hex[:8]}"
                te = {
                    "id": te_id,
                    "taskId": latest.taskId,
                    "date": latest.date,
                    "hours": latest.hours,
                    "assignee": latest.assignee,
                }
                time_entries_db[te_id] = te
                _recalc_progress(latest.taskId)

            del self._pending[key]
            if key in self._timers:
                del self._timers[key]


_batcher = DebouncedBatcher()


def _recalc_progress(task_id: str) -> None:
    task = tasks_db.get(task_id)
    if not task:
        return
    total_hours = sum(
        te["hours"] for te in time_entries_db.values() if te["taskId"] == task_id
    )
    task["actualHours"] = total_hours
    if task["estimatedHours"] > 0:
        task["progress"] = min(round(total_hours / task["estimatedHours"] * 100, 1), 100)
    else:
        task["progress"] = 0


@app.get("/api/tasks", response_model=list[TaskOut])
def list_tasks():
    return list(tasks_db.values())


@app.post("/api/tasks", response_model=TaskOut, status_code=201)
def create_task(body: TaskCreate):
    task_id = f"task-{uuid.uuid4().hex[:8]}"
    task = body.model_dump()
    task["id"] = task_id
    if task["estimatedHours"] > 0:
        task["progress"] = min(round(task["actualHours"] / task["estimatedHours"] * 100, 1), 100)
    else:
        task["progress"] = 0
    tasks_db[task_id] = task
    return task


@app.put("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: str, body: TaskUpdate):
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    task = tasks_db[task_id]
    update_data = body.model_dump(exclude_unset=True)
    task.update(update_data)
    _recalc_progress(task_id)
    return task


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str):
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    del tasks_db[task_id]
    dep_ids_to_remove = [
        dep_id for dep_id, dep in deps_db.items()
        if dep["predecessorId"] == task_id or dep["successorId"] == task_id
    ]
    for dep_id in dep_ids_to_remove:
        del deps_db[dep_id]
    te_ids_to_remove = [
        te_id for te_id, te in time_entries_db.items()
        if te["taskId"] == task_id
    ]
    for te_id in te_ids_to_remove:
        del time_entries_db[te_id]
    for t in tasks_db.values():
        if task_id in t.get("dependencies", []):
            t["dependencies"].remove(task_id)
    return {"ok": True}


@app.get("/api/dependencies", response_model=list[DependencyOut])
def list_dependencies():
    return list(deps_db.values())


@app.post("/api/dependencies", response_model=DependencyOut, status_code=201)
def create_dependency(body: DependencyCreate):
    if body.predecessorId not in tasks_db:
        raise HTTPException(status_code=400, detail="Predecessor task not found")
    if body.successorId not in tasks_db:
        raise HTTPException(status_code=400, detail="Successor task not found")
    dep_id = f"dep-{uuid.uuid4().hex[:8]}"
    dep = {"id": dep_id, "predecessorId": body.predecessorId, "successorId": body.successorId, "type": body.type}
    deps_db[dep_id] = dep
    successor = tasks_db.get(body.successorId)
    if successor and body.predecessorId not in successor.get("dependencies", []):
        successor.setdefault("dependencies", []).append(body.predecessorId)
    return dep


@app.delete("/api/dependencies/{dep_id}")
def delete_dependency(dep_id: str):
    if dep_id not in deps_db:
        raise HTTPException(status_code=404, detail="Dependency not found")
    dep = deps_db[dep_id]
    successor = tasks_db.get(dep["successorId"])
    if successor and dep["predecessorId"] in successor.get("dependencies", []):
        successor["dependencies"].remove(dep["predecessorId"])
    del deps_db[dep_id]
    return {"ok": True}


@app.post("/api/time-entries/batch", response_model=BatchDebounceResponse)
async def batch_create_time_entries(entries: list[TimeEntryIn]):
    for entry in entries:
        if entry.taskId not in tasks_db:
            raise HTTPException(status_code=400, detail=f"Task {entry.taskId} not found")

    created, skipped_count = await _batcher.add_and_process(entries)
    was_debounced = skipped_count > 0

    message = f"Created {len(created)} time entries"
    if was_debounced:
        message += f", skipped {skipped_count} duplicate(s) via debounce"

    return BatchDebounceResponse(
        entries=created,
        debounced=was_debounced,
        skippedCount=skipped_count,
        message=message,
    )


@app.get("/api/time-entries", response_model=list[TimeEntryOut])
def query_time_entries(taskId: Optional[str] = Query(None), date: Optional[str] = Query(None)):
    results = list(time_entries_db.values())
    if taskId:
        results = [te for te in results if te["taskId"] == taskId]
    if date:
        results = [te for te in results if te["date"] == date]
    return results


@app.get("/api/stats/distribution", response_model=list[DailySummaryOut])
def stats_distribution():
    daily: dict[str, dict[str, float]] = {}
    for te in time_entries_db.values():
        if te["date"] not in daily:
            daily[te["date"]] = {}
        daily[te["date"]][te["assignee"]] = daily[te["date"]].get(te["assignee"], 0) + te["hours"]
    result = []
    for date in sorted(daily.keys()):
        by_assignee = daily[date]
        result.append({
            "date": date,
            "totalHours": sum(by_assignee.values()),
            "byAssignee": by_assignee,
        })
    return result


@app.get("/api/stats/comparison", response_model=list[ComparisonItemOut])
def stats_comparison():
    result = []
    for task in tasks_db.values():
        result.append({
            "taskId": task["id"],
            "taskName": task["name"],
            "estimated": task["estimatedHours"],
            "actual": task["actualHours"],
        })
    return result


@app.get("/api/stats/cumulative", response_model=list[CumulativePointOut])
def stats_cumulative():
    daily_totals: dict[str, float] = {}
    for te in time_entries_db.values():
        daily_totals[te["date"]] = daily_totals.get(te["date"], 0) + te["hours"]
    result: list[dict] = []
    cumulative = 0.0
    for date in sorted(daily_totals.keys()):
        cumulative += daily_totals[date]
        result.append({"date": date, "cumulativeHours": round(cumulative, 1)})
    return result
