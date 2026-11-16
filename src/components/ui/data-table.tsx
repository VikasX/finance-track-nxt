/*
 * src/components/ui/data-table.tsx
 * Generic table used for different API record types. It supports local sorting/pagination or parent-controlled server pagination; column definitions decide how each cell is rendered.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useMemo, useState, type ReactNode } from "react";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "./icon";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import { EmptyState } from "./primitives";
// Describe a column for any row type T. render returns React content; sort optionally extracts a comparable value, keeping the generic table independent of record fields.
export interface Column<T> {
  key: string;
  title: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
  align?: "right";
}
// T must have a stable id for row keys. columns supplies render/sort callbacks; a pagination prop means the server already chose the rows, otherwise this table slices them locally.
export function DataTable<T extends { id: string | number }>({
  rows,
  columns,
  pageSize = 8,
  label = "records",
  toolbar,
  pagination,
}: {
  rows: T[];
  columns: Column<T>[];
  pageSize?: number;
  label?: string;
  toolbar?: ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onChange: (page: number, size: number) => void;
  };
}) {
  // React state stores the local table page used when no parent-controlled server pagination is supplied. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [localPage, setLocalPage] = useState(1);
  // React state stores the local rows-per-page selection. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [localSize, setLocalSize] = useState(pageSize);
  // Optional chaining plus ?? chooses parent server pagination when supplied; otherwise keep this table local page/size/total state.
  const page = pagination?.page ?? localPage;
  const size = pagination?.pageSize ?? localSize;
  const total = pagination?.total ?? rows.length;
  const setPage = (page: number) =>
    pagination ? pagination.onChange(page, size) : setLocalPage(page);
  // React state stores the selected column and ascending/descending multiplier. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [sort, setSort] = useState({ key: "", direction: 1 });
  // Memoize sorted until its listed dependencies change. This avoids repeating the transformation on unrelated renders; it is derived data, not a separate backend record.
  const sorted = useMemo(() => {
    const column = columns.find((column) => column.key === sort.key);
    if (!column?.sort) return rows;
    const accessor = column.sort;
    // Copy rows before sorting because Array.sort mutates its array. Sorting props directly could silently reorder the caller cached API records.
    return [...rows].sort((a, b) => {
      const left = accessor(a);
      const right = accessor(b);
      return (
        (typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right))) * sort.direction
      );
    });
  // Recompute when rows, column selectors, or sort choice change. useMemo is a performance aid, not a separate source of truth.
  }, [rows, columns, sort]);
  const pages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, pages);
  // Server mode already contains one page: do not slice again. Local mode slices the complete sorted array, then maps the visible rows to JSX.
  const offset = (currentPage - 1) * size;
  return (
    <div className="table-card">
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {toolbar && <div className="table-toolbar">{toolbar}</div>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
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
                  {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                  {column.sort ? (
                    <button
                      type="button"
                      onClick={() => {
                        // A header click chooses the column; repeated clicks reverse direction. Reset the page because sorting changes which row should appear first.
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
                        {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
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
            {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
            {(pagination ? sorted : sorted.slice(offset, offset + size)).map(
              (row) => (
                <tr key={row.id}>
                  {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.align === "right" ? "text-right" : ""}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
        {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
        {rows.length === 0 && <EmptyState />}
      </div>
      <div className="table-footer">
        <span>
          Showing{" "}
          <strong>
            {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
            {rows.length ? offset + 1 : 0}–
            {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
            {rows.length ? Math.min(offset + size, total) : 0}
          </strong>{" "}
          of <strong>{total}</strong> {label}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Rows:
            <select
              aria-label="Rows per page"
              value={size}
              onChange={(event) => {
                if (pagination)
                  pagination.onChange(1, Number(event.target.value));
                else {
                  setLocalSize(Number(event.target.value));
                  setLocalPage(1);
                }
              }}
            >
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
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
