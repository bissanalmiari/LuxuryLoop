import { ReferenceManager } from "@/components/admin/ReferenceManager";

const fields = [
  { key: "name", label: "Name", required: true },
  { key: "address", label: "Address", required: true },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "image_url", label: "Image URL" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "is_active", label: "Active", type: "checkbox" as const },
];

export default function BranchesAdminPage() {
  return <ReferenceManager title="Branches" subtitle="Manage physical store locations" resource="branches" singular="branch" fields={fields} />;
}