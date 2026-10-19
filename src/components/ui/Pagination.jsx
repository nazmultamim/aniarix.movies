'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, lastPage, onPageChange }) {
  const pages = [];

  // Calculate which page numbers to show
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(lastPage, startPage + 4);

  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  return (
    <div className="flex items-center justify-center gap-2 mt-12 mb-8">
      <button
        data-testid="button-prev-page"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center rounded-md bg-card border border-border text-foreground hover:border-orange-500 disabled:opacity-50 disabled:hover:border-border transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-card border border-border text-foreground hover:border-orange-500 transition-colors font-medium text-sm cursor-pointer"
          >
            1
          </button>
          {startPage > 2 && <span className="text-muted-foreground px-1">...</span>}
        </>
      )}
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 flex items-center justify-center rounded-md font-medium text-sm transition-colors cursor-pointer ${
            page === currentPage
              ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white border-transparent'
              : 'bg-card border border-border text-foreground hover:border-orange-500'
          }`}
        >
          {page}
        </button>
      ))}
      {endPage < lastPage && (
        <>
          {endPage < lastPage - 1 && <span className="text-muted-foreground px-1">...</span>}
          <button
            onClick={() => onPageChange(lastPage)}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-card border border-border text-foreground hover:border-orange-500 transition-colors font-medium text-sm cursor-pointer"
          >
            {lastPage}
          </button>
        </>
      )}
      <button
        data-testid="button-next-page"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === lastPage}
        className="w-10 h-10 flex items-center justify-center rounded-md bg-card border border-border text-foreground hover:border-orange-500 disabled:opacity-50 disabled:hover:border-border transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}