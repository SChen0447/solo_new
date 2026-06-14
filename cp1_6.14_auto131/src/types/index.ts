export type VendorCategory = '小吃' | '水果' | '日用品' | '工艺品';

export type VendorStatus = '有效' | '过期' | '吊销';

export interface VendorLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface Vendor {
  id: string;
  name: string;
  idCard: string;
  phone: string;
  category: VendorCategory;
  stallNumber: string;
  location: VendorLocation;
  startDate: string;
  endDate: string;
  status: VendorStatus;
  avatarColor?: string;
  createdAt: string;
  updatedAt: string;
}

export type PatrolStatus = '正常' | '轻微违规' | '严重违规';

export interface PatrolPhoto {
  id: string;
  url: string;
  name: string;
}

export interface Patrol {
  id: string;
  vendorId: string;
  patrolTime: string;
  inspectorName: string;
  photos: PatrolPhoto[];
  status: PatrolStatus;
  violationDesc?: string;
  rectificationReq?: string;
  hasRevoked?: boolean;
  createdAt: string;
}

export interface SearchFilters {
  keyword: string;
  category: VendorCategory | '';
  status: VendorStatus | '';
  stallNumber: string;
}
