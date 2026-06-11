export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  memberId: string;
  color: string;
  category: 'personal' | 'projectA' | 'projectB' | 'busy';
}

export interface TeamSchedule {
  members: TeamMember[];
  events: ScheduleEvent[];
}

const teamMembers: TeamMember[] = [
  { id: 'm1', name: '张伟', avatar: '张', color: '#3b82f6' },
  { id: 'm2', name: '李娜', avatar: '李', color: '#8b5cf6' },
  { id: 'm3', name: '王强', avatar: '王', color: '#10b981' },
  { id: 'm4', name: '刘芳', avatar: '刘', color: '#f59e0b' },
];

const categoryColors: Record<string, string> = {
  personal: '#94a3b8',
  projectA: '#3b82f6',
  projectB: '#8b5cf6',
  busy: '#ef4444',
};

function generateRandomEvents(member: TeamMember, startDate: Date): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  const numEvents = Math.floor(Math.random() * 7) + 6;
  const categories: ('personal' | 'projectA' | 'projectB')[] = ['personal', 'projectA', 'projectB'];
  const eventTitles = [
    '需求评审', '代码审查', '站会', '设计讨论', '客户会议',
    '技术分享', '产品规划', '迭代回顾', '一对一沟通', '培训学习',
    '午餐会议', '项目同步', 'Bug修复', '性能优化', '架构设计'
  ];

  for (let i = 0; i < numEvents; i++) {
    const dayOffset = Math.floor(Math.random() * 7);
    const startHour = Math.floor(Math.random() * 10) + 8;
    const duration = Math.floor(Math.random() * 3) + 1;
    const category = categories[Math.floor(Math.random() * categories.length)];
    const title = eventTitles[Math.floor(Math.random() * eventTitles.length)];

    const startTime = new Date(startDate);
    startTime.setDate(startTime.getDate() + dayOffset);
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(startHour + duration, 0, 0, 0);

    events.push({
      id: `${member.id}-event-${i}`,
      title,
      startTime,
      endTime,
      memberId: member.id,
      color: categoryColors[category],
      category,
    });
  }

  return events;
}

let mockDataCache: TeamSchedule | null = null;

export function getTeamSchedule(): TeamSchedule {
  if (mockDataCache) {
    return mockDataCache;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allEvents: ScheduleEvent[] = [];
  teamMembers.forEach(member => {
    const events = generateRandomEvents(member, today);
    allEvents.push(...events);
  });

  mockDataCache = {
    members: teamMembers,
    events: allEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
  };

  return mockDataCache;
}

export function checkConflicts(events: ScheduleEvent[], startTime: Date, endTime: Date): ScheduleEvent[] {
  return events.filter(event => {
    return event.startTime < endTime && event.endTime > startTime;
  });
}

export function getBusyCountByHour(events: ScheduleEvent[], date: Date, hour: number): number {
  const slotStart = new Date(date);
  slotStart.setHours(hour, 0, 0, 0);
  const slotEnd = new Date(date);
  slotEnd.setHours(hour + 1, 0, 0, 0);

  const conflictingEvents = checkConflicts(events, slotStart, slotEnd);
  const memberIds = new Set(conflictingEvents.map(e => e.memberId));
  return memberIds.size;
}

export function addBusyEvent(startTime: Date, endTime: Date, memberId: string): ScheduleEvent {
  return {
    id: `busy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: '忙碌',
    startTime,
    endTime,
    memberId,
    color: categoryColors.busy,
    category: 'busy',
  };
}
