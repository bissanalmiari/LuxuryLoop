export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  image_url: string | null;
  created_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
}

export interface Brand {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
}

export interface Product {
  id: string;
  item_code: string | null;
  title: string;
  model: string | null;
  description: string | null;
  condition: string | null;
  brand_id: string | null;        // NEW
  category_id: string | null;     // NEW
  brand_name: string;
  category_name: string;
  branch_name: string;
  branch_country: string;
  branch_id: string;
  selling_price: number;
  discount: number;
  status: string;
  ownership_type: string;
  cost: number | null;            // NEW
  image_urls: string[];
  video_url: string | null;
  serial_reference: string | null;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  from_branch_id: string;
  from_branch_name: string;
  to_branch_id: string;
  to_branch_name: string;
  moved_by_staff_id: string;
  moved_by_staff_name: string;
  status: string;
  notes: string | null;
  moved_at: string;
  created_at: string;
}

export interface StaffConsignment {
  id: string;
  request_id: string;
  status: string | null;
  notes: string | null;
  appointment_at: string | null;
  decided_at: string | null;
  branch_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  title: string | null;
  confidence_score?: number | null;
  suspicious_indicators?: string[] | null;
  explanation?: string | null;
}

export interface PhysicalAuthDecision {
  result: "authenticated" | "rejected";
  notes?: string | null;
  decided_at?: string | null;
}

export interface PhysicalAuthCreate {
  branch_id?: string | null;
  appointment_at?: string | null;
  notes?: string | null;
}

export interface PhysicalAuthOut {
  id: string;
  request_id: string;
  branch_id: string | null;
  staff_id: string | null;
  appointment_at: string | null;
  result: string | null;
  notes: string | null;
  decided_at: string | null;
}
