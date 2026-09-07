export type Role = "customer" | "admin" | "barber";
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface UserProfile {
  uid: string;
  businessId: string;
  name: string;
  phone?: string;
  role: Role;
  barberId?: string;
  active?: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface Barber {
  id: string;
  name: string;
  bio?: string;
  phone?: string;
  active: boolean;
  avatarUrl?: string;
}

export interface Schedule {
  id: string;
  barberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  active: boolean;
}

export interface SpecialSchedule {
  id: string;
  barberId: string;
  date: string;
  type: "OPEN" | "CLOSED";
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  note?: string;
}

export interface Booking {
  id: string;
  code: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Transaction {
  id: string;
  bookingId: string;
  amount: number;
  method: "CASH" | "QRIS" | "TRANSFER" | "OTHER";
  status: "UNPAID" | "PAID" | "REFUNDED";
  paidAt?: unknown;
}
