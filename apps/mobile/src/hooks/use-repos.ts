import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse, Repo } from "@/types";

interface ReposResponse {
  ownRepos: Repo[];
  collaboratorRepos: Repo[];
}

export function useRepos() {
  return useQuery({
    queryKey: ["repos"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ReposResponse>>("/api/v1/repos");
      const data = res.data.data;
      return {
        ownRepos: data?.ownRepos ?? [],
        collaboratorRepos: data?.collaboratorRepos ?? [],
        all: [...(data?.ownRepos ?? []), ...(data?.collaboratorRepos ?? [])],
      };
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}
