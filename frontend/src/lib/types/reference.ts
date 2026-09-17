export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
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