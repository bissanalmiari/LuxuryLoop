import { vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ReactElement } from "react";

export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
};

export const pathname = { current: "/login" };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname.current,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : href?.pathname} {...props}>
      {children}
    </a>
  ),
}));

type AuthFn = (...args: any[]) => Promise<any>;

export class SupabaseMock {
  signInWithPassword = vi.fn<AuthFn>();
  signUp = vi.fn<AuthFn>();
  signOut = vi.fn<AuthFn>();
  getUser = vi.fn<AuthFn>();
  getSession = vi.fn<AuthFn>();
  upload = vi.fn<AuthFn>();
  getPublicUrl = vi.fn((...args: string[]) => ({ data: { publicUrl: "https://cdn.test/upload.jpg" } }));
  resetPassword = vi.fn<AuthFn>();

  auth = {
    signInWithPassword: (...args: any[]) => this.signInWithPassword(...args),
    signUp: (...args: any[]) => this.signUp(...args),
    signOut: (...args: any[]) => this.signOut(...args),
    getUser: (...args: any[]) => this.getUser(...args),
    getSession: (...args: any[]) => this.getSession(...args),
    resetPasswordForEmail: (...args: any[]) => this.resetPassword(...args),
  };

  storage = {
    from: () => ({
      upload: (...args: any[]) => this.upload(...args),
      getPublicUrl: (...args: any[]) => this.getPublicUrl(...args),
    }),
  };

  setUser(user: any) {
    this.getUser.mockResolvedValue({ data: { user }, error: null });
  }

  setSession(session: any) {
    this.getSession.mockResolvedValue({ data: { session }, error: null });
  }

  useDefaults() {
    const user = { id: "u-customer", email: "customer@example.com", user_metadata: { role: "customer", full_name: "Jane Doe" }, app_metadata: { role: "customer" } };
    this.setUser(user);
    this.setSession({ access_token: "test-token", user });
  }
}

export const supabaseMock = new SupabaseMock();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => supabaseMock,
}));

// Controllable authedFetch mock: tests set `setApiHandler(...)` per case.
type ApiHandler = (path: string, options?: RequestInit) => Promise<any>;
let apiHandler: ApiHandler = async () => ({});
export const authedFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  authedFetch: (...args: any[]) => (authedFetch as any)(...args),
}));

export function setApiHandler(handler: ApiHandler) {
  apiHandler = handler;
}

export function renderComponent(ui: ReactElement) {
  return render(ui);
}

beforeEach(() => {
  vi.resetAllMocks();
  apiHandler = async () => ({});
  router.push.mockReset();
  authedFetch.mockImplementation((path: string, options?: RequestInit) => apiHandler(path, options));
  supabaseMock.useDefaults();
});