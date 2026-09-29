import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";

import { renderComponent, router, pathname } from "@/test/utils";
import StaffHome from "@/app/staff/page";

describe("StaffHome permission gate", () => {
  it("redirects customers to /login", async () => {
    pathname.current = "/staff";
    renderComponent(<StaffHome />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });

  it("lets staff through to /staff/inventory", async () => {
    pathname.current = "/staff";
    const { supabaseMock, setApiHandler } = await import("@/test/utils");
    supabaseMock.setUser({
      id: "u-staff",
      email: "staff@example.com",
      user_metadata: { role: "staff", full_name: "Sara Staff" },
      app_metadata: { role: "staff" },
    });
    setApiHandler(async (p) => (p === "/auth/me" ? { role: "staff" } : {}));
    renderComponent(<StaffHome />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/staff/inventory"));
  });

  it("lets admins through", async () => {
    pathname.current = "/staff";
    const { supabaseMock, setApiHandler } = await import("@/test/utils");
    supabaseMock.setUser({
      id: "u-admin",
      email: "admin@example.com",
      user_metadata: { role: "admin", full_name: "Ava Admin" },
      app_metadata: { role: "admin" },
    });
    setApiHandler(async (p) => (p === "/auth/me" ? { role: "admin" } : {}));
    renderComponent(<StaffHome />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/staff/inventory"));
  });
});

const { supabaseMock, setApiHandler } = await import("@/test/utils");

describe("StaffLayout nav", () => {
  it("renders pipeline and operations links for an allowed staff user", async () => {
    pathname.current = "/staff/inventory";
    supabaseMock.setUser({
      id: "u-staff",
      email: "staff@example.com",
      user_metadata: { role: "staff", full_name: "Sara Staff" },
      app_metadata: { role: "staff" },
    });
    setApiHandler(async (p) => (p === "/auth/me" ? { role: "staff" } : {}));
    const { default: StaffLayout } = await import("@/app/staff/layout");
    renderComponent(<StaffLayout><div>inventory</div></StaffLayout>);

    expect(await screen.findByRole("link", { name: /Review queue/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inventory/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Products/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Orders/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Sales/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Customers/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Pricing/ })).not.toBeInTheDocument();
    expect(screen.getByText("inventory")).toBeInTheDocument();
  });

  it("redirects a non-staff user to /login instead of rendering nav", async () => {
    pathname.current = "/staff/inventory";
    supabaseMock.setUser({
      id: "u-customer",
      email: "customer@example.com",
      user_metadata: { role: "customer", full_name: "Jane Doe" },
      app_metadata: { role: "customer" },
    });
    setApiHandler(async (p) => (p === "/auth/me" ? { role: "customer" } : {}));
    const { default: StaffLayout } = await import("@/app/staff/layout");
    renderComponent(<StaffLayout><div>secret</div></StaffLayout>);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });
});