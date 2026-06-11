export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  priority: Priority;
  startDate: string;
  endDate: string;
  dependencies: string[];
  description?: string;
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

const assignees = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
const priorities: Priority[] = ['low', 'medium', 'high'];
const statuses: TaskStatus[] = ['todo', 'in-progress', 'done'];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const sprint: Sprint = {
  id: 'sprint-1',
  name: 'Sprint 2026-06',
  startDate: '2026-06-01',
  endDate: '2026-06-30'
};

function generateTask(id: number, baseDate: Date, statusIndex: number): Task {
  const startDay = Math.floor(Math.random() * 20);
  const duration = Math.floor(Math.random() * 5) + 1;
  const startDate = addDays(baseDate, startDay);
  const endDate = addDays(startDate, duration);
  const deps: string[] = [];
  
  if (id > 1 && Math.random() > 0.5) {
    const depCount = Math.min(Math.floor(Math.random() * 2) + 1, id - 1);
    for (let i = 0; i < depCount; i++) {
      const depId = Math.floor(Math.random() * id) + 1;
      if (!deps.includes(`task-${depId}`)) {
        deps.push(`task-${depId}`);
      }
    }
  }

  return {
    id: `task-${id}`,
    title: `任务 ${id} - ${getRandomTitle()}`,
    assignee: assignees[id % assignees.length],
    status: statuses[statusIndex % 3],
    priority: priorities[id % 3],
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    dependencies: deps,
    description: `这是任务 ${id} 的详细描述，包含任务目标、验收标准和相关资源链接。`
  };
}

function getRandomTitle(): string {
  const titles = [
    '用户登录模块开发',
    '数据可视化图表',
    'API接口对接',
    '性能优化',
    '单元测试编写',
    'UI组件封装',
    '错误处理机制',
    '缓存策略实现',
    '权限管理系统',
    '消息推送功能',
    '文件上传下载',
    '搜索功能优化',
    '分页查询实现',
    '数据导出功能',
    '表单校验逻辑',
    '路由管理配置',
    '状态管理方案',
    '国际化支持',
    '主题切换功能',
    '移动端适配'
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

export function generateInitialTasks(count: number = 20): Task[] {
  const baseDate = new Date('2026-06-01');
  const tasks: Task[] = [];
  
  for (let i = 1; i <= count; i++) {
    const statusIndex = Math.floor(Math.random() * 3);
    tasks.push(generateTask(i, baseDate, statusIndex));
  }
  
  return tasks;
}

export const initialTasks = generateInitialTasks(20);

export function getTasksByStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter(task => task.status === status);
}

export function getTaskById(tasks: Task[], id: string): Task | undefined {
  return tasks.find(task => task.id === id);
}

export function hasDependencyConflict(task: Task, allTasks: Task[]): boolean {
  for (const depId of task.dependencies) {
    const depTask = allTasks.find(t => t.id === depId);
    if (depTask) {
      if (new Date(task.startDate) < new Date(depTask.endDate)) {
        return true;
      }
    }
  }
  return false;
}
