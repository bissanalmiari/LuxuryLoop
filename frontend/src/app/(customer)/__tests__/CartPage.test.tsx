import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderComponent, setApiHandler, authedFetch } from "@/test/utils";
import CartPage from "@/app/(customer)/cart/page";

const SAMPLE_CART = {
  items: [
    {
      id: "c1",
      item_id: "i1",
      title: "Rolex Submariner",
      brand_name: "Rolex",
      branch_name: "Beirut Main",
      branch_country: "Lebanon",
      selling_price: 12900,
      image_url: "/images/watch.jpg",
      status: "available",
    },
    {
      id: "c2",
      item_id: "i2",
      title: "Chanel Classic Flap",
      brand_name: "Chanel",
      branch_name: "Jounieh Branch",
      branch_country: "Lebanon",
      selling_price: 8900,
      image_url: null,
      status: "available",
    },
  ],
  subtotal: 21800,
};

describe("CartPage", () => {
  it("renders cart items from the API and the subtotal", async () => {
    setApiHandler(async () => SAMPLE_CART);
    renderComponent(<CartPage />);

    expect(await screen.findByText("Rolex Submariner")).toBeInTheDocument();
    expect(screen.getByText("Chanel Classic Flap")).toBeInTheDocument();
    expect(screen.getByText("Branch: Beirut Main, Lebanon")).toBeInTheDocument();
    expect(screen.getAllByText("$21,800").length).toBeGreaterThanOrEqual(2);
    const checkout = screen.getByRole("link", { name: /Proceed to checkout/i });
    expect(checkout).toHaveAttribute("href", "/checkout");
  });

  it("shows the empty state when there are no items", async () => {
    setApiHandler(async () => ({ items: [], subtotal: 0 }));
    renderComponent(<CartPage />);

    expect(await screen.findByText(/Your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse the shop/i })).toHaveAttribute("href", "/shop");
  });

  it("marks unavailable items and lets the user remove them", async () => {
    const user = userEvent.setup();
    setApiHandler(async (path, options) => {
      if (path.startsWith("/cart/") && options?.method === "DELETE") {
        return null;
      }
      return {
        items: [
          {
            id: "c1",
            item_id: "i1",
            title: "Rolex Submariner",
            brand_name: "Rolex",
            branch_name: "Beirut Main",
            branch_country: "Lebanon",
            selling_price: 12900,
            image_url: null,
            status: "sold",
          },
        ],
        subtotal: 12900,
      };
    });
    renderComponent(<CartPage />);

    expect(await screen.findByText("Rolex Submariner")).toBeInTheDocument();
    expect(await screen.findByText(/No longer available/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove from cart" }));
    await waitFor(() => expect(authedFetch).toHaveBeenCalledWith("/cart/c1", { method: "DELETE" }));
  });

  it("treats a cart request error as an empty cart", async () => {
    setApiHandler(async () => {
      throw new Error("boom");
    });
    renderComponent(<CartPage />);

    expect(await screen.findByText(/Your cart is empty/i)).toBeInTheDocument();
  });
});