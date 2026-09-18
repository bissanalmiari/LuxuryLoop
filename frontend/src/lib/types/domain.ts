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