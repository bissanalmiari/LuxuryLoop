import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderComponent, router, supabaseMock } from "@/test/utils";
import RegisterForm from "@/app/(auth)/register/RegisterForm";

describe("RegisterForm", () => {
  it("creates an account and redirects to /login", async () => {
    const user = userEvent.setup();
    supabaseMock.signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    renderComponent(<RegisterForm />);

    await user.type(screen.getByPlaceholderText("Lea Haddad"), "Lea Haddad");
    await user.type(screen.getByPlaceholderText("you@email.com"), "lea@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "supersecure");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(supabaseMock.signUp).toHaveBeenCalledTimes(1));
    const [{ options }] = supabaseMock.signUp.mock.calls[0] as any;
    expect(options.data.full_name).toBe("Lea Haddad");
    expect(options.data.role).toBe("customer");
    expect(options.emailRedirectTo).toContain("/api/auth/callback");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login"));
  });

  it("blocks submission until terms are accepted", async () => {
    const user = userEvent.setup();
    renderComponent(<RegisterForm />);

    await user.type(screen.getByPlaceholderText("Lea Haddad"), "Lea Haddad");
    await user.type(screen.getByPlaceholderText("you@email.com"), "lea@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "supersecure");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Please accept the Terms & Privacy Policy")).toBeInTheDocument();
    expect(supabaseMock.signUp).not.toHaveBeenCalled();
  });

  it("surfaces the error from the auth provider", async () => {
    const user = userEvent.setup();
    supabaseMock.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });
    renderComponent(<RegisterForm />);

    await user.type(screen.getByPlaceholderText("Lea Haddad"), "Lea Haddad");
    await user.type(screen.getByPlaceholderText("you@email.com"), "lea@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "supersecure");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("User already registered")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});