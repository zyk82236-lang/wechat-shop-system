export type Role = "SUPER_ADMIN" | "OPERATOR";

export type OrderStatus =
  | "pending_payment"
  | "paid_pending_shipment"
  | "shipped"
  | "completed"
  | "cancelled"
  | "refunding"
  | "refunded";

export interface User {
  id: string;
  openId: string;
  nickname: string;
  phone?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  sort: number;
  enabled: boolean;
}

export interface ProductSku {
  id: string;
  productId: string;
  name: string;
  priceCents: number;
  stock: number;
  code: string;
}

export interface Product {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string;
  cover: string;
  images: string[];
  detail: string;
  enabled: boolean;
  recommended: boolean;
  sales: number;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  skuId: string;
  quantity: number;
  checked: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  skuId: string;
  title: string;
  skuName: string;
  quantity: number;
  priceCents: number;
  amountCents: number;
}

export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  addressId: string;
  status: OrderStatus;
  itemAmountCents: number;
  shippingAmountCents: number;
  payableAmountCents: number;
  note?: string;
  createdAt: string;
  paidAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  source: "cart" | "buy_now";
  paymentDeadlineAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNo: string;
  channel: "wechat_pay";
  amountCents: number;
  transactionId?: string;
  status: "created" | "paid" | "failed";
  rawNotify?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  company: string;
  companyCode?: string;
  trackingNo: string;
  status?: "pending_pickup" | "in_transit" | "signed" | "exception";
  tracks?: Array<{ time: string; content: string; location?: string }>;
  shippedAt: string;
  expectedDeliveryAt?: string;
}

export interface Banner {
  id: string;
  image: string;
  title: string;
  targetType: "product" | "category" | "activity";
  targetId: string;
  sort: number;
  enabled: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  role: Role;
}
