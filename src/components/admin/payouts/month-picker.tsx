"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format, subMonths, addMonths, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthPicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentMonthParam = searchParams?.get("month");
  
  const currentDate = currentMonthParam 
    ? parseISO(`${currentMonthParam}-01`) 
    : new Date();

  const handlePreviousMonth = () => {
    const prev = subMonths(currentDate, 1);
    router.push(`/admin/payouts?month=${format(prev, "yyyy-MM")}`);
  };

  const handleNextMonth = () => {
    const next = addMonths(currentDate, 1);
    router.push(`/admin/payouts?month=${format(next, "yyyy-MM")}`);
  };

  return (
    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200">
      <Button variant="ghost" size="sm" className="px-2" onClick={handlePreviousMonth}>
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="text-sm font-medium w-32 text-center text-slate-800">
        {format(currentDate, "MMMM yyyy")}
      </div>
      <Button variant="ghost" size="sm" className="px-2" onClick={handleNextMonth}>
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
