"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";

export function DateFilter({ defaultDate }: { defaultDate: Date }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const value = dateParam || format(defaultDate, "yyyy-MM-dd");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      const params = new URLSearchParams(searchParams);
      params.set("date", newDate);
      router.push(`?${params.toString()}`);
    } else {
      router.push(`?`);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="date-filter" className="text-sm font-medium text-slate-700">
        Select Date:
      </label>
      <input
        type="date"
        id="date-filter"
        value={value}
        onChange={handleChange}
        className="px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900"
      />
    </div>
  );
}
