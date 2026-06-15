type FieldErrorProps = {
  errors?: unknown[];
};

/**
 * Renders TanStack Form field errors, handling both string errors
 * (from function validators) and StandardSchemaV1Issue objects
 * (from Zod/Valibot/ArkType standard schema validators).
 */
export function FieldError({ errors }: FieldErrorProps) {
  if (!errors?.length) return null;

  const messages = errors
    .map((e) => {
      if (typeof e === "string") return e;
      if (typeof e === "object" && e !== null && "message" in e) {
        return (e as { message: string }).message;
      }
      return "";
    })
    .filter(Boolean);

  if (messages.length === 0) return null;

  return <p className="text-sm text-destructive">{messages.join(", ")}</p>;
}
