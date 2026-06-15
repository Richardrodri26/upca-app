import { z } from "zod";

export const signInSchema = z.object({
  email: z.email({ error: "Email inválido" }),
  password: z.string().min(8, { error: "Mínimo 8 caracteres" }),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z.string().min(2, { error: "Mínimo 2 caracteres" }),
    email: z.email({ error: "Email inválido" }),
    password: z.string().min(8, { error: "Mínimo 8 caracteres" }),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
      });
    }
  });

export type SignUpValues = z.infer<typeof signUpSchema>;
