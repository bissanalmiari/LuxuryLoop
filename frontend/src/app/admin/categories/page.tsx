import { ReferenceManager } from "@/components/admin/ReferenceManager";

const fields = [
  { key: "name", label: "Name", required: true },
  { key: "description", label: "Description", type: "textarea" as const },
];

export default function CategoriesAdminPage() {
  return <ReferenceManager title="Categories" subtitle="Organize the catalog by type" resource="categories" singular="category" fields={fields} />;
}