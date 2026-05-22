import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, Report } from "@/types";

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Report[]>>("/api/v1/reports");
      return res.data.data ?? [];
    },
    staleTime: 60 * 1000,
    retry: 2,
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ["reports", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ report: Report; comments: unknown[] }>>(`/api/v1/reports/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}
