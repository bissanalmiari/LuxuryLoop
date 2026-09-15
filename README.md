# LuxuryLoop

Multi-branch second-hand luxury store platform — individual developer graduation project (MVP, 2-week window).

## Stack

| Component      | Technology               |
| -------------- | ------------------------ |
| Frontend       | Next.js 14, TypeScript, Tailwind CSS |
| Backend        | FastAPI, Python          |
| Database       | PostgreSQL / Supabase    |
| Auth           | Supabase Auth (JWT)      |
| File Storage   | Supabase Storage         |
| AI / LLM       | OpenAI vision-capable LLM    |
| Deployment     | Vercel (frontend) + Render (backend) |

## Structure

```
luxuryloop/
├── frontend/     Next.js app (customer storefront, admin back office, auth)
├── backend/      FastAPI app (catalog, consignment, sales, AI screening)
├── supabase/     migrations + seed data (item-centric lifecycle schema)
├── docs/         design docs, BRD reference
└── .github/      CI workflows
```

## Getting started

### 1. Environment variables

Copy the example files and fill in real values (never commit `.env` files):

```
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.example backend/.env
```

Required variables:

- **Supabase:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (backend), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend).
- **AI screening:** `AI_ASSESSMENT_API_KEY` — OpenAI API key used by the authenticity screening service (`backend/app/services/ai_assessment.py`).
- **Backend URL (frontend):** `NEXT_PUBLIC_API_BASE_URL`.

### 2. Database (Supabase)

The full schema is in `supabase/migrations/0001_init.sql`. Apply it to a new project:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Seed demo data (branches, categories, brands, items) with:

```sql
-- in the Supabase SQL editor, run:
supabase/seed/seed.sql
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### 4. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows  |  source venv/bin/activate (macOS/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # http://localhost:8000/docs
```

## Roles

`customer`, `staff`, and `admin`. Customers register through the storefront. Staff/Admin accounts are provisioned in Supabase (`public.users.role`) — set the role in the `users` table and matching `app_metadata.role`.

## Key flows (item-centric lifecycle)

1. **Customer consigns:** submits an Authentication Request (details + photos + invoice/certificate).
2. **AI screening:** backend sends the submission to the vision LLM → confidence score, indicators, explanation.
   - Score `< 40%` → auto-rejected. Score `≥ 40%` → `pending_physical_authentication`.
3. **Authentication:** staff inspects in person, records the physical result.
4. **Acquisition:** item is bought by the shop (`store_owned`) or placed on consignment (`consigned`) with cost, commission, selling price.
5. **Sale:** the item is listed as unique (`available`) → sold online (cart/checkout) or in-store (POS). Marked `sold` everywhere immediately.

## Deployment

- **Frontend → Vercel:** import the repo, root = `frontend`, set the `NEXT_PUBLIC_*` env vars.
- **Backend → Render:** new Web Service, root = `backend`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, set all env vars including `CORS_ORIGINS=https://<your-vercel-domain>`.

## Testing

- Frontend: `npm run type-check`, `npm run lint`, `npm run build`
- Backend: `python -c "import app.main"` (CI also runs this)

## Docs

- `docs/README.md` — project & ERD notes (see BRD for full requirements)