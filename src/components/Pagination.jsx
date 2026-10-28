import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const getPaginationNumbers = (totalPages, currentPage) => {
  const delta = 2;
  const range = [];
  for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
    range.push(i);
  }
  if (currentPage - delta > 2) range.unshift('...');
  if (currentPage + delta < totalPages - 1) range.push('...');
  range.unshift(1);
  if (totalPages > 1) range.push(totalPages);
  return range;
};

const btnBase = 'px-3 py-1.5 text-sm rounded-lg border border-gray-200 transition-colors select-none';

const Pagination = ({ totalPages, currentPage, setCurrentPage }) => {
  if (totalPages <= 1) return null;
  const pages = getPaginationNumbers(totalPages, currentPage);

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6 flex-wrap">
      <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage((p) => p - 1)}
        className={`${btnBase} flex items-center gap-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <ChevronLeft className="w-4 h-4" /> Trước
      </button>

      {pages.map((num, idx) =>
        num === '...' ? (
          <span key={idx} className="px-2 py-1.5 text-sm text-gray-400 select-none">…</span>
        ) : (
          <button
            key={idx}
            onClick={() => setCurrentPage(num)}
            className={`${btnBase} min-w-[36px] text-center ${
              currentPage === num
                ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            {num}
          </button>
        )
      )}

      <button
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage((p) => p + 1)}
        className={`${btnBase} flex items-center gap-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        Sau <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;
