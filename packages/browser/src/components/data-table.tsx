import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { cn } from "@/lib/utils.ts";

type DataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyMessage?: string;
  getRowClassName?: (row: TData) => string | undefined;
  onRowClick?: (row: TData) => void;
  onSortingChange?: OnChangeFn<SortingState>;
  sorting?: SortingState;
};

export function DataTable<TData>(props: DataTableProps<TData>): React.JSX.Element {
  const table = useReactTable({
    columns: props.columns,
    data: props.data,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    onSortingChange: props.onSortingChange,
    state: {
      sorting: props.sorting ?? [],
    },
  });

  return (
    <div className="overflow-hidden bg-background">
      <Table>
        <TableHeader className="bg-secondary/80">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-border">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-11 px-4 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left transition-colors hover:text-foreground"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      {header.column.getIsSorted() === "asc" ? (
                        <ArrowUpIcon className="size-3.5" aria-hidden="true" />
                      ) : null}
                      {header.column.getIsSorted() === "desc" ? (
                        <ArrowDownIcon className="size-3.5" aria-hidden="true" />
                      ) : null}
                      {header.column.getIsSorted() === false ? (
                        <ArrowUpDownIcon className="size-3.5 opacity-50" aria-hidden="true" />
                      ) : null}
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  "border-border/80 transition-colors hover:bg-secondary/35",
                  props.onRowClick ? "cursor-pointer" : undefined,
                  props.getRowClassName?.(row.original),
                )}
                onClick={() => {
                  props.onRowClick?.(row.original);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-3.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="border-border">
              <TableCell
                colSpan={props.columns.length || 1}
                className="h-28 px-4 text-center text-sm text-muted-foreground"
              >
                {props.emptyMessage ?? "No results."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
