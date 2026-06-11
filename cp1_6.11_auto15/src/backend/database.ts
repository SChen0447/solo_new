import { v4 as uuidv4 } from 'uuid';

export type ItemStatus = 'available' | 'borrowed';

export interface BorrowRecord {
  id: string;
  itemId: string;
  employeeId: string;
  employeeName: string;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  isOverdue: boolean;
}

export interface OfficeItem {
  id: string;
  name: string;
  code: string;
  department: string;
  status: ItemStatus;
  borrowCount: number;
}

let items: OfficeItem[] = [
  { id: 'item-1', name: '投影仪 A', code: 'PRJ-001', department: '行政部', status: 'available', borrowCount: 5 },
  { id: 'item-2', name: '笔记本电脑 X1', code: 'LAP-001', department: '技术部', status: 'available', borrowCount: 12 },
  { id: 'item-3', name: '会议麦克风', code: 'MIC-001', department: '市场部', status: 'borrowed', borrowCount: 8 },
  { id: 'item-4', name: '移动硬盘 1TB', code: 'HDD-001', department: '财务部', status: 'available', borrowCount: 3 },
  { id: 'item-5', name: '白板套装', code: 'WB-001', department: '产品部', status: 'available', borrowCount: 2 },
  { id: 'item-6', name: '摄像头 Logitech', code: 'CAM-001', department: '人力资源部', status: 'borrowed', borrowCount: 6 },
];

let borrowRecords: BorrowRecord[] = [
  {
    id: 'br-1',
    itemId: 'item-3',
    employeeId: 'E001',
    employeeName: '张三',
    borrowDate: '2026-06-01',
    expectedReturnDate: '2026-06-05',
    isOverdue: true,
  },
  {
    id: 'br-2',
    itemId: 'item-6',
    employeeId: 'E008',
    employeeName: '孙七',
    borrowDate: '2026-06-08',
    expectedReturnDate: '2026-06-20',
    isOverdue: false,
  },
];

export const getAllItems = (): OfficeItem[] => {
  return JSON.parse(JSON.stringify(items));
};

export const getItemById = (id: string): OfficeItem | undefined => {
  return items.find((item) => item.id === id);
};

export const addItem = (data: Omit<OfficeItem, 'id' | 'status' | 'borrowCount'>): OfficeItem => {
  const newItem: OfficeItem = {
    id: uuidv4(),
    name: data.name,
    code: data.code,
    department: data.department,
    status: 'available',
    borrowCount: 0,
  };
  items.push(newItem);
  return JSON.parse(JSON.stringify(newItem));
};

export const updateItem = (id: string, data: Partial<Omit<OfficeItem, 'id'>>): OfficeItem | undefined => {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  items[index] = { ...items[index], ...data };
  return JSON.parse(JSON.stringify(items[index]));
};

export const deleteItem = (id: string): boolean => {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return false;
  items.splice(index, 1);
  return true;
};

export const getAllBorrowRecords = (): BorrowRecord[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return borrowRecords.map((record) => {
    if (!record.actualReturnDate) {
      const expected = new Date(record.expectedReturnDate);
      expected.setHours(0, 0, 0, 0);
      return { ...record, isOverdue: expected < today };
    }
    return { ...record };
  });
};

export const getBorrowRecordById = (id: string): BorrowRecord | undefined => {
  return borrowRecords.find((r) => r.id === id);
};

export const getActiveBorrowRecordByItem = (itemId: string): BorrowRecord | undefined => {
  return borrowRecords.find((r) => r.itemId === itemId && !r.actualReturnDate);
};

export const borrowItem = (data: {
  itemId: string;
  employeeId: string;
  employeeName: string;
  expectedReturnDate: string;
}): { record: BorrowRecord; item: OfficeItem } | { error: string } => {
  const item = items.find((i) => i.id === data.itemId);
  if (!item) return { error: '物品不存在' };
  if (item.status === 'borrowed') return { error: '该物品已被借出' };

  const today = new Date();
  const borrowDateStr = today.toISOString().split('T')[0];

  const newRecord: BorrowRecord = {
    id: uuidv4(),
    itemId: data.itemId,
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    borrowDate: borrowDateStr,
    expectedReturnDate: data.expectedReturnDate,
    isOverdue: false,
  };

  borrowRecords.push(newRecord);
  item.status = 'borrowed';
  item.borrowCount += 1;

  return {
    record: JSON.parse(JSON.stringify(newRecord)),
    item: JSON.parse(JSON.stringify(item)),
  };
};

export const returnItem = (
  recordId: string,
  employeeId: string
): { record: BorrowRecord; item: OfficeItem } | { error: string } => {
  const record = borrowRecords.find((r) => r.id === recordId);
  if (!record) return { error: '借出记录不存在' };
  if (record.employeeId !== employeeId) return { error: '工号与记录不匹配' };
  if (record.actualReturnDate) return { error: '该物品已归还' };

  const item = items.find((i) => i.id === record.itemId);
  if (!item) return { error: '关联物品不存在' };

  const today = new Date();
  record.actualReturnDate = today.toISOString().split('T')[0];
  item.status = 'available';

  return {
    record: JSON.parse(JSON.stringify(record)),
    item: JSON.parse(JSON.stringify(item)),
  };
};

export interface OverdueItem {
  record: BorrowRecord;
  item: OfficeItem;
}

export interface Stats {
  totalItems: number;
  totalBorrowCount: number;
  currentlyBorrowed: number;
  overdueCount: number;
}

export const getOverdueItems = (): OverdueItem[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: OverdueItem[] = [];
  for (const record of borrowRecords) {
    if (record.actualReturnDate) continue;
    const expected = new Date(record.expectedReturnDate);
    expected.setHours(0, 0, 0, 0);
    if (expected < today) {
      const item = items.find((i) => i.id === record.itemId);
      if (item) {
        result.push({ record: { ...record, isOverdue: true }, item: JSON.parse(JSON.stringify(item)) });
      }
    }
  }
  return result;
};

export const getStats = (): Stats => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalBorrowCount = 0;
  let currentlyBorrowed = 0;
  let overdueCount = 0;

  for (const item of items) {
    totalBorrowCount += item.borrowCount;
    if (item.status === 'borrowed') currentlyBorrowed += 1;
  }

  for (const record of borrowRecords) {
    if (!record.actualReturnDate) {
      const expected = new Date(record.expectedReturnDate);
      expected.setHours(0, 0, 0, 0);
      if (expected < today) overdueCount += 1;
    }
  }

  return {
    totalItems: items.length,
    totalBorrowCount,
    currentlyBorrowed,
    overdueCount,
  };
};
