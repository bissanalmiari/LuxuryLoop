import { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-[12.5px] font-semibold mb-2">{label}</label>
      {children}
    </div>
  );
}