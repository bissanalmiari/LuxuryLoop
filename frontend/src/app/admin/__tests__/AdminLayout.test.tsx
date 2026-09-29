import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";

import { renderComponent } from "@/test/utils";

describe("AdminLayout role-scoped nav", () => {
  it("shows admin-only links for an admin", async () => {
    const { supabaseMock } = await import("@/test/utils");
    supabaseMock.setUser({
      id: "u-admin",
      email: "admin@example.com",
      user_metadata: { role: "admin", full_name: "Ava Admin" },
      app_metadata: { role: "admin" },
    });
    const { default: AdminLayout } = await import("@/app/admin/layout");
    renderComponent(<AdminLayout><div>content</div></AdminLayout>);

    expect(await screen.findByRole("link", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Products/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Branches/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Categories/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Brands/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Consignments/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Orders/ })).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("hides admin-only links for a staff user", async () => {
    const { supabaseMock } = await import("@/test/utils");
    supabaseMock.setUser({
      id: "u-staff",
      email: "staff@example.com",
      user_metadata: { role: "staff", full_name: "Sara Staff" },
      app_metadata: { role: "staff" },
    });
    const { default: AdminLayout } = await import("@/app/admin/layout");
    renderComponent(<AdminLayout><div>content</div></AdminLayout>);

    expect(await screen.findByRole("link", { name: /Products/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Branches/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Categories/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Brands/ })).not.toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});