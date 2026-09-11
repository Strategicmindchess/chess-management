import type { Metadata } from "next";
import { AdminBatchesClient } from "./admin-batches-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = { title: "Batches · SMC CRM" };

export default function AdminBatchesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    }>
      <AdminBatchesClient />
    </Suspense>
  );
}

