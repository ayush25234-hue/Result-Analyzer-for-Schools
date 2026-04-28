"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  createColumnHelper
} from "@tanstack/react-table";

import { formatPercentage } from "@/lib/utils";
import type { StudentRecord } from "@/types";

const columnHelper = createColumnHelper<StudentRecord>();

export function StudentsTable({
  data,
  onEdit,
  onDelete
}: {
  data: StudentRecord[];
  onEdit: (student: StudentRecord) => void;
  onDelete: (student: StudentRecord) => void;
}) {
  const columns = [
    columnHelper.accessor("name", { header: "Student" }),
    columnHelper.accessor("rollNumber", { header: "Roll Number" }),
    columnHelper.accessor("stream", {
      header: "Stream",
      cell: (info) => info.getValue() || "General"
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => row.original.result?.status ?? "N/A"
    }),
    columnHelper.display({
      id: "percentage",
      header: "Percentage",
      cell: ({ row }) => formatPercentage(row.original.result?.percentage ?? 0)
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button onClick={() => onEdit(row.original)} className="rounded-xl bg-mist px-3 py-2 text-xs font-semibold">
            Edit
          </button>
          <button onClick={() => onDelete(row.original)} className="rounded-xl bg-berry/10 px-3 py-2 text-xs font-semibold text-berry">
            Delete
          </button>
        </div>
      )
    })
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="pb-4">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
