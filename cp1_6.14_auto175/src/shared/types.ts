export type Tour = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  venueCount: number;
  createdAt: string;
};

export type ShowStatus = 'confirmed' | 'pending' | 'cancelled';

export type Show = {
  id: string;
  tourId: string;
  venue: string;
  date: string;
  time: string;
  ticketPrice: number;
  contactName: string;
  contactPhone: string;
  status: ShowStatus;
  stats?: ShowStats;
};

export type Category = 'transport' | 'accommodation' | 'food' | 'equipment' | 'promotion';

export const CATEGORY_LABELS: Record<Category, string> = {
  transport: '交通',
  accommodation: '住宿',
  food: '餐饮',
  equipment: '设备租赁',
  promotion: '宣传',
};

export type Budget = {
  tourId: string;
  totalBudget: number;
  categoryBudgets: Record<Category, number>;
  expenses: Expense[];
};

export type Expense = {
  id: string;
  category: Category;
  amount: number;
  description: string;
  date: string;
};

export type ShowStats = {
  audience: number;
  merchandise: MerchandiseItem[];
  equipmentIssues: number;
};

export type MerchandiseItem = {
  name: string;
  revenue: number;
};

export type MemberRole = 'admin' | 'member' | 'viewer';

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: '管理员',
  member: '成员',
  viewer: '仅查看',
};

export type Member = {
  id: string;
  tourId: string;
  email: string;
  name: string;
  role: MemberRole;
  avatar?: string;
  online: boolean;
};

export type Database = {
  tours: Tour[];
  shows: Show[];
  budget: Record<string, Budget>;
  members: Member[];
};
