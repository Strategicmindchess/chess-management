import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string>;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    return `${basePath}?${params.toString()}`;
  };

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        {currentPage > 1 ? (
          <Link href={buildUrl(currentPage - 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Previous
          </Link>
        ) : (
          <span className={buttonVariants({ variant: "secondary", size: "sm", className: "opacity-50 cursor-not-allowed" })}>
            Previous
          </span>
        )}
        {currentPage < totalPages ? (
          <Link href={buildUrl(currentPage + 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Next
          </Link>
        ) : (
          <span className={buttonVariants({ variant: "secondary", size: "sm", className: "opacity-50 cursor-not-allowed" })}>
            Next
          </span>
        )}
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-700">
            Showing page <span className="font-medium">{currentPage}</span> of{" "}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-xs"
            aria-label="Pagination"
          >
            {currentPage > 1 ? (
              <Link href={buildUrl(currentPage - 1)} aria-label="Previous" className={buttonVariants({ variant: "secondary", size: "sm", className: "rounded-r-none border-r-0" })}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span aria-label="Previous" className={buttonVariants({ variant: "secondary", size: "sm", className: "rounded-r-none border-r-0 opacity-50 cursor-not-allowed" })}>
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}
            {pages.map((page) => (
              <Link
                key={page}
                href={buildUrl(page)}
                aria-current={currentPage === page ? "page" : undefined}
                className={buttonVariants({ variant: currentPage === page ? "primary" : "secondary", size: "sm", className: "rounded-none border-r-0 last:border-r" })}
              >
                {page}
              </Link>
            ))}
            {currentPage < totalPages ? (
              <Link href={buildUrl(currentPage + 1)} aria-label="Next" className={buttonVariants({ variant: "secondary", size: "sm", className: "rounded-l-none" })}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span aria-label="Next" className={buttonVariants({ variant: "secondary", size: "sm", className: "rounded-l-none opacity-50 cursor-not-allowed" })}>
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
