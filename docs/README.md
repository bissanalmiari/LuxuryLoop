# LuxuryLoop — Project & Data Documentation

Multi-branch second-hand luxury store platform. Customers consign pre-owned watches,
handbags, jewelry and shoes; submits go through AI visibility screening and physical
authentication before being listed and sold across branches.

Individual graduation project (MVP, 2-week window).

- Root README: `../README.md`
- Seed data: `supabase/seed/seed.sql`

## Architecture

```
Next.js (Vercel) ──REST /api/v1──▶ FastAPI (Render) ──▶ Supabase
   storefront + admin back office        catalog / consignment /
                                          sales / AI screening      ├─ PostgreSQL (schema + RLS + triggers)
                                          └── Gemini vision LLM     ├─ Auth (Supabase Auth, JWT)
                                              (authenticity score)  ├─ Storage (file uploads)
                                                                     └─ Email (Resend)
```

- **Frontend** — Next.js 14 + TypeScript + Tailwind CSS. Customer layout (`(customer)`),
  staff/admin back office (`/staff`, `/admin`), auth screens (`(auth)`).
- **Backend** — FastAPI. Admin client via service-role key (`get_supabase_admin`)
  bypasses RLS; a session-pooler bridge (`SUPABASE_DB_URL`, migration `0002`) wires
  RLS context for `current_user` queries. Emails run as background tasks and never raise.

## Entity relationship & item-centric lifecycle

One **authentication request → one item**. The `items.status` value is canonical
(`available` / `reserved` / `sold`); nothing else re-derives it.

```
branches ─┬─< users (branch_id, role: customer|staff|admin)
          ├─< physical_authentications (branch_id, staff appointment)
          └─< items.branch_id (branch-scoped inventory)

users >── authentication_requests (customer_id, acquisition_intent, preferred_branch_id)
             ├── request_documents (photos / invoice / certificate)
             ├── ai_assessments (confidence 0-100, indicators, explanation)
             └── physical_authentications (result + staff decision)
authentication_requests >── acquisitions (shop_buy → payout/cost | consignment → commission)
acquisitions >── items (> items are UNIQUE — one row per physical piece)
items ──< cart_items >── orders ──< order_items
                              └── payments (pending → succeeded)
items ──< inventory_movements (transfer between branches)
users >── addresses, favorites (wishlists)
```

Data invariants set in SQL, not the app layer:

- `reserve_item_on_order_item` (trigger, `0005`): flipping an item to `reserved` the
  instant an order line is inserted — two customers can never both "win" one unique piece.
- `mark_items_sold_on_payment_success`: `payments.status = 'succeeded'` is the *only*
  place `sold` is ever set; it also flips the order to `paid`.
- `release_items_on_order_cancelled`: cancelled unpaid orders release `reserved` items
  back to `available`.
- `advance_request_on_ai_assessment` (`0010`): score `< 40` → `rejected`; `≥ 40` →
  `pending_physical_authentication`; null/error → `under_review` (manual review, never stuck).
- `advance_request_on_physical_auth` (`0009`): authenticated → `approved` +
  triggers `promote_approved_consignment`; rejected → `rejected`.
- `apply_inventory_movement` / `enforce_movement_source_branch` (`0003`): a transfer
  atomically moves `items.branch_id` only when the source branch matches the item.

## Domain rules

- **Consignment intake.** Customer submits details + photos + optional papers and
  chooses an *acquisition intent*: `shop_buy` (sell outright; shop pays a payout) or
  `consignment` (customer keeps ownership, shop takes `commission_pct` on sale).
  The customer also picks the **preferred branch** (`preferred_branch_id`, `0014`) —
  the physical-authentication appointment is scheduled at (or defaults to) this branch.
- **AI is assistive only.** The Gemini score informs but never decides; a staff
  specialist performs the in-person authentication and makes the final call.
- **Branch scoping.** A `staff` member sees only their own branch (`_branch()` =
  staff.branch_id, global for `admin`). Row-Level Security enforces the same rule and
  customers can only read their own rows.
- **One request → one listing.** `promote_approved_consignment` creates exactly one
  `items` row (guarded by `source_request_id`) linked to an `acquisitions` record;
  shop-buy → `store_owned`, consignment → `consigned`.
- **Checkout is mocked.** `checkout_cart_for_branch` (`0005`) creates an order per
  branch, inserts order lines (reserving items), then creates a `payments` row and
  flips it to `succeeded` inline. The trigger chain is gateway-agnostic — a real
  Stripe/PSP integration would replace only that one UPDATE with a webhook handler.

## Migration index

| Migration | What it adds |
| --------- | ------------ |
| `0001_init` | Core schema (users, branches, items, requests, auth, RLS) + seed helpers |
| `0002_rls_bridge` | RLS session context functions (`app_user_id`, `app_role`, `set_app_user_context`) |
| `0003_inventory_movements` | Branch-to-branch transfers w/ atomic `branch_id` move |
| `0004_items_branch_scoping` | Staff can only touch their branch's items |
| `0005_day7_checkout` | Order/payment triggers + `checkout_cart_for_branch` RPC |
| `0006_branch_country` | `branches.country` |
| `0007_customer_storage_upload` | Customer upload storage + bucket |
| `0008_branch_image_url` | `branches.image_url` |
| `0009_consignment_approval_trigger` | Physical-auth decision advance trigger |
| `0010_ai_screening_trigger` | AI-score auto-advance trigger + fallback → manual review |
| `0011_consignment_listing` | `items.source_request_id`, acquisitions linkage |
| `0012_acquisition_intent` | `authentication_requests.acquisition_intent` (shop_buy / consignment) |
| `0013_favorites` | Wishlist table + RLS |
| `0014_preferred_branch` | `authentication_requests.preferred_branch_id` (customer-chosen branch) |

## Known gotchas

- Frontend env var is `NEXT_PUBLIC_API_URL` — not `NEXT_PUBLIC_API_BASE_URL`.
  (`.env.local.example` was corrected to match.)
- `backend/.env` is read **relative to the current working directory** — test scripts
  must run from `backend/` or config values come back empty.
- Use the session-pooler URL with the DB password for `SUPABASE_DB_URL` to activate
  the RLS bridge; schema-only URLs silently fall back to `conn is None`.
- PostgREST errors on selecting a column that doesn't exist yet — run `supabase db push`
  (or the new migration) *before* deploying backend code that queries the new column.
- `authentication_requests` uses `submitted_at`, not `created_at`, for ordering.
- Resend free tier only delivers to the account owner's inbox (`EMAIL_FROM`
  `onboarding@resend.dev`); verify a domain before real customer email.

## Local run

See the root `../README.md` → **Getting started**. Quick start:

```bash
# backend (from backend/)
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000        # http://localhost:8000/docs

# frontend
cd frontend && npm install && npm run dev        # http://localhost:3000
```

## Testing & quality

- Frontend: `npm run type-check`, `npm run lint`, `npm run build`
- Backend: `python -m py_compile app/**/*.py` (CI): `python -c "import app.main"`