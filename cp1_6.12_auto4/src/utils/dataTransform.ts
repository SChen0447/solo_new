import type { Task, Dependency } from '@/types';

export interface GanttRow {
  task: Task;
  level: number;
  children: GanttRow[];
}

export function buildGanttRows(tasks: Task[], dependencies: Dependency[]): GanttRow[] {
  const successorMap = new Map<string, string[]>();
  for (const dep of dependencies) {
    const list = successorMap.get(dep.predecessorId) || [];
    list.push(dep.successorId);
    successorMap.set(dep.predecessorId, list);
  }

  const isDependency = new Set<string>();
  for (const dep of dependencies) {
    isDependency.add(dep.successorId);
  }

  const roots = tasks.filter((t) => !isDependency.has(t.id));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();

  function buildNode(taskId: string, level: number): GanttRow | null {
    if (visited.has(taskId)) return null;
    visited.add(taskId);
    const task = taskMap.get(taskId);
    if (!task) return null;
    const childIds = successorMap.get(taskId) || [];
    const children = childIds
      .map((cid) => buildNode(cid, level + 1))
      .filter((n): n is GanttRow => n !== null);
    return { task, level, children };
  }

  return roots.map((r) => buildNode(r.id, 0)).filter((n): n is GanttRow => n !== null);
}

export function flattenGanttRows(rows: GanttRow[]): GanttRow[] {
  const result: GanttRow[] = [];
  function walk(row: GanttRow) {
    result.push(row);
    for (const child of row.children) {
      walk(child);
    }
  }
  for (const row of rows) walk(row);
  return result;
}

export function propagateDependencyChanges(
  taskId: string,
  newStartDate: string,
  tasks: Task[],
  dependencies: Dependency[]
): Task[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const successorMap = new Map<string, string[]>();
  for (const dep of dependencies) {
    const list = successorMap.get(dep.predecessorId) || [];
    list.push(dep.successorId);
    successorMap.set(dep.predecessorId, list);
  }

  const changed = new Map<string, Task>();

  function computeEndDate(task: Task, startDate: string): string {
    const start = new Date(startDate);
    const origStart = new Date(task.startDate);
    const origEnd = new Date(task.endDate);
    const duration = origEnd.getTime() - origStart.getTime();
    const newEnd = new Date(start.getTime() + duration);
    return newEnd.toISOString().split('T')[0];
  }

  function propagate(id: string, startDate: string) {
    const task = taskMap.get(id);
    if (!task) return;
    const newEndDate = computeEndDate(task, startDate);
    const updated = { ...task, startDate, endDate: newEndDate };
    changed.set(id, updated);
    taskMap.set(id, updated);

    const succIds = successorMap.get(id) || [];
    for (const succId of succIds) {
      const succTask = taskMap.get(succId);
      if (!succTask) continue;
      const minStart = newStartDate;
      if (new Date(succTask.startDate) < new Date(minStart)) {
        propagate(succId, minStart);
      }
    }
  }

  propagate(taskId, newStartDate);

  return tasks.map((t) => changed.get(t.id) || t);
}

export interface CriticalPathItem {
  taskId: string;
  taskName: string;
  duration: number;
}

export function computeCriticalPath(tasks: Task[], dependencies: Dependency[]): CriticalPathItem[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const predecessorMap = new Map<string, string[]>();
  for (const dep of dependencies) {
    const list = predecessorMap.get(dep.successorId) || [];
    list.push(dep.predecessorId);
    predecessorMap.set(dep.successorId, list);
  }

  const earliestFinish = new Map<string, number>();

  function getEarliestFinish(taskId: string): number {
    if (earliestFinish.has(taskId)) return earliestFinish.get(taskId)!;
    const task = taskMap.get(taskId);
    if (!task) return 0;
    const duration = (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24);
    const preds = predecessorMap.get(taskId) || [];
    let maxPredFinish = 0;
    for (const predId of preds) {
      maxPredFinish = Math.max(maxPredFinish, getEarliestFinish(predId));
    }
    const ef = maxPredFinish + duration;
    earliestFinish.set(taskId, ef);
    return ef;
  }

  for (const task of tasks) {
    getEarliestFinish(task.id);
  }

  let maxFinish = 0;
  let endTaskId = '';
  for (const [id, ef] of earliestFinish) {
    if (ef > maxFinish) {
      maxFinish = ef;
      endTaskId = id;
    }
  }

  const path: CriticalPathItem[] = [];
  let currentId = endTaskId;
  while (currentId) {
    const task = taskMap.get(currentId);
    if (!task) break;
    const duration = (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24);
    path.unshift({ taskId: task.id, taskName: task.name, duration });
    const preds = predecessorMap.get(currentId) || [];
    if (preds.length === 0) break;
    let latestPred = preds[0];
    let latestFinish = earliestFinish.get(preds[0]) || 0;
    for (let i = 1; i < preds.length; i++) {
      const pf = earliestFinish.get(preds[i]) || 0;
      if (pf > latestFinish) {
        latestFinish = pf;
        latestPred = preds[i];
      }
    }
    currentId = latestPred;
  }

  return path;
}

export function getTaskDurationDays(task: Task): number {
  return Math.max(1, Math.round((new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)));
}

export function getDateRange(tasks: Task[]): { start: string; end: string } {
  if (tasks.length === 0) {
    const now = new Date().toISOString().split('T')[0];
    return { start: now, end: now };
  }
  const start = tasks.reduce((min, t) => (t.startDate < min ? t.startDate : min), tasks[0].startDate);
  const end = tasks.reduce((max, t) => (t.endDate > max ? t.endDate : max), tasks[0].endDate);
  return { start, end };
}
