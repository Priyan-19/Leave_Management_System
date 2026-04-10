import { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface DataTableProps<T> {
  data: T[]
  columns: {
    header: string
    cell: (item: T) => ReactNode
    className?: string
  }[]
  mobileCard: (item: T) => ReactNode
  className?: string
}

export function DataTable<T>({ data, columns, mobileCard, className }: DataTableProps<T>) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/50 text-slate-500">
            <tr>
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  className={cn("px-6 py-4 font-semibold first:rounded-tl-2xl last:rounded-tr-2xl", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="group transition-colors hover:bg-slate-50/50"
              >
                {columns.map((column, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={cn("px-6 py-4", column.className)}
                  >
                    {column.cell(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="flex flex-col gap-4 md:hidden">
        {data.map((item, index) => (
          <div 
            key={index} 
            className="glass-panel p-5 transition-transform active:scale-[0.98]"
          >
            {mobileCard(item)}
          </div>
        ))}
      </div>
    </div>
  )
}
