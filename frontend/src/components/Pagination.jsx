import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  top = false,
}) {
  const from = totalCount === 0 ? 0 : currentPage * pageSize + 1
  const to = Math.min((currentPage + 1) * pageSize, totalCount)

  return (
    <div className={`${top ? 'border-b' : 'border-t'} px-6 py-4 border-gray-200 flex items-center justify-between flex-wrap gap-3`}>
      <div className="text-sm text-gray-700">
        Showing {from} to {to} of {totalCount.toLocaleString()} results
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(0)}
          disabled={currentPage === 0}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          First
        </button>
        <button
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={!hasPreviousPage}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </button>
        <div className="flex items-center space-x-1">
          <span className="text-sm text-gray-500">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage + 1}
            onChange={(e) => {
              const p = parseInt(e.target.value || '1', 10)
              if (!isNaN(p)) onPageChange(Math.min(Math.max(p - 1, 0), totalPages - 1))
            }}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <span className="text-sm text-gray-500">of {totalPages}</span>
        </div>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))}
          disabled={!hasNextPage}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Last
        </button>
      </div>
    </div>
  )
}
