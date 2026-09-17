"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";

export type FieldType = "text" | "textarea" | "checkbox";

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
}

export interface ReferenceManagerProps {
  title: string;
  subtitle: string;
  resource: string; // "branches" | "categories" | "brands"
  singular: string; // "branch" | "category" | "brand"
  fields: FieldDef[];
}

const inputCls =
  "w-full px-[14px] py-[13px] border border-beige bg-white font-sans text-sm outline-none focus:border-gold rounded-[2px]";

export function ReferenceManager({ title, subtitle, resource, singular, fields }: ReferenceManagerProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const defaultForm = () =>
    Object.fromEntries(fields.map((f) => [f.key, f.type === "checkbox" ? true : ""]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await authedFetch(`/${resource}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    load();
  }, [load]);

  const startAdd = () => {
    setEditing(null);
    setForm(defaultForm());
    setShowForm(true);
    setError(null);
  };

  const startEdit = (row: any) => {
    setEditing(row);
    setForm({ ...defaultForm(), ...row });
    setShowForm(true);
    setError(null);
  };

  const cancel = () => {
    setShowForm(false);
    setEditing(null);
    setError(null);
  };

  const onChange = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload: Record<string, any> = {};
      for (const f of fields) {
        const v = form[f.key];
        payload[f.key] = f.type === "checkbox" ? Boolean(v) : typeof v === "string" ? v.trim() : v;
      }
      if (editing) {
        await authedFetch(`/${resource}/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await authedFetch(`/${resource}`, { method: "POST", body: JSON.stringify(payload) });
      }
      cancel();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (row: any) => {
    if (!confirm(`Delete "${row.name ?? row.id}"?`)) return;
    setError(null);
    try {
      await authedFetch(`/${resource}/${row.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const btnPrimary =
    "inline-flex items-center gap-2 text-[12.5px] font-semibold px-4 py-2 rounded-[2px] bg-gold text-charcoal hover:bg-[#B4924E] cursor-pointer";
  const btnGhost =
    "inline-flex items-center gap-2 text-[12.5px] font-semibold px-4 py-2 rounded-[2px] border border-beige text-charcoal hover:bg-[#F1EEE7] cursor-pointer";

  return (
    <div>
      <div className="mb-[30px]">
        <h1 className="font-serif text-[28px] font-medium">{title}</h1>
        <div className="text-[13.5px] text-grayx mt-1">{subtitle}</div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red bg-red-50 border border-[#f0d4cc] rounded-[2px] px-4 py-2.5">
          {error}
        </p>
      )}

      <div className="bg-white border border-beige mb-6">
        <div className="flex items-center justify-between px-6 py-5 border-b border-beige">
          <h3 className="text-base font-semibold">All {resource}</h3>
          {!showForm && (
            <button onClick={startAdd} className={btnPrimary}>
              + Add {singular.toLowerCase()}
            </button>
          )}
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {fields.map((f) => (
                <th key={f.key} className="text-left text-[11.5px] text-grayx font-semibold px-6 py-3 border-b border-beige">
                  {f.label}
                </th>
              ))}
              <th className="text-left text-[11.5px] text-grayx font-semibold px-6 py-3 border-b border-beige"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={fields.length + 1} className="px-6 py-[15px] text-[13.5px] text-grayx border-b border-[#F0EDE6]">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={fields.length + 1} className="px-6 py-[15px] text-[13.5px] text-grayx border-b border-[#F0EDE6]">
                  No records yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#F0EDE6] last:border-b-0">
                {fields.map((f, i) => (
                  <td key={f.key} className={`px-6 py-[15px] text-[13.5px] ${i === 0 ? "font-semibold" : ""}`}>
                    {f.type === "checkbox" ? (
                      row[f.key] ? (
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full bg-[#E4EBE1] text-[#4C6B4C]">
                          <span className="w-1.5 h-1.5 rounded-full bg-current" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-[11px] py-[5px] rounded-full bg-beige text-grayx">
                          <span className="w-1.5 h-1.5 rounded-full bg-current" /> Inactive
                        </span>
                      )
                    ) : (
                      row[f.key] ?? "—"
                    )}
                  </td>
                ))}
                <td className="px-6 py-[15px]">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(row)}
                      className="w-[30px] h-[30px] border border-beige bg-white flex items-center justify-center cursor-pointer hover:border-gold"
                      title="Edit"
                    >
                      <span className="text-[14px] leading-none">✎</span>
                    </button>
                    <button
                      onClick={() => remove(row)}
                      className="w-[30px] h-[30px] border border-beige bg-white flex items-center justify-center cursor-pointer hover:border-gold"
                      title="Delete"
                    >
                      <span className="text-[14px] leading-none">🗑</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-beige p-6">
          <h3 className="text-base font-semibold mb-5">
            {editing ? `Edit ${singular}` : `New ${singular.toLowerCase()}`}
          </h3>
          <div className="grid grid-cols-2 gap-[18px]">
            {fields.map((f) => (
              <label
                key={f.key}
                className={f.type === "textarea" || f.type === "checkbox" ? "col-span-2 mb-5" : "mb-5"}
              >
                <span className="block text-[12.5px] font-semibold mb-[7px]">
                  {f.label}
                  {f.required && <span className="text-gold"> *</span>}
                </span>
                {f.type === "textarea" ? (
                  <textarea
                    value={form[f.key] ?? ""}
                    required={f.required}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    rows={3}
                    className={inputCls}
                  />
                ) : f.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(form[f.key])}
                    onChange={(e) => onChange(f.key, e.target.checked)}
                    className="w-[15px] h-[15px] accent-gold"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[f.key] ?? ""}
                    required={f.required}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className={inputCls}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="submit" className={btnPrimary}>
              {editing ? "Save changes" : `Add ${singular.toLowerCase()}`}
            </button>
            <button type="button" onClick={cancel} className={btnGhost}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}