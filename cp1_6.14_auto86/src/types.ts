export interface Venue {
  id: string;
  name: string;
  type: 'basketball' | 'badminton' | 'tennis' | 'yoga' | 'swimming' | 'table-tennis';
  location: string;
  rating: number;
  price: number;
  image: string;
  description: string;
  maintenanceSlots: string[];
}

export interface TimeSlot {
  time: string;
  status: 'available' | 'booked' | 'maintenance';
}

export interface Equipment {
  id: string;
  name: string;
  icon: string;
  hourlyRate: number;
  deposit: number;
  stock: number;
}

export interface Reservation {
  id: string;
  userId: string;
  venueId: string;
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  contact: string;
  remark: string;
  equipment: { equipmentId: string; name: string; quantity: number }[];
  totalPrice: number;
  totalDeposit: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  review?: {
    rating: number;
    comment: string;
    createdAt: string;
  };
}

export interface User {
  id: string;
  name: string;
  phone: string;
}
