import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, setUserRole } from "./actions";
import type { UserRole } from "@/lib/validators/user";

export function useAllUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => getAllUsers(),
    staleTime: 60 * 1000,
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      setUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}