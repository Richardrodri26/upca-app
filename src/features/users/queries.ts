import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateUserInput, UserRole } from "@/lib/validators/user";
import { createUser, getAllUsers, setUserRole } from "./actions";

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

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
