import useSWR, { mutate } from "swr";

export function getAdminBatchesKey(page: number, query: string, showInactive: boolean) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", page.toString());
  if (query) searchParams.set("query", query);
  if (showInactive) searchParams.set("showInactive", "true");
  return `/api/admin/batches?${searchParams.toString()}`;
}

export type AdminBatchListResponse = {
  batches: any[];
  totalPages: number;
  currentPage: number;
};

export function useAdminBatches(page: number, query: string, showInactive: boolean) {
  const key = getAdminBatchesKey(page, query, showInactive);
  
  const { data, error, isLoading } = useSWR<AdminBatchListResponse>(key);

  return {
    data,
    isLoading,
    error,
  };
}

export function invalidateAdminBatches(page: number, query: string, showInactive: boolean) {
  return mutate(getAdminBatchesKey(page, query, showInactive));
}

export type AdminBatchOptionsResponse = {
  coaches: any[];
  students: any[];
};

export function useAdminBatchOptions() {
  const { data, error, isLoading } = useSWR<AdminBatchOptionsResponse>("/api/admin/batches/options");

  return {
    data,
    isLoading,
    error,
  };
}

