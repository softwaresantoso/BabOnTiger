export type Role = "customer" | "owner" | "barber";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Business {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  primaryColor?: string;
  secondaryColor?: string;
  timezone: string;
  currency: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: Record<string, unknown>;
  active: boolean;
  queueSettings?: {
    resetDaily?: boolean;
    prefix?: string;
  };
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  businessId: string;
  name: string;
  phone?: string;
  role: Role;
  branchId?: string;
  barberId?: string;
  active?: boolean;
}

export interface Service {
  id: string;
  businessId?: string;
  branchId?: string;
  name: string;
  category?: string;
  description?: string;
  durationMinutes: number;
  price: number;
  barberIds?: string[];
  imageUrl?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Barber {
  id: string;
  businessId?: string;
  branchId?: string;
  userId?: string;
  name: string;
  phone?: string;
  bio?: string;
  photoUrl?: string;
  specialties?: string[];
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Schedule {
  id: string;
  barberId: string;
  branchId?: string;
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
  branchId?: string;
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
  branchId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  barberId?: string;
  barberName?: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  date: string;
  startTime: string;
  endTime: string;
  queueNumber?: number;
  source?: "ONLINE" | "WALK_IN";
  status: BookingStatus;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Queue {
  id: string;
  businessId: string;
  branchId: string;
  date: string;
  queueNumber: number;
  bookingId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  barberId?: string;
  barberName?: string;
  serviceId: string;
  serviceName: string;
  status: "BOOKED" | "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
  calledAt?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Attendance {
  id: string;
  businessId: string;
  branchId: string;
  barberId: string;
  barberName: string;
  date: string;
  checkInAt: unknown;
  checkOutAt?: unknown;
  status: "PRESENT" | "COMPLETED";
  checkInMethod: "QR" | "MANUAL";
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TransactionItem {
  type: "SERVICE" | "PRODUCT";
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  businessId?: string;
  branchId?: string;
  bookingId?: string;
  queueId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  barberId?: string;
  barberName?: string;
  items?: TransactionItem[];
  subtotal?: number;
  discount?: number;
  total: number;
  promoId?: string;
  promoCode?: string;
  method?: "CASH" | "QRIS" | "TRANSFER" | "OTHER";
  paymentMethod?: "CASH" | "QRIS" | "TRANSFER" | "OTHER";
  status: "UNPAID" | "PAID" | "REFUNDED";
  paymentStatus?: "UNPAID" | "PAID" | "REFUNDED";
  paidAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Product {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  imageUrl?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Promo {
  id: string;
  businessId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  promoCode?: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minimumTransaction?: number;
  startAt?: unknown;
  endAt?: unknown;
  usageLimit?: number;
  customerUsageLimit?: number;
  branchIds?: string[];
  serviceIds?: string[];
  productIds?: string[];
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type StockMovementType = "PURCHASE" | "SALE" | "ADJUSTMENT" | "RETURN" | "INITIAL";

export interface StockMovement {
  id: string;
  businessId: string;
  branchId: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  referenceType?: string;
  note?: string;
  createdBy: string;
  createdAt?: unknown;
}
