import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortDirection = "asc" | "desc";

export interface DataTableColumn<T> {
  /** Unique key for the column. */
  id: string;
  header: React.ReactNode;
  /** Value used for sorting, searching and filtering. */
  accessor?: (row: T) => string | number | boolean | null | undefined;
  /** Custom cell renderer; falls back to the accessor value. */
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** Show a dropdown filter built from the distinct values of this column. */
  filterable?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
  headerClassName?: string;
  /** Exclude this column from the global search. */
  excludeFromSearch?: boolean;
}

export interface DataTableAction<T> {
  label: React.ReactNode;
  onSelect: (row: T) => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId?: (row: T, index: number) => string;
  actions?: DataTableAction<T>[];
  /** Renders custom row actions instead of the dropdown menu. */
  renderRowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  /** Max height of the scroll area that keeps the header sticky. */
  maxHeight?: string;
  className?: string;
  toolbar?: React.ReactNode;
  stickyHeader?: boolean;
}

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

function toComparable(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? 1 : 0;
  return value as string | number;
}

function toText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  actions,
  renderRowActions,
  onRowClick,
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  isLoading = false,
  emptyState,
  maxHeight = "28rem",
  className,
  toolbar,
  stickyHeader = true,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [sort, setSort] = React.useState<{ id: string; dir: SortDirection } | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const hasActions = Boolean(renderRowActions || (actions && actions.length > 0));
  const filterableColumns = columns.filter((c) => c.filterable && c.accessor);

  const filterOptions = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    filterableColumns.forEach((col) => {
      const values = new Set<string>();
      data.forEach((row) => {
        const v = toText(col.accessor?.(row)).trim();
        if (v) values.add(v);
      });
      map[col.id] = Array.from(values).sort((a, b) => a.localeCompare(b));
    });
    return map;
  }, [data, filterableColumns.map((c) => c.id).join("|")]);

  const processed = React.useMemo(() => {
    let rows = [...data];

    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter((row) =>
        columns.some((col) => {
          if (col.excludeFromSearch || !col.accessor) return false;
          return toText(col.accessor(row)).toLowerCase().includes(term);
        }),
      );
    }

    Object.entries(filters).forEach(([columnId, value]) => {
      if (!value) return;
      const col = columns.find((c) => c.id === columnId);
      if (!col?.accessor) return;
      rows = rows.filter((row) => toText(col.accessor!(row)) === value);
    });

    if (sort) {
      const col = columns.find((c) => c.id === sort.id);
      if (col?.accessor) {
        rows.sort((a, b) => {
          const av = toComparable(col.accessor!(a));
          const bv = toComparable(col.accessor!(b));
          let result: number;
          if (typeof av === "number" && typeof bv === "number") result = av - bv;
          else result = String(av).localeCompare(String(bv), undefined, { numeric: true });
          return sort.dir === "asc" ? result : -result;
        });
      }
    }

    return rows;
  }, [data, columns, search, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  React.useEffect(() => {
    setPage(1);
  }, [search, filters, pageSize, data.length]);

  const pageRows = processed.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable || !col.accessor) return;
    setSort((prev) => {
      if (!prev || prev.id !== col.id) return { id: col.id, dir: "asc" };
      if (prev.dir === "asc") return { id: col.id, dir: "desc" };
      return null;
    });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const colSpan = columns.length + (hasActions ? 1 : 0);

  return (
    <div className={cn("space-y-4", className)}>
      {(searchable || filterableColumns.length > 0 || toolbar) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {searchable && (
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9"
                  aria-label="Search table"
                />
              </div>
            )}
            {filterableColumns.map((col) => (
              <Select
                key={col.id}
                value={filters[col.id] ?? "__all__"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, [col.id]: value === "__all__" ? "" : value }))
                }
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder={typeof col.header === "string" ? col.header : "Filter"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    All {typeof col.header === "string" ? col.header.toLowerCase() : "values"}
                  </SelectItem>
                  {(filterOptions[col.id] ?? []).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            {(activeFilterCount > 0 || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilters({});
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
          {toolbar}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="relative w-full overflow-auto rounded-xl" style={{ maxHeight }}>
          <table className="w-full caption-bottom text-sm">
            <TableHeader
              className={cn(
                "[&_tr]:border-b",
                stickyHeader && "sticky top-0 z-20 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80",
              )}
            >
              <TableRow>
                {columns.map((col) => {
                  const isSorted = sort?.id === col.id;
                  return (
                    <TableHead
                      key={col.id}
                      className={cn(
                        "whitespace-nowrap",
                        alignClass[col.align ?? "left"],
                        col.headerClassName,
                      )}
                      aria-sort={isSorted ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    >
                      {col.sortable && col.accessor ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col)}
                          className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground"
                        >
                          {col.header}
                          {isSorted ? (
                            sort!.dir === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  );
                })}
                {hasActions && <TableHead className="w-16 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {Array.from({ length: colSpan }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-32 text-center text-muted-foreground">
                    {emptyState ?? "No results found."}
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row, index) => (
                  <TableRow
                    key={getRowId ? getRowId(row, index) : index}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.id}
                        className={cn(alignClass[col.align ?? "left"], col.className)}
                      >
                        {col.cell ? col.cell(row) : toText(col.accessor?.(row))}
                      </TableCell>
                    ))}
                    {hasActions && (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {renderRowActions ? (
                          renderRowActions(row)
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open row actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {actions!
                                .filter((action) => !action.hidden?.(row))
                                .map((action, i) => (
                                  <DropdownMenuItem
                                    key={i}
                                    disabled={action.disabled?.(row)}
                                    onSelect={() => action.onSelect(row)}
                                    className={cn(action.destructive && "text-destructive focus:text-destructive")}
                                  >
                                    {action.icon && <span className="mr-2 inline-flex">{action.icon}</span>}
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {processed.length === 0
            ? "0 results"
            : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, processed.length)} of ${processed.length}`}
        </p>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[110px]" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
