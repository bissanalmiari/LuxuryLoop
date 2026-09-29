import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderComponent, setApiHandler, authedFetch } from "@/test/utils";
import CheckoutPage from "@/app/(customer)/checkout/page";

const BRANCHES = [
  { id: "b1", name: "Beirut Main", city: "Beirut", address: "Hamra St" },
  { id: "b2", name: "Jounieh Branch", city: "Jounieh", address: "Kfarhabida" },
];

const CART = {
  items: [
    { id: "c1", item_id: "i1", title: "Rolex Submariner", brand_name: "Rolex", selling_price: 12900, image_url: null, status: "available" },
  ],
  subtotal: 12900,
};

type NavSpy = ReturnType<typeof vi.spyOn>;

function stubLocationHref() {
  const state = {
    href: window.location.href,
    origin: window.location.origin,
    search: window.location.search,
    pathname: window.location.pathname,
  };

  const fakeLocation = {
    get href() {
      return state.href;
    },
    set href(v: string) {
      state.href = v;
    },
    get origin() {
      return state.origin;
    },
    get search() {
      return state.search;
    },
    set search(v: string) {
      state.search = v;
    },
    get pathname() {
      return state.pathname;
    },
    set pathname(v: string) {
      state.pathname = v;
    },
  } as unknown as typeof window.location;

  Object.defineProperty(window, "location", {
    value: fakeLocation,
    configurable: true,
    writable: true,
  });
  return fakeLocation;
}

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => BRANCHES,
      }))
    );
  });

  it("loads the cart and requests a delivery checkout with address details", async () => {
    const fakeLocation = stubLocationHref();
    const user = userEvent.setup();
    setApiHandler(async (path, options) => {
      if (path === "/auth/me") return { full_name: "Jane Doe", phone: "+961 3 123 456" };
      if (path === "/cart") return CART;
      if (path === "/orders/checkout") {
        const body = JSON.parse((options?.body as string) ?? "{}");
        expect(body.fulfillment_type).toBe("delivery");
        expect(body.address).toMatchObject({ city: "Beirut", address_line1: "Hamra St" });
        return { checkout_url: "https://checkout.stripe.com/c/pay/cs_test_123" };
      }
      return {};
    });
    renderComponent(<CheckoutPage />);

    expect(await screen.findByText("Rolex Submariner")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Rue Gouraud, Gemmayzeh"), "Hamra St");
    await user.type(screen.getByPlaceholderText("Beirut"), "Beirut");
    const pay = await screen.findByRole("button", { name: /Pay \$12,900/ });
    await user.click(pay);

    await waitFor(() => expect(fakeLocation.href).toBe("https://checkout.stripe.com/c/pay/cs_test_123"));
    expect(authedFetch).toHaveBeenCalledWith(
      "/orders/checkout",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("blocks pickup checkout until a branch is chosen", async () => {
    const user = userEvent.setup();
    setApiHandler(async (path) => {
      if (path === "/auth/me") return { full_name: "Jane Doe", phone: "+961 3 123 456" };
      if (path === "/cart") return CART;
      return {};
    });
    renderComponent(<CheckoutPage />);

    expect(await screen.findByText("Rolex Submariner")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /Pick up in branch/ }));
    await user.click(screen.getByRole("button", { name: /Pay \$12,900/ }));

    expect(await screen.findByText("Please choose the branch you'll pick up from.")).toBeInTheDocument();
    expect(authedFetch).not.toHaveBeenCalledWith("/orders/checkout", expect.anything());
  });

  it("blocks delivery checkout when required fields are missing", async () => {
    const user = userEvent.setup();
    setApiHandler(async (path) => {
      if (path === "/auth/me") return { full_name: "", phone: "" };
      if (path === "/cart") return CART;
      return {};
    });
    renderComponent(<CheckoutPage />);

    expect(await screen.findByText("Rolex Submariner")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Pay \$12,900/ }));

    expect(await screen.findByText(/Please fill in your name, phone, delivery address and city/i)).toBeInTheDocument();
    expect(authedFetch).not.toHaveBeenCalledWith("/orders/checkout", expect.anything());
  });

  it("surfaces a checkout API error", async () => {
    const user = userEvent.setup();
    setApiHandler(async (path) => {
      if (path === "/auth/me") return { full_name: "", phone: "" };
      if (path === "/cart") return CART;
      throw new Error("Item no longer available");
    });
    renderComponent(<CheckoutPage />);

    expect(await screen.findByText("Rolex Submariner")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Lea Haddad"), "Jane Doe");
    await user.type(screen.getByPlaceholderText("+961 71 234 567"), "+961 3 123 456");
    await user.type(screen.getByPlaceholderText("Rue Gouraud, Gemmayzeh"), "Hamra St");
    await user.type(screen.getByPlaceholderText("Beirut"), "Beirut");
    await user.click(screen.getByRole("button", { name: /Pay \$12,900/ }));

    expect(await screen.findByText("Item no longer available")).toBeInTheDocument();
  });

  it("cancels pending orders and restores the cart when returning with ?cancelled=1", async () => {
    const user = userEvent.setup();
    const fakeLocation = stubLocationHref();
    fakeLocation.search = "?cancelled=1&order_ids=ord-1,ord-2";
    setApiHandler(async (path) => {
      if (path === "/orders/cancel-checkout") return { ok: true };
      if (path === "/cart") return CART;
      if (path === "/auth/me") return { full_name: "Jane Doe", phone: "" };
      return {};
    });
    renderComponent(<CheckoutPage />);

    expect(await screen.findByText("Payment cancelled. Your items are back in your cart.")).toBeInTheDocument();
    await waitFor(() =>
      expect(authedFetch).toHaveBeenCalledWith("/orders/cancel-checkout", {
        method: "POST",
        body: JSON.stringify({ order_ids: ["ord-1", "ord-2"] }),
      })
    );
  });
});