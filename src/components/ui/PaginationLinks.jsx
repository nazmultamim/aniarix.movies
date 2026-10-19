import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function buildHref(basePath, page) {
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}

export default function PaginationLinks({ currentPage, lastPage, basePath = '/anime' }) {
  const pages = [];

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(lastPage, startPage + 4);

  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i += 1) {
    pages.push(i);
  }

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 mt-12 mb-8" aria-label="Pagination">
      <Link
        href={buildHref(basePath, currentPage - 1)}
        aria-disabled={currentPage === 1}
        className={`w-10 h-10 flex items-center justify-center rounded-md bg-card border border-border text-foreground transition-colors ${
          currentPage === 1
            ? 'pointer-events-none opacity-50'
            : 'hover:border-orange-500'
        }`}
      >
        <ChevronLeft className="w-5 h-5" />
      </Link>

      {startPage > 1 && (
        <>
          <Link
            href={buildHref(basePath, 1)}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-card border border-border text-foreground hover:border-orange-500 transition-colors font-medium text-sm"
          >
            1
          </Link>
          {startPage > 2 && <span className="text-muted-foreground px-1">...</span>}
        </>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={buildHref(basePath, page)}
          className={`w-10 h-10 flex items-center justify-center rounded-md font-medium text-sm transition-colors ${
            page === currentPage
              ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white border-transparent'
              : 'bg-card border border-border text-foreground hover:border-orange-500'
          }`}
        >
          {page}
        </Link>
      ))}

      {endPage < lastPage && (
        <>
          {endPage < lastPage - 1 && <span className="text-muted-foreground px-1">...</span>}
          <Link
            href={buildHref(basePath, lastPage)}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-card border border-border text-foreground hover:border-orange-500 transition-colors font-medium text-sm"
          >
            {lastPage}
          </Link>
        </>
      )}

      <Link
        href={buildHref(basePath, currentPage + 1)}
        aria-disabled={currentPage === lastPage}
        className={`w-10 h-10 flex items-center justify-center rounded-md bg-card border border-border text-foreground transition-colors ${
          currentPage === lastPage
            ? 'pointer-events-none opacity-50'
            : 'hover:border-orange-500'
        }`}
      >
        <ChevronRight className="w-5 h-5" />
      </Link>
    </nav>
  );
}
