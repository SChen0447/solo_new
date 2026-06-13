export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface Shop {
  id: number;
  name: string;
  rating: number;
  address: string;
  services: Service[];
}

export interface Slot {
  time: string;
  available: boolean;
}

export interface Appointment {
  id: number;
  shop_id: number;
  shop_name: string;
  service_id: string;
  service_name: string;
  date: string;
  time: string;
  pet_name: string;
  pet_id?: number;
  created_at: string;
}

export interface Pet {
  id: number;
  name: string;
  breed: string;
  age: number;
  note: string;
}
