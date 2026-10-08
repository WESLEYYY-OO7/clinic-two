"use client";
import { ReactNode } from "react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
}

export function Table<T>({ columns, rows, getRowKey }: Props<T>) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
        <tr>
          {columns.map((c) => (
            <th key={c.key} className="px-4 py-3">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={getRowKey(r)} className="border-t hover:bg-slate-50">
            {columns.map((c) => (
              <td key={c.key} className="px-4 py-3">
                {c.render
                  ? c.render(r)
                  : String((r as Record<string, unknown>)[c.key] ?? "—")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}