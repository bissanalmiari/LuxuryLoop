# Migrations

Item-centric lifecycle schema (instructor-approved v2 model).

| File              | Contents                                                              |
| ----------------- | --------------------------------------------------------------------- |
| `0001_init.sql`   | Enums, tables (users → branches → categories/brands → auth requests → AI/physical → acquisitions → items → inventory → cart → orders → payments → recommender), RLS policies, triggers, auto user-profile trigger |

## Applying

Local:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

After migration, run `seed/seed.sql` for demo branches, categories, brands, and store-owned items.

## Storage buckets (configure in Supabase dashboard)

- `product-images` — public read, staff write (item photos, 360° frames)
- `consignment-photos` — private, owner + staff read
- `consignment-documents` — private, owner + staff read (invoice, certificate)