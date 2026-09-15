export type UserRole = "customer" | "staff" | "admin";

export interface AppUser {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  branchId: string | null;
}

export interface AuthFormState {
  error: string | null;
  success: boolean;
}
