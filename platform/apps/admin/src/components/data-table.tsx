'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, errorMessage } from '@/lib/utils'

export interface DataTableColumn<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  className?: string
  headClassName?: string
}

export interface SortState {
  key: string
  direction: 'asc' | 'desc'
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  sort?: SortState | null
  onSortChange?: (sort: SortState | null) => void
  page?: number
  pageCount?: number
  total?: number
  onPageChange?: (page: number) => void
  onRowClick?: (row: T) => void
  actions?: (row: T) => ReactNode
  className?: string
  skeletonRows?: number
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  error,
  onRetry,
  emptyTitle = 'Ma\'lumot topilmadi',
  emptyDescription = 'Bu yerda hozircha hech narsa yo\'q.',
  sort,
  onSortChange,
  page,
  pageCount,
  total,
  onPageChange,
  onRowClick,
  actions,
  className,
  skeletonRows = 6,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<SortState | null>(null)
  const effectiveSort = sort === undefined ? internalSort : sort

  const rows = useMemo(() => {
    if (!effectiveSort) return data
    const column = columns.find((item) => item.key === effectiveSort.key)
    if (!column?.sortValue) return data
    return [...data].sort((a, b) => {
      const first = column.sortValue!(a)
      const second = column.sortValue!(b)
      const comparison =
        typeof first === 'number' && typeof second === 'number'
          ? first - second
          : String(first).localeCompare(String(second), 'uz')
      return effectiveSort.direction === 'asc' ? comparison : -comparison
    })
  }, [columns, data, effectiveSort])

  function toggleSort(key: string) {
    const next: SortState | null =
      effectiveSort?.key === key
        ? effectiveSort.direction === 'asc'
          ? { key, direction: 'desc' }
          : null
        : { key, direction: 'asc' }
    if (sort === undefined) setInternalSort(next)
    onSortChange?.(next)
  }

  const showPagination = Boolean(page && pageCount && pageCount > 1 && onPageChange)

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-900/70', className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => {
                const sortable = Boolean(column.sortValue || onSortChange)
                const active = effectiveSort?.key === column.key
                return (
                  <TableHead key={column.key} className={column.headClassName}>
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1.5 transition hover:text-white"
                      >
                        {column.header}
                        {active ? (
                          effectiveSort?.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-brand-400" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-brand-400" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                )
              })}
              {actions && <TableHead className="w-1 text-right">Harakatlar</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="h-6 w-6 text-red-300/70" />
                    <p className="text-sm font-semibold text-white">Ma\'lumotlarni yuklab bo\'lmadi</p>
                    <p className="max-w-md text-xs text-[#8ba397]">{errorMessage(error)}</p>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        Qayta urinish
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : loading ? (
              Array.from({ length: skeletonRows }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4" style={{ width: `${55 + ((index * 13) % 40)}%` }} />
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell>
                      <Skeleton className="ml-auto h-7 w-16" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                      <Inbox className="h-6 w-6 text-[#7f998b]" />
                    </div>
                    <p className="text-sm font-semibold text-white">{emptyTitle}</p>
                    <p className="text-xs text-[#8ba397]">{emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="text-right">
                      <div
                        className="flex justify-end gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {actions(row)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(showPagination || total !== undefined) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
          <p className="text-xs text-[#8ba397]">
            {total !== undefined ? `Jami: ${total} ta` : ''}
          </p>
          {showPagination && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={page! <= 1}
                onClick={() => onPageChange!(page! - 1)}
              >
                Oldingi
              </Button>
              <span className="px-2 text-xs font-semibold text-white">
                {page} / {pageCount}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page! >= pageCount!}
                onClick={() => onPageChange!(page! + 1)}
              >
                Keyingi
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
