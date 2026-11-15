"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "./icon";
import { EmptyState } from "./primitives";
export interface Column<T> {
  key: string;
  title: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
  align?: "right";
}
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  pageSize = 8,
  label = "records",
  toolbar,
}: {
  rows: T[];
  columns: Column<T>[];
  pageSize?: number;
  label?: string;
  toolbar?: ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const [sort, setSort] = useState({ key: "", direction: 1 });
  const sorted = useMemo(() => {
    const column = columns.find((column) => column.key === sort.key);
    if (!column?.sort) return rows;
    const accessor = column.sort;
    return [...rows].sort((a, b) => {
      const left = accessor(a);
      const right = accessor(b);
      return (
        (typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right))) * sort.direction
      );
    });
  }, [rows, columns, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * size;
  return (
    <div className="table-card">
      {toolbar && <div className="table-toolbar">{toolbar}</div>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={column.align === "right" ? "text-right" : ""}
                  aria-sort={
                    sort.key === column.key
                      ? sort.direction === 1
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {column.sort ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSort({
                          key: column.key,
                          direction:
                            sort.key === column.key ? -sort.direction : 1,
                        });
                        setPage(1);
                      }}
                    >
                      {column.title}
                      <span className="sort-mark">
                        {sort.key === column.key
                          ? sort.direction === 1
                            ? "↑"
                            : "↓"
                          : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.title
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(offset, offset + size).map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.align === "right" ? "text-right" : ""}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState />}
      </div>
      <div className="table-footer">
        <span>
          Showing{" "}
          <strong>
            {rows.length ? offset + 1 : 0}–
            {Math.min(offset + size, rows.length)}
          </strong>{" "}
          of <strong>{rows.length}</strong> {label}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Rows:
            <select
              aria-label="Rows per page"
              value={size}
              onChange={(event) => {
                setSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {Array.from(new Set([pageSize, 8, 20, 50]))
                .sort((a, b) => a - b)
                .map((value) => (
                  <option key={value}>{value}</option>
                ))}
            </select>
          </label>
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <Icon name="chevron_left" size={16} />
          </button>
          <span className="page-number">
            {currentPage} / {pages}
          </span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={currentPage >= pages}
            onClick={() => setPage(currentPage + 1)}
          >
            <Icon name="chevron_right" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
