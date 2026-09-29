import { describe, it, expect, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderComponent, router, supabaseMock, setApiHandler, authedFetch } from "@/test/utils";
import ConsignPage from "@/app/(customer)/consign/page";

const BRANCHES = [
  { id: "b1", name: "Beirut Main", city: "Beirut", is_active: true },
  { id: "b2", name: "Closed Branch", city: "Tripoli", is_active: false },
];

function stubFetch(defaultBody: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      let json: unknown = defaultBody;
      if (url.includes("/categories")) json = [{ id: "c1", name: "Watches" }];
      if (url.includes("/brands")) json = [{ id: "br1", name: "Rolex" }];
      if (url.includes("/branches")) json = BRANCHES;
      return { ok: true, json: async () => json };
    })
  );
}

function selects() {
  return screen.getAllByRole("combobox");
}

function form() {
  return screen.getByRole("button", { name: /Submit for AI screening/i }).closest("form")!;
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  const [category, brand, , branch] = selects();
  await user.selectOptions(category, "c1");
  await user.selectOptions(brand, "br1");
  await user.type(screen.getByPlaceholderText("e.g. Classic Flap Bag, Medium"), "Classic Flap");
  await user.selectOptions(branch, "b1");
  const photo = new File(["(bytes)"], "bag.png", { type: "image/png" });
  await user.upload(screen.getByLabelText(/Add at least one photo/i), photo);
}

describe("ConsignPage", () => {
  it("requires category, brand, branch, model and at least one photo", async () => {
    stubFetch([]);
    const user = userEvent.setup();
    renderComponent(<ConsignPage />);

    await waitFor(() => expect(selects().length).toBe(4));
    await user.click(screen.getByRole("button", { name: /Submit for AI screening/i }));
    fireEvent.submit(form());

    expect(await screen.findByText(/Please select a category, brand, branch/i)).toBeInTheDocument();
    expect(authedFetch).not.toHaveBeenCalledWith("/consignments", expect.anything());
  });

  it("submits a consignment with uploaded photo and redirects to its status page", async () => {
    stubFetch([]);
    const user = userEvent.setup();
    supabaseMock.upload.mockResolvedValue({ data: { path: "consignment-photos/bag.png" }, error: null });
    setApiHandler(async (path) => {
      if (path === "/consignments") return { id: "req-123", status: "submitted" };
      return {};
    });
    renderComponent(<ConsignPage />);

    await waitFor(() => expect(selects().length).toBe(4));
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /Submit for AI screening/i }));

    await waitFor(() => expect(supabaseMock.upload).toHaveBeenCalled());
    await waitFor(() =>
      expect(authedFetch).toHaveBeenCalledWith("/consignments", expect.objectContaining({ method: "POST" }))
    );
    const [, init] = authedFetch.mock.calls.find(([p]) => p === "/consignments")!;
    const sentBody = JSON.parse((init?.body as string) ?? "{}");
    expect(sentBody.model).toBe("Classic Flap");
    expect(sentBody.category_id).toBe("c1");
    expect(sentBody.brand_id).toBe("br1");
    expect(sentBody.preferred_branch_id).toBe("b1");
    expect(sentBody.acquisition_intent).toBe("consignment");
    expect(sentBody.documents).toEqual([
      { document_type: "image", file_url: "https://cdn.test/upload.jpg" },
    ]);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/consign/status/req-123"));
  });

  it("redirects to login when no session exists", async () => {
    stubFetch([]);
    const user = userEvent.setup();
    supabaseMock.getSession.mockResolvedValue({ data: { session: null }, error: null });
    renderComponent(<ConsignPage />);

    await waitFor(() => expect(selects().length).toBe(4));
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /Submit for AI screening/i }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login?next=/consign"));
    expect(authedFetch).not.toHaveBeenCalledWith("/consignments", expect.anything());
  });

  it("surfaces a backend submission error", async () => {
    stubFetch([]);
    const user = userEvent.setup();
    supabaseMock.upload.mockResolvedValue({ data: { path: "p/x.png" }, error: null });
    setApiHandler(async () => {
      throw new Error("At least one item photo is required");
    });
    renderComponent(<ConsignPage />);

    await waitFor(() => expect(selects().length).toBe(4));
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /Submit for AI screening/i }));

    expect(await screen.findByText("At least one item photo is required")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});