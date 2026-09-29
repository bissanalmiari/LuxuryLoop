import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderComponent, router, supabaseMock, setApiHandler } from "@/test/utils";
import LoginForm from "@/app/(auth)/login/LoginForm";

describe("LoginForm", () => {
  it("logs in a customer and redirects to home", async () => {
    const user = userEvent.setup();
    supabaseMock.signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { role: "customer" } } },
      error: null,
    });
    renderComponent(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@email.com"), "customer@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
  });

  it("redirects admins to /admin", async () => {
    const user = userEvent.setup();
    supabaseMock.signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { role: "admin" } } },
      error: null,
    });
    renderComponent(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@email.com"), "admin@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/admin"));
  });

  it("redirects staff to /staff", async () => {
    const user = userEvent.setup();
    supabaseMock.signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { role: "staff" } } },
      error: null,
    });
    renderComponent(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@email.com"), "staff@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/staff"));
  });

  it("prefers the role returned by the backend /auth/me over JWT metadata", async () => {
    const user = userEvent.setup();
    supabaseMock.signInWithPassword.mockResolvedValue({
      data: { user: { app_metadata: { role: "customer" } } },
      error: null,
    });
    setApiHandler(async (path) => {
      if (path === "/auth/me") return { role: "admin" };
      return {};
    });
    renderComponent(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@email.com"), "x@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/admin"));
  });

  it("shows an error message when credentials are wrong", async () => {
    const user = userEvent.setup();
    supabaseMock.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });
    renderComponent(<LoginForm />);

    await user.type(screen.getByPlaceholderText("you@email.com"), "bad@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrong");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid login credentials")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("LoginForm validation", () => {
  it("does not submit an empty form", async () => {
    const user = userEvent.setup();
    renderComponent(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(supabaseMock.signInWithPassword).not.toHaveBeenCalled();
  });
});