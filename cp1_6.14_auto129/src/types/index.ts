export interface Luggage {
  id: string;
  name: string;
  phone: string;
  luggageType: 'backpack' | 'suitcase' | 'handbag' | 'other';
  notes: string;
  expectedPickupTime: string | null;
  pickupCode: string;
  status: 'stored' | 'claimed';
  storedAt: string;
  claimedAt: string | null;
}

export interface ShareItem {
  id: string;
  name: string;
  itemType: 'powerbank' | 'umbrella' | 'cable' | 'other';
  description: string;
  status: 'available' | 'borrowed';
  borrowCount: number;
  currentBorrower: string | null;
  borrowedAt: string | null;
  expectedReturnAt: string | null;
  returnedAt: string | null;
}

export interface Event {
  id: string;
  type: 'store' | 'claim' | 'borrow' | 'return' | 'addItem';
  description: string;
  relatedId: string;
  timestamp: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export type LuggageStatusFilter = 'all' | 'stored' | 'claimed';
export type ShareStatusFilter = 'all' | 'available' | 'borrowed';
