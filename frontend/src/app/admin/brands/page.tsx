import { ReferenceManager } from "@/components/admin/ReferenceManager";

const fields = [
  { key: "name", label: "Name", required: true },
  { key: "description", label: "Description", type: "textarea" as const },
];

export default function BrandsAdminPage() {
  return <ReferenceManager title="Brands" subtitle="Manage the brands in the catalog" resource="brands" singular="brand" fields={fields} />;
}