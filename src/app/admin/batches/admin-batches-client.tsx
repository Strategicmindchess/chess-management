"use client";

import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CreateBatchButton } from "@/components/admin/create-batch-dialog";
import { BatchList } from "@/components/admin/batch-list";
import { useAdminBatches, useAdminBatchOptions } from "@/hooks/use-admin-batches";
import { Loader2 } from "lucide-react";

export function AdminBatchesClient() {
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const query = searchParams.get("query") || "";
  const showInactive = searchParams.get("showInactive") === "true";

  const { data, isLoading, error } = useAdminBatches(page, query, showInactive);
  const { data: optionsData } = useAdminBatchOptions();

  if (error) {
    return <div className="text-red-500">Failed to load batches.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Batches</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create batches, assign coaches, and enroll students.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isLoading && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
          <CreateBatchButton coaches={optionsData?.coaches || []} />
        </div>
      </div>

      <Card className="overflow-hidden">
        {data ? (
          <BatchList 
            batches={data.batches} 
            coaches={optionsData?.coaches || []} 
            students={optionsData?.students || []} 
            currentPage={data.currentPage}
            totalPages={data.totalPages}
            searchParams={{ query, showInactive: showInactive ? "true" : "false" }}
          />
        ) : (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        )}
      </Card>
    </div>
  );
}

